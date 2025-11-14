import { useState, useEffect, useRef } from 'react'
import './MapRoute.css'

export default function MapRoute({ address, onBack }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup: abort recognition on unmount
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const handleStartListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      alert('Speech Recognition not supported in your browser')
      return
    }

    // Create a new instance for each recording session
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' '
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      setTranscript('')
      recognition.start()
    } catch (error) {
      console.error('Error starting recognition:', error)
    }
  }

  const handleStopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Error stopping recognition:', error)
      }
    }
    setIsListening(false)
  }

  const handleClearTranscript = () => {
    setTranscript('')
  }
  return (
    <div className="map-container">
      <div className="map-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>My Route</h1>
        <div className="address-info">
          <p className="address-text">📍 {address}</p>
        </div>
      </div>

      <div className="map-wrapper">
        <div className="map-placeholder">
          <p>🗺️ Map will be displayed here</p>
          <small>Address: {address}</small>
        </div>
      </div>

      <div className="route-info">
        <h2>Route Information</h2>
        <div className="route-stats">
          <div className="stat">
            <span className="stat-label">Distance:</span>
            <span className="stat-value">-</span>
          </div>
          <div className="stat">
            <span className="stat-label">Time:</span>
            <span className="stat-value">-</span>
          </div>
          <div className="stat">
            <span className="stat-label">Safety:</span>
            <span className="stat-value">-</span>
          </div>
        </div>
      </div>

      <div className="speech-section">
        <h3>Voice Commands</h3>
        <div className="transcript-box">
          {transcript ? (
            <p className="transcript-text">{transcript}</p>
          ) : (
            <p className="transcript-placeholder">Click Listen to record your voice...</p>
          )}
        </div>
        
        <div className="button-group">
          <button 
            className={`listen-button ${isListening ? 'listening' : ''}`}
            onClick={isListening ? handleStopListening : handleStartListening}
          >
            {isListening ? '⏹️ Stop Recording' : '🎤 Listen'}
          </button>
          
          {transcript && (
            <button 
              className="clear-button"
              onClick={handleClearTranscript}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <button className="start-route-button">
        🚶 Start Walk
      </button>

      
    </div>
  )
}
