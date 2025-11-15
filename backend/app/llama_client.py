from llama_stack_client import LlamaStackClient
from .response_parser import parse_model_response
from .schemas import SafetyAnalysisResult

class   LlamaBackend:
    def __init__(self, base_url: str, prompt: str):
        self.client = LlamaStackClient(base_url=base_url)
        self.prompt = prompt

    def analyze_transcript(self, transcript: str) -> SafetyAnalysisResult:
        """
        Sends the transcript + prompt to the Llama Stack model.
        Returns the raw model response.
        """
        response = self.client.inference.chat_completion(
            model_id="granite-40-h-1b",
            messages=[{"role": "system", "content": self.prompt}, {"role": "user", "content": transcript}],
        )

        return parse_model_response(response.completion_message.content)

    def query_model(self, message: str) -> str:
        """
        Sends the transcript + prompt to the Llama Stack model.
        Returns the raw model response.
        """
        response = self.client.inference.chat_completion(
            model_id="granite-40-h-1b",
            messages=[{"role": "system", "content": self.prompt}, {"role": "user", "content": message}],
        )

        return response.completion_message.content