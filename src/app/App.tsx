import { Routes, Route, Navigate } from 'react-router-dom'
import Shell from './Shell'
import Dashboard from '../pages/Dashboard'
import Objectives from '../pages/Objectives'
import Coverage from '../pages/Coverage'
import Gaps from '../pages/Gaps'
import Packs from '../pages/Packs'
import ObjectiveWizard from '../pages/ObjectiveWizard'
import DetectionBuilder from '../pages/DetectionBuilder'
import Detections from '../pages/Detections'
import Signals from '../pages/Signals'
import MitreMatrix from '../pages/MitreMatrix'
import Assistant from '../pages/Assistant'
import ExportPage from '../pages/ExportPage'
import About from '../pages/About'

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/objectives" element={<Objectives />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/detections" element={<Detections />} />
        <Route path="/mitre" element={<MitreMatrix />} />
        <Route path="/coverage" element={<Coverage />} />
        <Route path="/gaps" element={<Gaps />} />
        <Route path="/packs" element={<Packs />} />
        <Route path="/wizard" element={<ObjectiveWizard />} />
        <Route path="/build" element={<DetectionBuilder />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
