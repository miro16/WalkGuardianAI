# app/main.py

from fastapi import FastAPI, HTTPException
from datetime import datetime, timezone
import uuid

from . import state
from .schemas import (
    Location,
    Contact,
    StartSessionRequest,
    LocationUpdateRequest,
    AudioTextRequest,
    StopSessionRequest,
    Notification,
    SessionStatusResponse,
    NotificationsResponse,
    UserInfo
)

from .analysis import analyze_text
from .notifications import add_notification

from .llama_client import LlamaBackend
from .response_parser import SafetyAnalysisResult

# ---------------------------------------------------------
# WalkGuardianAI - backend MVP (in-memory, keyword-based)
# ---------------------------------------------------------

app = FastAPI(title="WalkGuardianAI Backend V0")
# Load safety analysis prompt
with open("prompts/safety_analysis_prompt.txt", "r") as f:
    prompt = f.read()
# Initialize Llama Stack client
safety_analysis_client = LlamaBackend(
    base_url="http://llama-stack-service.default.svc.cluster.local:8080",
    prompt=prompt
)


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/health")
def health_check():
    """
    Simple health check endpoint to verify that WalkGuardianAI backend is running.
    """
    return {"status": "ok"}


# ---------------------------------------------------------
# Session endpoints
# ---------------------------------------------------------

@app.post("/api/session/start")
async def start_session(body: StartSessionRequest):
    """
    Start a new safety session for WalkGuardianAI.
    For MVP we keep only one active session in memory.
    If there was an existing session, it will be replaced.
    """
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    state.current_session = {
        "id": session_id,
        "is_active": True,
        "created_at": now,
        "updated_at": now,

        # NEW: user info for this session
        "user": {
            "first_name": body.first_name,
            "last_name": body.last_name,
            "age": body.age,
            "diseases": body.diseases,
            "allergies": body.allergies,
            "medications": body.medications,
        },

        "start_location": {
            "lat": body.start_location.lat,
            "lng": body.start_location.lng,
        },
        "current_location": {
            "lat": body.start_location.lat,
            "lng": body.start_location.lng,
        },
        "destination": body.destination,
        "contact": {
            "type": body.contact.type,
            "value": body.contact.value,
        },
        "audio_enabled": body.audio_enabled,
        "risk": "SAFE",
        "notifications": [],
    }

    # Simulate notification to the trusted contact
    user_label = f"{body.first_name} {body.last_name}"
    age_label = f", age {body.age}" if body.age is not None else ""

    await add_notification(
        "SESSION_STARTED",
        f"{user_label}{age_label} started a walk towards '{body.destination}'.",
    )

    return {
        "session_id": session_id,
        "status": "ACTIVE",
        "risk": "SAFE",
    }


@app.post("/api/session/location")
def update_location(body: LocationUpdateRequest):
    """
    Update current location of the active session.
    Called every ~5 seconds from the frontend.
    """
    if state.current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if state.current_session["id"] != body.session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    state.current_session["current_location"] = {
        "lat": body.lat,
        "lng": body.lng,
    }
    state.current_session["updated_at"] = (
        body.timestamp or datetime.now(timezone.utc).isoformat()
    )

    # For now we do not do motion-based risk analysis in MVP.
    # Later we can add sudden stop / sudden speedup detection here.

    return {
        "status": "ACTIVE" if state.current_session["is_active"] else "FINISHED",
        "risk": state.current_session["risk"],
    }


@app.post("/api/session/audio-text")
async def audio_text(body: AudioTextRequest):
    """
    Receive a piece of transcribed audio for the current session.
    Analyze it with a simple keyword-based analyzer.
    If danger is detected, mark the session as DANGER and add a notification.
    """
    if state.current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if state.current_session["id"] != body.session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    if not state.current_session["audio_enabled"]:
        return {
            "risk": state.current_session["risk"],
            "reason": "Audio analysis is disabled for this session",
        }

    safety_analysis_response = safety_analysis_client.analyze_transcript(body.text)
    #result = analyze_text(body.text)

    # Map danger_level to simple risk labels (example: >=7 is DANGER)
    if safety_analysis_response.danger_level >= 7:
        state.current_session["risk"] = "DANGER"
        await add_notification(
            "DANGER_AUDIO",
            f"Potential danger detected in conversation: {safety_analysis_response.summary}",
        )
    else:
        # Only downgrade to SAFE if session was SAFE before
        if state.current_session.get("risk", "SAFE") == "SAFE":
            state.current_session["risk"] = "SAFE"

    return {
        "risk": state.current_session["risk"],
        "reason": safety_analysis_response.summary,
    }


@app.get("/api/session/status", response_model=SessionStatusResponse)
def get_status(session_id: str):
    """
    Get current status of the safety session.
    Frontend can poll this to display current risk, user info and locations.
    """
    if state.current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if state.current_session["id"] != session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    user_data = state.current_session.get("user", {})

    return SessionStatusResponse(
        session_id=state.current_session["id"],
        is_active=state.current_session["is_active"],
        risk=state.current_session["risk"],
        user=UserInfo(
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
            age=user_data.get("age"),
            diseases=user_data.get("diseases"),
            allergies=user_data.get("allergies"),
            medications=user_data.get("medications"),
        ),
        start_location=Location(
            lat=state.current_session["start_location"]["lat"],
            lng=state.current_session["start_location"]["lng"],
        ),
        current_location=Location(
            lat=state.current_session["current_location"]["lat"],
            lng=state.current_session["current_location"]["lng"],
        )
        if state.current_session.get("current_location")
        else None,
        destination=state.current_session["destination"],
        audio_enabled=state.current_session["audio_enabled"],
    )


@app.get("/api/session/notifications", response_model=NotificationsResponse)
def get_notifications(session_id: str):
    """
    Return all notifications generated for the current session.
    This simulates what would be sent to the trusted contact.
    """
    if state.current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if state.current_session["id"] != session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    notifications = [
        Notification(
            type=n["type"],
            message=n["message"],
            timestamp=n["timestamp"],
        )
        for n in state.current_session.get("notifications", [])
    ]

    return NotificationsResponse(notifications=notifications)


@app.post("/api/session/stop")
async def stop_session(body: StopSessionRequest):
    """
    Stop the current safety session.
    Marks the session as not active and adds a notification.
    """
    if state.current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if state.current_session["id"] != body.session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    state.current_session["is_active"] = False
    state.current_session["updated_at"] = datetime.now(timezone.utc).isoformat()

    await add_notification(
        "SESSION_STOPPED",
         f"{user_label}{age_label} stopped a walk towards '{body.destination}'.",
    )

    return {
        "session_id": state.current_session["id"],
        "status": "FINISHED",
        "risk": state.current_session["risk"],
    }