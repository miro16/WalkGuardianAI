from llama_stack_client import LlamaStackClient

class LlamaBackend:
    def __init__(self, base_url: str, model: str):
        self.client = LlamaStackClient(base_url=base_url)
        self.model = model

    def analyze_transcript(self, transcript: str, prompt: str) -> str:
        """
        Sends the transcript + prompt to the Llama Stack model.
        Returns the raw model response.
        """
        response = self.client.inference.chat.create(
            model=self.model,
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": transcript}],
        )

        return response.completion_message.content
