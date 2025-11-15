import { useState } from 'react'
import LoadingScreen from './components/LoadingScreen'
import UserData from './components/UserData'
import AddressSelector from './components/AddressSelector'
import MapRoute from './components/MapRoute'
import './App.css'

function App() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [userData, setUserData] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)

  const handleLoadingComplete = () => {
    setIsLoaded(true)
  }

  const handleUserDataSubmit = (data) => {
    setUserData(data)
  }

  const handleSkipUserData = () => {
    setUserData({})
  }

  const handleBackToUserData = () => {
    setUserData(null)
  }

  const handleAddressSelect = (address) => {
    setSelectedAddress(address)
  }

  const handleBackToSelector = () => {
    setSelectedAddress(null)
  }

  return (
    <>
      {!isLoaded && <LoadingScreen onLoadingComplete={handleLoadingComplete} />}
      {isLoaded && userData === null && <UserData onUserDataSubmit={handleUserDataSubmit} onSkip={handleSkipUserData} />}
      {isLoaded && userData !== null && !selectedAddress && <AddressSelector onAddressSelect={handleAddressSelect} onBack={handleBackToUserData} />}
      {isLoaded && userData !== null && selectedAddress && <MapRoute address={selectedAddress} onBack={handleBackToSelector} />}
    </>
  )
}

export default App
