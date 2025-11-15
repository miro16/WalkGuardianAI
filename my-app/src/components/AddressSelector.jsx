import { useState } from 'react'
import './AddressSelector.css'

export default function AddressSelector({ onAddressSelect, onBack }) {
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [channel, setChannel] = useState('Discord')
  const [guardian, setGuardian] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isComplete = city.trim() && street.trim() && streetNumber.trim()

  // Compose a human-friendly preview in format: City, Street, Number
  const previewAddress = (() => {
    const parts = []
    if (city.trim()) parts.push(city.trim())
    if (street.trim()) parts.push(street.trim())
    if (streetNumber.trim()) parts.push(streetNumber.trim())
    return parts.join(', ')
  })()

  const handleStart = async () => {
    if (!isComplete) return
    setLoading(true)
    setError('')

    const destinationAddress = `${city}, ${street}, ${streetNumber}`

    const getCurrentPosition = () =>
      new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject(new Error('Geolocation not supported by browser'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        )
      })

    let lat = 0
    let lng = 0
    try {
      const pos = await getCurrentPosition()
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch (e) {
      setError(
        e?.message || 'Cannot get location. Allow location access and try again.'
      )
      // We still continue with 0,0 as a fallback for MVP
    }

    const storedUser = (() => {
      try {
        const raw = localStorage.getItem('wg_user_data')
        return raw ? JSON.parse(raw) : {}
      } catch {
        return {}
      }
    })()

    const contactType = channel === 'Discord' ? 'discord' : 'email'

    const payload = {
      start_location: { lat, lng },
      destination: destinationAddress,
      contact: { type: contactType, value: guardian || '' },
      audio_enabled: true,
      // Flattened user data to match backend (snake_case)
      first_name: storedUser?.firstName ?? '',
      last_name: storedUser?.lastName ?? ''
    }
    if (storedUser?.age && !Number.isNaN(Number(storedUser.age))) {
      payload.age = Number(storedUser.age)
    }
    if (storedUser?.diseases?.trim()) {
      payload.diseases = storedUser.diseases.trim()
    }
    if (storedUser?.allergies?.trim()) {
      payload.allergies = storedUser.allergies.trim()
    }
    if (storedUser?.medications?.trim()) {
      payload.medications = storedUser.medications.trim()
    }

    try {
      const resp = await fetch('/api/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!resp.ok) {
        const msg = await resp.text()
        throw new Error(msg || 'Failed to start session')
      }
      const data = await resp.json()
      try {
        localStorage.setItem('wg_session', JSON.stringify(data))
      } catch {
        /* ignore storage failure */
      }
      // Keep original callback contract
      onAddressSelect(destinationAddress)
    } catch (e) {
      setError(e?.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  


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
        {error && (
          <div className="address-preview" style={{ color: '#b00020' }}>
            <p className="address-preview-text">{error}</p>
          </div>
        )}
        {/* Current location UI removed as requested */}
        
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
          disabled={!isComplete || loading}
          className="start-button"
        >
          {loading ? 'Starting…' : 'Start'}
        </button>
      </div>
    </div>
  )
}

