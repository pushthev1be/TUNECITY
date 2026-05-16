import { GarageScreen } from './components/garage/GarageScreen.jsx'
import { useSaveSync } from './lib/useSaveSync.js'

export default function App() {
  useSaveSync()
  return <GarageScreen />
}
