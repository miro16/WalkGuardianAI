from datetime import datetime, timezone
import httpx

from . import state


async def add_notification(session_id: str, notification_type: str, message: str) -> None:
    """
    Append a notification to the given session's notifications list.
    For 'discord' or 'ntfy' contacts, also send a message via the appropriate channel.
    """
    session = state.sessions.get(session_id)
    if session is None:
        # Session might have been removed or never existed – fail silently
        return

    now = datetime.now(timezone.utc).isoformat()
    human_time = now_utc.strftime("%Y-%m-%d %H:%M:%S %Z")

    # 1) Store notification in memory
    session.setdefault("notifications", []).append(
        {
            "type": notification_type,
            "message": message,
            "timestamp": now,
        }
    )
    session["updated_at"] = now

    # 2) Send to external channel if configured
    contact = session.get("contact")
    if not contact:
        return

    # Human-readable message used for all channels
    content = _build_human_friendly_content(
        notification_type=notification_type,
        message=message,
        human_time=human_time,
    )
    

    # Discord webhook
    if contact.get("type") == "discord":
        webhook_url = contact.get("value")
        await send_discord_message(webhook_url, content)

    # ntfy topic (simple push via https://ntfy.sh/<topic>)
    elif contact.get("type") == "ntfy":
        topic = contact.get("value")
        await send_ntfy_message(topic, content)


def _build_human_friendly_content(
    notification_type: str,
    message: str,
    human_time: str,
) -> str:
    """
    Compose a nice, human-readable notification string for Discord/ntfy.
    Uses markdown (supported by Discord and readable in ntfy).
    """
    session = state.current_session or {}

    # User info
    user = session.get("user", {}) or {}
    first_name = (user.get("first_name") or "").strip()
    last_name = (user.get("last_name") or "").strip()
    user_label = (f"{first_name} {last_name}".strip()) or "User"
    age = user.get("age")
    age_label = f" ({age} y/o)" if age is not None else ""

    # Destination
    destination = session.get("destination") or "Unknown destination"

    # Location info & Google Maps link if we have coordinates
    location_block = ""
    current_location = session.get("current_location") or {}
    lat = current_location.get("lat")
    lng = current_location.get("lng")
    if lat is not None and lng is not None:
        maps_url = f"https://maps.google.com/?q={lat},{lng}"
        location_block = (
            f"\n• **Location:** {lat:.5f}, {lng:.5f}"
            f"\n• **Map:** {maps_url}"
        )

    # Pick an emoji based on event type
    if notification_type.startswith("DANGER"):
        emoji = "🚨"
    elif notification_type == "SESSION_STARTED":
        emoji = "🟢"
    elif notification_type == "SESSION_STOPPED":
        emoji = "✅"
    else:
        emoji = "ℹ️"

    # Final formatted content
    content = (
        f"{emoji} **WalkGuardianAI Alert**\n"
        f"• **Event:** `{notification_type}`\n"
        f"• **Time:** {human_time}\n"
        f"• **User:** {user_label}{age_label}\n"
        f"• **Destination:** {destination}"
        f"{location_block}\n"
        f"• **Details:** {message}"
    )

    return content


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
                print(
                    f"[WalkGuardianAI] Discord webhook failed: "
                    f"{response.status_code} {response.text}"
                )
    except Exception as e:
        print(f"[WalkGuardianAI] Error calling Discord webhook: {e}")


async def send_ntfy_message(topic: str, content: str) -> None:
    """
    Send a simple notification to an ntfy topic.
    The receiver can subscribe to https://ntfy.sh/<topic> in the mobile app.
    """
    url = f"https://ntfy.sh/{topic}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # ntfy accepts plain text in the body as the message
            response = await client.post(url, content=content)
            if response.status_code >= 400:
                print(
                    f"[WalkGuardianAI] ntfy notification failed: "
                    f"{response.status_code} {response.text}"
                )
    except Exception as e:
        print(f"[WalkGuardianAI] Error sending ntfy notification: {e}")
