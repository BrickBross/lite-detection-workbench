import { Routes, Route, Navigate } from 'react-router-dom'
import Shell from './Shell'
import Objectives from '../pages/Objectives'
import ObjectiveWizard from '../pages/ObjectiveWizard'
import DetectionBuilder from '../pages/DetectionBuilder'
import Detections from '../pages/Detections'
import MitreMatrix from '../pages/MitreMatrix'
import ExportPage from '../pages/ExportPage'
import About from '../pages/About'

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Objectives />} />
        <Route path="/objectives" element={<Objectives />} />
        <Route path="/detections" element={<Detections />} />
        <Route path="/mitre" element={<MitreMatrix />} />
        <Route path="/wizard" element={<ObjectiveWizard />} />
        <Route path="/build" element={<DetectionBuilder />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
