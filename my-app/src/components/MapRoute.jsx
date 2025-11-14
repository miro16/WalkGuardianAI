import './MapRoute.css'

export default function MapRoute({ address, onBack }) {
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

      <button className="start-route-button">
        🚶 Start Walk
      </button>
    </div>
  )
}
