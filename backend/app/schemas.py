from pydantic import BaseModel
from typing import Optional, Literal, List


class Location(BaseModel):
    lat: float
    lng: float


class Contact(BaseModel):
    type: Literal["phone", "email", "discord"]
    value: str

class StartSessionRequest(BaseModel):
    first_name: str
    last_name: str
    age: Optional[int] = None
    diseases: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    start_location: Location
    destination: str
    contact: Contact
    audio_enabled: bool

class UserInfo(BaseModel):
    first_name: str
    last_name: str
    age: Optional[int] = None
    diseases: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None

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
    user: UserInfo
    start_location: Location
    current_location: Optional[Location] = None
    destination: str
    audio_enabled: bool

class NotificationsResponse(BaseModel):
    notifications: List[Notification]
