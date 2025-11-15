from collections import deque
from datetime import datetime
from threading import Lock

# Thread-safe rolling transcript buffer (max 6 entries)
class TranscriptStore:
    def __init__(self, max_entries: int = 6):
        self.buffer = deque(maxlen=max_entries)
        self.lock = Lock()

    def add_entry(self, text: str):
        with self.lock:
            self.buffer.append({
                "timestamp": datetime.utcnow().isoformat(),
                "text": text
            })

    def get_entries(self):
        with self.lock:
            return "\n".join(self.entries)

    def clear(self):
        with self.lock:
            self.buffer.clear()
