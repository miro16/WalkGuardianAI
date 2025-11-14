# app/main.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal, List
from datetime import datetime, timezone
import uuid
import httpx

# ---------------------------------------------------------
# WalkGuardianAI - backend MVP (in-memory, keyword-based)
# ---------------------------------------------------------

app = FastAPI(title="WalkGuardianAI Backend V0")

# In-memory session state (only one active session for MVP)
current_session: Optional[dict] = None


# ---------------------------------------------------------
# Pydantic models (request/response schemas)
# ---------------------------------------------------------

class Location(BaseModel):
    lat: float
    lng: float


class Contact(BaseModel):
    type: Literal["phone", "email", "discord"]
    value: str


class StartSessionRequest(BaseModel):
    start_location: Location
    destination: str
    contact: Contact
    audio_enabled: bool


class LocationUpdateRequest(BaseModel):
    session_id: str
    lat: float
    lng: float
    timestamp: Optional[str] = None


class AudioTextRequest(BaseModel):
    session_id: str
    text: str


class StopSessionRequest(BaseModel):
    session_id: str


class Notification(BaseModel):
    type: str
    message: str
    timestamp: str


class SessionStatusResponse(BaseModel):
    session_id: str
    is_active: bool
    risk: str
    start_location: Location
    current_location: Optional[Location] = None
    destination: str
    audio_enabled: bool


class NotificationsResponse(BaseModel):
    notifications: List[Notification]


# ---------------------------------------------------------
# Simple keyword-based audio analyzer (placeholder for LLM)
# ---------------------------------------------------------

DANGER_KEYWORDS = [
    "give me your phone",
    "give me the phone",
    "i will kill you",
    "shut up",
    "don't scream",
    "rape",
    "help me",
    "help",
    "sos",
    "leave me alone",
    "don't touch me",
    "stop following me",
]


def analyze_text(text: str) -> dict:
    """
    Very simple keyword-based risk analyzer.
    Later this will be replaced with a call to an LLM on RHOAI.
    """
    lowered = text.lower()

    for phrase in DANGER_KEYWORDS:
        if phrase in lowered:
            return {
                "risk": "DANGER",
                "reason": f"Dangerous phrase detected: '{phrase}'",
            }

    return {
        "risk": "SAFE",
        "reason": "No dangerous keywords detected",
    }

async def add_notification(notification_type: str, message: str) -> None:
    """
    Append a notification to the current session's notifications list.
    For 'discord' contacts, also send a Discord message via webhook.
    """
    global current_session
    if current_session is None:
        return

    now = datetime.now(timezone.utc).isoformat()

    # 1) Store notification in memory
    current_session["notifications"].append(
        {
            "type": notification_type,
            "message": message,
            "timestamp": now,
        }
    )
    current_session["updated_at"] = now

    # 2) Send to Discord if configured
    contact = current_session.get("contact")
    if contact and contact.get("type") == "discord":
        webhook_url = contact.get("value")
        # Build a nice human-readable message in English
        content = f"[WalkGuardianAI] {notification_type} at {now}\n{message}"
        await send_discord_message(webhook_url, content)


async def send_discord_message(webhook_url: str, content: str) -> None:
    """
    Send a simple message to a Discord channel using a webhook URL.
    Non-blocking and best-effort: errors are printed but do not crash the app.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {"content": content}
            response = await client.post(webhook_url, json=payload)
            if response.status_code >= 400:
                print(f"[WalkGuardianAI] Discord webhook failed: {response.status_code} {response.text}")
    except Exception as e:
        print(f"[WalkGuardianAI] Error calling Discord webhook: {e}")


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
def start_session(body: StartSessionRequest):
    """
    Start a new safety session for WalkGuardianAI.
    For MVP we keep only one active session in memory.
    If there was an existing session, it will be replaced.
    """
    global current_session

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    current_session = {
        "id": session_id,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
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
    await add_notification(
        "SESSION_STARTED",
        f"User started a walk towards '{body.destination}'.",
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
    global current_session

    if current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if current_session["id"] != body.session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    current_session["current_location"] = {
        "lat": body.lat,
        "lng": body.lng,
    }
    current_session["updated_at"] = (
        body.timestamp or datetime.now(timezone.utc).isoformat()
    )

    # For now we do not do motion-based risk analysis in MVP.
    # Later we can add sudden stop / sudden speedup detection here.

    return {
        "status": "ACTIVE" if current_session["is_active"] else "FINISHED",
        "risk": current_session["risk"],
    }


@app.post("/api/session/audio-text")
async def audio_text(body: AudioTextRequest):
    """
    Receive a piece of transcribed audio for the current session.
    Analyze it with a simple keyword-based analyzer.
    If danger is detected, mark the session as DANGER and add a notification.
    """
    global current_session

    if current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if current_session["id"] != body.session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    if not current_session["audio_enabled"]:
        return {
            "risk": current_session["risk"],
            "reason": "Audio analysis is disabled for this session",
        }

    result = analyze_text(body.text)

    # If the analyzer says DANGER, update session risk and notify contact
    if result["risk"] == "DANGER":
        current_session["risk"] = "DANGER"
        await add_notification(
            "DANGER_AUDIO",
            f"Potential danger detected in conversation: {result['reason']}",
        )
    else:
        # Only downgrade to SAFE if session was SAFE before
        # (once DANGER, we keep it as DANGER for MVP)
        if current_session["risk"] == "SAFE":
            current_session["risk"] = "SAFE"

    return {
        "risk": current_session["risk"],
        "reason": result["reason"],
    }


@app.get("/api/session/status", response_model=SessionStatusResponse)
def get_status(session_id: str):
    """
    Get current status of the safety session.
    Frontend can poll this to display current risk and locations.
    """
    if current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if current_session["id"] != session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionStatusResponse(
        session_id=current_session["id"],
        is_active=current_session["is_active"],
        risk=current_session["risk"],
        start_location=Location(
            lat=current_session["start_location"]["lat"],
            lng=current_session["start_location"]["lng"],
        ),
        current_location=Location(
            lat=current_session["current_location"]["lat"],
            lng=current_session["current_location"]["lng"],
        )
        if current_session.get("current_location")
        else None,
        destination=current_session["destination"],
        audio_enabled=current_session["audio_enabled"],
    )


@app.get("/api/session/notifications", response_model=NotificationsResponse)
def get_notifications(session_id: str):
    """
    Return all notifications generated for the current session.
    This simulates what would be sent to the trusted contact.
    """
    if current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if current_session["id"] != session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    notifications = [
        Notification(
            type=n["type"],
            message=n["message"],
            timestamp=n["timestamp"],
        )
        for n in current_session.get("notifications", [])
    ]

    return NotificationsResponse(notifications=notifications)


@app.post("/api/session/stop")
def stop_session(body: StopSessionRequest):
    """
    Stop the current safety session.
    Marks the session as not active and adds a notification.
    """
    global current_session

    if current_session is None:
        raise HTTPException(status_code=404, detail="No active session")

    if current_session["id"] != body.session_id:
        raise HTTPException(status_code=404, detail="Session not found")

    current_session["is_active"] = False
    current_session["updated_at"] = datetime.now(timezone.utc).isoformat()

    await add_notification(
        "SESSION_STOPPED",
        "User stopped the walk.",
    )

    return {
        "session_id": current_session["id"],
        "status": "FINISHED",
        "risk": current_session["risk"],
    }