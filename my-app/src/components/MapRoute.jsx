import { useState, useEffect, useRef } from 'react'
import './MapRoute.css'

export default function MapRoute({ address, onBack }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [currentAddress, setCurrentAddress] = useState(null)
  const [resolvingAddress, setResolvingAddress] = useState(false)

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

  useEffect(() => {
    if (!currentLocation) return

    let mounted = true
    const { lat, lng } = currentLocation

    const doReverseGeocode = async () => {
      setResolvingAddress(true)
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
        const resp = await fetch(url, { headers: { Accept: 'application/json' } })
        if (!mounted) return
        if (!resp.ok) throw new Error('Reverse geocoding failed')
        const data = await resp.json()
        if (data && data.display_name) {
          setCurrentAddress(data.display_name)
        } else {
          setCurrentAddress(null)
        }
      } catch (err) {
        if (!mounted) return
        console.error('Reverse geocode error:', err)
        setLocationError('Address lookup failed')
      } finally {
        if (!mounted) return
        setResolvingAddress(false)
      }
    }

    doReverseGeocode()

    return () => {
      mounted = false
    }
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
  return (
    <div className="map-container">
      <div className="map-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>My Route</h1>
        <div className="current-location">
          {currentAddress ? (
            <p className="location-text">📡 Your location: {currentAddress}</p>
          ) : resolvingAddress ? (
            <p className="location-resolving">Resolving address…</p>
          ) : currentLocation ? (
            <p className="location-text">📡 Your location: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}</p>
          ) : locationError ? (
            <p className="location-error">⚠️ {locationError}</p>
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
        </div>
      </div>
      
    </div>
  )
}
