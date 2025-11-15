import { useState } from 'react'
import './UserData.css'

export default function UserData({ onUserDataSubmit, onSkip }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    diseases: '',
    allergies: '',
    medications: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const hasAnyData = Object.values(formData).some(v => String(v).trim() !== '')
    if (!hasAnyData) return
    try {
      localStorage.setItem('wg_user_data', JSON.stringify(formData))
    } catch {
      /* ignore storage failure */
    }
    onUserDataSubmit(formData)
  }

  const hasAnyData = Object.values(formData).some(v => String(v).trim() !== '')

  return (
    <div className="user-data-container">
      <div className="user-data-card">
        <h1>User Health Information</h1>
        <p className="subtitle">Help us personalize your experience</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name:</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="e.g. John"
                value={formData.firstName}
                onChange={handleChange}
                className="user-data-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name:</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="e.g. Doe"
                value={formData.lastName}
                onChange={handleChange}
                className="user-data-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="age">Age:</label>
            <input
              type="number"
              id="age"
              name="age"
              placeholder="e.g. 30"
              min="0"
              max="150"
              value={formData.age}
              onChange={handleChange}
              className="user-data-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="diseases">Diseases / Conditions:</label>
            <textarea
              id="diseases"
              name="diseases"
              placeholder="e.g. asthma, arthritis"
              value={formData.diseases}
              onChange={handleChange}
              className="user-data-textarea"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="allergies">Allergies:</label>
            <textarea
              id="allergies"
              name="allergies"
              placeholder="e.g. pollen, dust"
              value={formData.allergies}
              onChange={handleChange}
              className="user-data-textarea"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="medications">Current Medications:</label>
            <textarea
              id="medications"
              name="medications"
              placeholder="e.g. aspirin, insulin"
              value={formData.medications}
              onChange={handleChange}
              className="user-data-textarea"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={!hasAnyData}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('wg_user_data')
                } catch {
                  /* ignore */
                }
                onSkip()
              }}
              className="skip-button"
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
