import { Routes, Route, Navigate } from 'react-router-dom'
import Shell from './Shell'
import Objectives from '../pages/Objectives'
import ObjectiveWizard from '../pages/ObjectiveWizard'
import Detections from '../pages/Detections'
import MitreMatrix from '../pages/MitreMatrix'
import About from '../pages/About'
import History from '../pages/History'
import Settings from '../pages/Settings'

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Objectives />} />
        <Route path="/objectives" element={<Objectives />} />
        <Route path="/detections" element={<Detections />} />
        <Route path="/mitre" element={<MitreMatrix />} />
        <Route path="/wizard" element={<ObjectiveWizard />} />
        <Route path="/history" element={<History />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
