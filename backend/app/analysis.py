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
