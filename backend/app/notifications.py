from datetime import datetime, timezone
import httpx

from . import state


async def add_notification(notification_type: str, message: str) -> None:
    """
    Append a notification to the current session's notifications list.
    For 'discord' contacts, also send a Discord message via webhook.
    """
    if state.current_session is None:
        return

    now = datetime.now(timezone.utc).isoformat()

    # 1) Store notification in memory
    state.current_session["notifications"].append(
        {
            "type": notification_type,
            "message": message,
            "timestamp": now,
        }
    )
    state.current_session["updated_at"] = now

    # 2) Send to Discord if configured
    contact = state.current_session.get("contact")
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
                print(
                    f"[WalkGuardianAI] Discord webhook failed: "
                    f"{response.status_code} {response.text}"
                )
    except Exception as e:
        print(f"[WalkGuardianAI] Error calling Discord webhook: {e}")
