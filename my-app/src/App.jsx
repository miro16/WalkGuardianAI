import { useState } from 'react'
import LoadingScreen from './components/LoadingScreen'
import AddressSelector from './components/AddressSelector'
import MapRoute from './components/MapRoute'
import './App.css'

function App() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState(null)

  const handleLoadingComplete = () => {
    setIsLoaded(true)
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
      {isLoaded && !selectedAddress && <AddressSelector onAddressSelect={handleAddressSelect} />}
      {isLoaded && selectedAddress && <MapRoute address={selectedAddress} onBack={handleBackToSelector} />}
    </>
  )
}

export default App
