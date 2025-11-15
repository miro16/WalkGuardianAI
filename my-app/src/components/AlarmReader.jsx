// AlarmReader.jsx
import React, { useCallback, useRef, useState, useEffect } from "react";

const REPEAT_COUNT = 10;
const ALARM_URL = "/alarm.mp3"; // put alarm.mp3 in your public/ folder

function AlarmReader({ textToRead }) {
  const [isRunning, setIsRunning] = useState(false);
  const runningRef = useRef(false);

  // Play alarm sound once and resolve when finished
  const playAlarm = useCallback(() => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(ALARM_URL);

      audio.onended = () => resolve();
      audio.onerror = (err) => {
        console.error("Failed to play alarm:", err);
        reject(err);
      };

      audio
        .play()
        .catch((err) => {
          console.error("Failed to start alarm playback:", err);
          reject(err);
        });
    });
  }, []);

  // Speak text using Web Speech API
  const speakText = useCallback((text) => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        console.error("Web Speech API is not available in this browser.");
        return reject(new Error("SpeechSynthesis not supported"));
      }

      const synth = window.speechSynthesis;

      // Cancel any previous speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        console.error("Error during speech synthesis:", event);
        reject(event.error || new Error("Speech error"));
      };

      synth.speak(utterance);
    });
  }, []);

  const startSequence = useCallback(async () => {
    if (isRunning || runningRef.current) return;

    if (!textToRead) {
      alert("No text provided to read.");
      return;
    }

    setIsRunning(true);
    runningRef.current = true;

    try {
      for (let i = 0; i < REPEAT_COUNT; i++) {
        console.log(`Alarm + speech iteration ${i + 1} / ${REPEAT_COUNT}`);
        await playAlarm();          // 1. play alarm
        await speakText(textToRead); // 2. read the text
      }
    } catch (err) {
      console.error("Error in alarm + speech sequence:", err);
    } finally {
      setIsRunning(false);
      runningRef.current = false;
    }
  }, [isRunning, textToRead, playAlarm, speakText]);

  // Cleanup on unmount: stop any ongoing speech
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: 8 }}>
      <p><strong>Alarm + text reading {REPEAT_COUNT} times</strong></p>
      <p>Text to read: <em>{textToRead}</em></p>
      <button onClick={startSequence} disabled={isRunning}>
        {isRunning ? "Playing alarm and reading..." : "Start alarm sequence"}
      </button>
    </div>
  );
}

export default AlarmReader;
