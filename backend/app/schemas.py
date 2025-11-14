from pydantic import BaseModel
from typing import Optional, Literal, List


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
