import { useState, useEffect, useRef } from 'react'
import './MapRoute.css'

export default function MapRoute({ address, onBack }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const [checkingBackend, setCheckingBackend] = useState(false)


  useEffect(() => {
    return () => {
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

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    
    recognition.lang = 'en-US'
    recognition.continuous = true
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

  const handleCheckBackendHealth = async () => {
    setCheckingBackend(true)
    try {
      const resp = await fetch('/api/health')
      if (resp.ok) {
        const data = await resp.json()
        setBackendStatus(data.status || 'ok')
      } else {
        setBackendStatus('unavailable')
      }
    } catch (err) {
      console.debug('Health check failed', err)
      setBackendStatus('unreachable')
    } finally {
      setCheckingBackend(false)
    }
  }

  return (
    <div className="map-container">
      <div className="map-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>My Route</h1>
        {/* Current location UI removed as requested */}
        <div className="address-info">
          <p className="address-text">📍 {address}</p>
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
            {isListening ? '⏹️ Stop Recording' : '🚶 Start Walk'}
          </button>
          
          {transcript && (
            <button 
              className="clear-button"
              onClick={handleClearTranscript}
            >
              Clear
            </button>
          )}

          <button 
            className="health-button"
            onClick={handleCheckBackendHealth}
            disabled={checkingBackend}
          >
            {checkingBackend ? '🔄 Checking...' : '🏥 Backend'}
          </button>

          {backendStatus && (
            <div className={`health-status ${backendStatus === 'ok' ? 'online' : 'offline'}`}>
              {backendStatus}
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}