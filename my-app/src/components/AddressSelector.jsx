import { useState, useEffect } from 'react'
import './AddressSelector.css'

export default function AddressSelector({ onAddressSelect }) {
  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [backendStatus, setBackendStatus] = useState(null)

  const isComplete = city.trim() && street.trim() && streetNumber.trim()

  const handleStart = () => {
    if (isComplete) {
      const fullAddress = `${street} ${streetNumber}, ${city}`
      onAddressSelect(fullAddress)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function checkHealth() {
      try {
        const res = await fetch('walkguardianai-backend/health')
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setBackendStatus(data.status || 'ok')
        } else {
          setBackendStatus('unavailable')
        }
      } catch (err) {
        if (cancelled) return
        console.debug('Health check failed', err)
        setBackendStatus('unreachable')
      }
    }

    checkHealth()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="address-container">
      <div className="address-card">
        <div className={`backend-status ${backendStatus === 'ok' ? 'online' : backendStatus ? 'offline' : 'checking'}`}>
          Backend: {backendStatus ? backendStatus : 'checking...'}
        </div>
        <h1>WalkGuardianAI</h1>
        <p className="subtitle">Safe walks in any weather</p>
        
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
