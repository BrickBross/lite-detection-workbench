import { Routes, Route, Navigate } from 'react-router-dom'
import Shell from './Shell'
import Objectives from '../pages/Objectives'
import ObjectiveWizard from '../pages/ObjectiveWizard'
import Detections from '../pages/Detections'
import MitreMatrix from '../pages/MitreMatrix'
import ExportPage from '../pages/ExportPage'
import About from '../pages/About'
import History from '../pages/History'

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Objectives />} />
        <Route path="/objectives" element={<Objectives />} />
        <Route path="/detections" element={<Detections />} />
        <Route path="/mitre" element={<MitreMatrix />} />
        <Route path="/wizard" element={<ObjectiveWizard />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/history" element={<History />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
