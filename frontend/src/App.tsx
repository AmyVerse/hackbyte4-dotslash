import { Routes, Route, Navigate } from 'react-router-dom'
import GodModeMap from './components/GodModeMap'

function App() {
  return (
    <Routes>
      {/* Hidden demo route — not for production */}
      <Route path="/demo-show-not-production" element={<GodModeMap />} />
      {/* Redirect root to the demo for now */}
      <Route path="/" element={<Navigate to="/demo-show-not-production" replace />} />
    </Routes>
  )
}

export default App
