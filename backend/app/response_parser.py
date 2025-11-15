import re
from dataclasses import dataclass

@dataclass
class SafetyAnalysisResult:
    danger_level: int
    danger_type: str
    summary: str
    recommended_action: str

def parse_model_response(response_text: str) -> SafetyAnalysisResult:
    """
    Parse the structured response from Llama Stack model.
    Expects keys: danger_level, danger_type, summary, recommended_action
    """
    # regex to extract each field
    danger_level = int(re.search(r"danger_level:\s*(\d+)", response_text, re.IGNORECASE).group(1))
    danger_type = re.search(r"danger_type:\s*(.+)", response_text, re.IGNORECASE).group(1).strip()
    summary = re.search(r"summary:\s*(.+)", response_text, re.IGNORECASE).group(1).strip()
    recommended_action = re.search(r"recommended_action:\s*(.+)", response_text, re.IGNORECASE).group(1).strip()

    return SafetyAnalysisResult(
        danger_level=danger_level,
        danger_type=danger_type,
        summary=summary,
        recommended_action=recommended_action
    )
