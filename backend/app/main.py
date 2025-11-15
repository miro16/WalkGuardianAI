# app/main.py

from fastapi import FastAPI, HTTPException
from datetime import datetime, timezone
import uuid
import os

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
    UserInfo,
    SafetyAnalysisResult,
)

from .analysis import analyze_text
from .notifications import add_notification
from .llama_client import LlamaBackend
from .reverse_geocode import reverse_geocode
from .transcript_store import TranscriptStore

# ---------------------------------------------------------
# WalkGuardianAI - backend MVP (in-memory, multi-session)
# ---------------------------------------------------------

app = FastAPI(title="WalkGuardianAI Backend V0")

# Load safety analysis prompt from external file
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "safety_analysis_prompt.txt")
#PROMPT_PATH2 = os.path.join(os.path.dirname(__file__), "prompts", "medical_alert_prompt.txt")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    risk_analysis_prompt = f.read()

#with open(PROMPT_PATH2, "r", encoding="utf-8") as f:
#    medical_alert_prompt = f.read()

# Initialize Llama Stack client
safety_analysis_client = LlamaBackend(
    base_url="http://lsd-llama-inference-only-service-walkguardianai-llm.apps.cluster-pzdb5.pzdb5.sandbox5281.opentlc.com",
    prompt=risk_analysis_prompt,
)
# medical_alert_client = LlamaBackend(
#     base_url="http://lsd-llama-inference-only-service-walkguardianai-llm.apps.cluster-pzdb5.pzdb5.sandbox5281.opentlc.com",
#     prompt=medical_alert_prompt,
# )


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
    Now supports multiple sessions in memory (keyed by session_id).
    """
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    session = {
        "id": session_id,
        "is_active": True,
        "notification_sent": False,
        "created_at": now,
        "updated_at": now,
        # user info for this session
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
        "transcript": TranscriptStore(max_entries=6),
    }

    # Save session to global sessions dict
    state.sessions[session_id] = session

    # Simulate notification to the trusted contact
    user_label = f"{body.first_name} {body.last_name}"
    age_label = f", age {body.age}" if body.age is not None else ""

    await add_notification(
        session_id,
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
    session = state.sessions.get(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    session["current_location"] = {
        "lat": body.lat,
        "lng": body.lng,
    }
    session["updated_at"] = (
        body.timestamp or datetime.now(timezone.utc).isoformat()
    )

    return {
        "status": "ACTIVE" if session["is_active"] else "FINISHED",
        "risk": session["risk"],
    }


@app.post("/api/session/audio-text")
async def audio_text(body: AudioTextRequest):
    """
    Receive a piece of transcribed audio for the current session.
    Analyze it with LLM; keyword-based analyzer can be used as a fallback if needed.
    """
    session = state.sessions.get(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session["audio_enabled"]:
        return {
            "risk": session["risk"],
            "reason": "Audio analysis is disabled for this session",
        }

    print(f'Body text: {body.text}')
    session["transcript"].add_entry(body.text)
    transcript_text = session["transcript"].get_entries()
    print(f'Transcript text: {transcript_text}')
    safety_analysis_response: SafetyAnalysisResult = safety_analysis_client.analyze_transcript(transcript_text)
    # result = analyze_text(body.text)  # fallback could be used here if LLM fails
    print(f'Safety analysis response: {safety_analysis_response}')
    # Map danger_level to simple risk labels (example: >=7 is DANGER)
    if safety_analysis_response.danger_level >= 6 and not session["notification_sent"]:
        session["risk"] = "DANGER"
        session["notification_sent"] = True
        if safety_analysis_response.danger_type == 'medical_distress' or safety_analysis_response.danger_type == 'mental_health_crisis':
            # query_message = f'''
            # reason: "{safety_analysis_response.summary}"
            # first_name: "{session["user"]["first_name"]}"
            # last_name: "{session["user"]["last_name"]}"
            # age: {session["user"]["age"] if session["user"]["age"] is not None else "null"}
            # diseases: "{session["user"]["diseases"]}"
            # allergies: "{session["user"]["allergies"]}"
            # medications: "{session["user"]["medications"]}"
            # '''.strip()

            #message = medical_alert_client.query_model(query_message)
            message = (
                f"Hello, this is WalkGuardianAI, an automated safety-monitoring assistant. "
                f"I am calling because the user I am monitoring appears to be in a high-risk situation.\n\n"
                f"Reason for emergency: {safety_analysis_response.summary}\n\n"
                f"User information:\n"
                f"- First name: {session['user']['first_name']}\n"
                f"- Last name: {session['user']['last_name']}\n"
                f"- Age: {session['user']['age']}\n"
                f"- Location:\n"
                f"  - Latitude: {session['current_location']['lat']}\n"
                f"  - Longitude: {session['current_location']['lng']}\n\n"
                f"- Known diseases: {session['user']['diseases']}\n"
                f"- Allergies: {session['user']['allergies']}\n"
                f"- Medications: {session['user']['medications']}\n\n"
                f"I detected signs consistent with a potential medical or safety emergency and "
                f"am requesting immediate assistance to the users location."
            )

            await add_notification(
            body.session_id,
            "DANGER_MEDICAL",
            message,
            )
        await add_notification(
            body.session_id,
            "DANGER_AUDIO",
            f"Potential danger detected in conversation: {safety_analysis_response.summary}",
        )
    else:
        # Only downgrade to SAFE if session was SAFE before
        if session.get("risk", "SAFE") == "SAFE":
            session["risk"] = "SAFE"

    return {
        "risk": session["risk"],
        "reason": safety_analysis_response.summary,
        "danger_level": safety_analysis_response.danger_level,
        "danger_type": safety_analysis_response.danger_type,
        "recommended_action": safety_analysis_response.recommended_action
    }


@app.get("/api/session/status", response_model=SessionStatusResponse)
def get_status(session_id: str):
    """
    Get current status of the safety session.
    Frontend can poll this to display current risk, user info and locations.
    """
    session = state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    user_data = session.get("user", {})

    return SessionStatusResponse(
        session_id=session["id"],
        is_active=session["is_active"],
        risk=session["risk"],
        user=UserInfo(
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
            age=user_data.get("age"),
            diseases=user_data.get("diseases"),
            allergies=user_data.get("allergies"),
            medications=user_data.get("medications"),
        ),
        start_location=Location(
            lat=session["start_location"]["lat"],
            lng=session["start_location"]["lng"],
        ),
        current_location=Location(
            lat=session["current_location"]["lat"],
            lng=session["current_location"]["lng"],
        )
        if session.get("current_location")
        else None,
        destination=session["destination"],
        audio_enabled=session["audio_enabled"],
    )


@app.get("/api/session/notifications", response_model=NotificationsResponse)
def get_notifications(session_id: str):
    """
    Return all notifications generated for the given session.
    This simulates what would be sent to the trusted contact.
    """
    session = state.sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    notifications = [
        Notification(
            type=n["type"],
            message=n["message"],
            timestamp=n["timestamp"],
        )
        for n in session.get("notifications", [])
    ]

    return NotificationsResponse(notifications=notifications)


@app.post("/api/session/stop")
async def stop_session(body: StopSessionRequest):
    """
    Stop the current safety session.
    Marks the session as not active and adds a notification.
    """
    session = state.sessions.get(body.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    session["is_active"] = False
    session["updated_at"] = datetime.now(timezone.utc).isoformat()

    user = session.get("user", {})
    first_name = user.get("first_name", "")
    last_name = user.get("last_name", "")
    user_label = f"{first_name} {last_name}".strip() or "User"
    age = user.get("age")
    age_label = f", age {age}" if age is not None else ""

    destination = session.get("destination", "unknown destination")

    await add_notification(
        body.session_id,
        "SESSION_STOPPED",
        f"{user_label}{age_label} stopped a walk towards '{destination}'.",
    )

    return {
        "session_id": session["id"],
        "status": "FINISHED",
        "risk": session["risk"],
    }

@app.get("/api/reverse-geocode")
async def reverse_geocode_endpoint(lat: float, lon: float):
    """
    Proxy endpoint for reverse geocoding coordinates via Nominatim.
    Called by the React frontend instead of hitting Nominatim directly.
    """
    return await reverse_geocode(lat=lat, lon=lon)