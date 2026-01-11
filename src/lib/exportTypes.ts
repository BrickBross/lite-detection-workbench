import type { Detection, Objective, ProjectMeta, Signal } from './schemas'

export type ExportPayload = {
  meta: ProjectMeta
  objectives: Objective[]
  signals: Signal[]
  detections: Detection[]
}

export type ExportOptions = {
  includeBundles?: boolean
  includeManifests?: boolean
  includePrompts?: boolean
}

