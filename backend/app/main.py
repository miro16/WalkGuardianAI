# app/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

# Tworzymy główny obiekt aplikacji FastAPI
app = FastAPI(title="WalkGuardianAI Backend V0")


# ---- MODELE WEJŚCIA (REQUEST BODY) ----

class StartSessionRequest(BaseModel):
    destination: Optional[str] = None


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


# ---- PROSTE ENDPOINTY ----

@app.get("/health")
def health_check():
    """
    Prosty endpoint do sprawdzenia czy backend żyje.
    Wejście: nic
    Wyjście: status OK
    """
    return {"status": "ok"}


@app.post("/api/session/start")
def start_session(body: StartSessionRequest):
    """
    Tutaj będziemy tworzyć nową sesję.
    Na razie zwracamy przykładowe dane.
    """
    fake_session_id = "123e4567-e89b-12d3-a456-426614174000"
    return {
        "session_id": fake_session_id,
        "status": "ACTIVE",
        "risk": "SAFE"
    }


@app.post("/api/session/location")
def update_location(body: LocationUpdateRequest):
    """
    Tutaj będziemy aktualizować lokalizację.
    Na razie tylko udajemy, że zapisaliśmy dane.
    """
    return {
        "status": "ACTIVE",
        "risk": "SAFE"
    }


@app.post("/api/session/audio-text")
def audio_text(body: AudioTextRequest):
    """
    Tutaj będziemy analizować tekst z audio.
    Na razie zwracamy na sztywno SAFE.
    """
    return {
        "risk": "SAFE",
        "reason": "Analyzer not implemented yet (stub)"
    }


@app.get("/api/session/status")
def get_status(session_id: str):
    """
    Tutaj będziemy zwracać aktualny status sesji.
    Na razie zwracamy przykładowe, statyczne dane.
    """
    return {
        "session_id": session_id,
        "is_active": True,
        "risk": "SAFE",
        "last_location": {
            "lat": 52.2297,
            "lng": 21.0122,
            "timestamp": "2025-11-14T10:00:05Z"
        },
        "last_text": "Example text"
    }


@app.post("/api/session/stop")
def stop_session(body: StopSessionRequest):
    """
    Tutaj będziemy zatrzymywać sesję.
    Na razie tylko udajemy, że ją zatrzymaliśmy.
    """
    return {
        "session_id": body.session_id,
        "status": "FINISHED"
    }
