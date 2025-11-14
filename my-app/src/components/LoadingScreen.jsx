import { useState, useEffect } from 'react'
import './LoadingScreen.css'

export default function LoadingScreen({ onLoadingComplete }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
      onLoadingComplete()
    }, 3000) // 3 sekund loadingu

    return () => clearTimeout(timer)
  }, [onLoadingComplete])

  if (!isLoading) {
    return null
  }

  return (
    <div className="loading-screen">
      <div className="loader-container">
        <div className="loader-text">WalkGuardianAI</div>
      </div>
    </div>
  )
}
