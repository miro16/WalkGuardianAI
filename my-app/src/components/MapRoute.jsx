import { useState, useEffect, useRef } from 'react'
import './MapRoute.css'

export default function MapRoute({ address, onBack }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const [checkingBackend, setCheckingBackend] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState(null)


  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      // avoid synchronous setState inside effect
      setTimeout(() => setLocationError('Geolocation not supported by browser'), 0)
      return
    }

    let mounted = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted) return
        const { latitude, longitude } = pos.coords
        setCurrentLocation({ lat: latitude, lng: longitude })
        setLocationError(null)
      },
      (err) => {
        if (!mounted) return
        setLocationError(err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    return () => {
      mounted = false
    }
  }, [])

  // Reverse geocode current coordinates to human-readable address
  useEffect(() => {
    let aborted = false
    async function reverseGeocode() {
      if (!currentLocation) return
      try {
        const { lat, lng } = currentLocation
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
        if (!res.ok) throw new Error('Reverse geocoding failed')
        const data = await res.json()
        if (aborted) return
        const a = data.address || {}
        const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.locality || ''
        const street = a.road || a.pedestrian || a.footway || a.path || ''
        const number = a.house_number || ''
        const parts = []
        if (city) parts.push(city)
        if (street) parts.push(street)
        if (number) parts.push(number)
        const composed = parts.join(', ')
        setResolvedAddress(composed || data.display_name || null)
      } catch {
        if (!aborted) setResolvedAddress(null)
      }
    }
    reverseGeocode()
    return () => { aborted = true }
  }, [currentLocation])



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
        <div className="current-location">
          {locationError ? (
            <p className="location-error">⚠️ {locationError}</p>
          ) : resolvedAddress ? (
            <p className="location-text">📡 Your location: {resolvedAddress}</p>
          ) : currentLocation ? (
            <p className="location-placeholder">Resolving your address…</p>
          ) : (
            <p className="location-placeholder">Locating your position…</p>
          )}
        </div>
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