import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useGameStore } from './stores/useGameStore.js'
import carsData from './data/cars.json'

// Dev server only: open the game with ?unlock=all to own every car (with its factory parts).
if (import.meta.env.DEV && new URLSearchParams(location.search).get('unlock') === 'all') {
  const { addCar } = useGameStore.getState()
  carsData.forEach(c => addCar(c.id))
}

createRoot(document.getElementById('root')).render(<App />)
