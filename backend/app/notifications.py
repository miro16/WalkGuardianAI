from datetime import datetime, timezone
import httpx

from . import state


async def add_notification(notification_type: str, message: str) -> None:
    """
    Append a notification to the current session's notifications list.
    For 'discord' or 'ntfy' contacts, also send a message via the appropriate channel.
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

    # 2) Send to external channel if configured
    contact = state.current_session.get("contact")
    if not contact:
        return

    # Human-readable message used for all channels
    content = f"[WalkGuardianAI] {notification_type} at {now}\n{message}"

    # Discord webhook
    if contact.get("type") == "discord":
        webhook_url = contact.get("value")
        await send_discord_message(webhook_url, content)

    # ntfy topic (simple push via https://ntfy.sh/<topic>)
    elif contact.get("type") == "ntfy":
        topic = contact.get("value")
        await send_ntfy_message(topic, content)


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
