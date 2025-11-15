import { useState, useEffect, useRef } from 'react'
import './MapRoute.css'

export default function MapRoute({ address, onBack }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const [checkingBackend, setCheckingBackend] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const intervalRef = useRef(null)
  const transcriptRef = useRef('')
  const [analysis, setAnalysis] = useState(null)


  useEffect(() => {
    // Load session_id from localStorage if available
    try {
      const raw = localStorage.getItem('wg_session')
      if (raw) {
        const data = JSON.parse(raw)
        if (data?.session_id) setSessionId(data.session_id)
      }
    } catch {
      // ignore storage errors
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // Keep a ref with the latest transcript value for the interval callback
  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // While listening, send transcript to backend every 10 seconds
  useEffect(() => {
    if (!isListening) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Define sender that reads the latest transcript value from ref
    const sendTranscript = async () => {
      const text = (transcriptRef.current || '').trim()
      if (!text) return
      if (!sessionId) return
      try {
        const resp = await fetch('/api/api/session/audio-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, text })
        })
        if (resp.ok) {
          const data = await resp.json()
          setAnalysis({
            risk: data?.risk ?? 'UNKNOWN',
            reason: data?.reason ?? ''
          })
        } else {
          // keep previous analysis; optionally could set error state
        }
      } catch (err) {
        console.debug('Failed to send audio-text', err)
      } finally {
        // Clear displayed transcript after each send
        setTranscript('')
      }
    }

    // Start interval
    intervalRef.current = setInterval(sendTranscript, 10000)

    // Cleanup when listening stops or component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isListening, sessionId])



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
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
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

        {analysis && (
          <div className={`analysis-card ${
            (analysis.risk || 'UNKNOWN').toString().toLowerCase()
          }`}>
            <div className="analysis-header">
              <span className={`risk-badge ${
                (analysis.risk || 'UNKNOWN').toString().toLowerCase()
              }`}>
                {analysis.risk || 'UNKNOWN'}
              </span>
              <span className="analysis-title">Model Analysis</span>
            </div>
            {analysis.reason && (
              <p className="analysis-reason">{analysis.reason}</p>
            )}
          </div>
        )}

        {/* Floating bottom-centered Start/Stop button */}
        <button
          className={`listen-button fab ${isListening ? 'listening' : ''}`}
          onClick={isListening ? handleStopListening : handleStartListening}
          aria-label={isListening ? 'Stop Recording' : 'Start Walk'}
        >
          {isListening ? '⏹️ Stop' : '🚶 Start'}
        </button>
      </div>
      
    </div>
  )
}