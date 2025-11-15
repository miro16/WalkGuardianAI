import { useState, useEffect } from 'react'
import './AddressSelector.css'

export default function AddressSelector({ onAddressSelect, onBack }) {
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [channel, setChannel] = useState('Discord')
  const [guardian, setGuardian] = useState('')
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [resolvedAddress, setResolvedAddress] = useState(null)

  const isComplete = city.trim() && street.trim() && streetNumber.trim()

  // Compose a human-friendly preview in format: City, Street, Number
  const previewAddress = (() => {
    const parts = []
    if (city.trim()) parts.push(city.trim())
    if (street.trim()) parts.push(street.trim())
    if (streetNumber.trim()) parts.push(streetNumber.trim())
    return parts.join(', ')
  })()

  const handleStart = () => {
    if (isComplete) {
      onAddressSelect(`${city}, ${street}, ${streetNumber}`)
    }
  }

  

  useEffect(() => {
    if (!navigator.geolocation) {
      // Defer setState to avoid sync state set in render phase
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

  // Reverse geocode coordinates to a human-readable address
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

  return (
    <div className="address-container">
      <div className="address-card">
        {onBack && (
          <button className="address-back-button" onClick={onBack}>
            ← Back
          </button>
        )}
        <h1>WalkGuardianAI</h1>
        <p className="subtitle">Safe walks in any weather</p>
        {previewAddress && (
          <div className="address-preview">
            <p className="address-preview-text">📍 {previewAddress}</p>
            {!isComplete && (
              <p className="address-preview-hint">Complete all fields to start</p>
            )}
          </div>
        )}
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
        
        <div className="form-group">
          <label htmlFor="city">City:</label>
          <input
            type="text"
            id="city"
            placeholder="e.g. Warsaw"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="address-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="street">Street:</label>
          <input
            type="text"
            id="street"
            placeholder="e.g. Main Street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="address-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="streetNumber">Street Number:</label>
          <input
            type="text"
            id="streetNumber"
            placeholder="e.g. 42/5"
            value={streetNumber}
            onChange={(e) => setStreetNumber(e.target.value)}
            className="address-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="channel">Notification Channel:</label>
          <select
            id="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="address-input"
          >
            <option value="Discord">Discord</option>
            <option value="Notify">Notify</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="guardian">Guardian:</label>
          <input
            type="text"
            id="guardian"
            placeholder="e.g. username / contact"
            value={guardian}
            onChange={(e) => setGuardian(e.target.value)}
            className="address-input"
          />
        </div>

        <button
          onClick={handleStart}
          disabled={!isComplete}
          className="start-button"
        >
          Start
        </button>
      </div>
    </div>
  )
}

