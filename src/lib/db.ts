import Dexie, { Table } from 'dexie'
import type { Objective, Signal, Detection, ProjectMeta } from './schemas'
import type { MitreTechniqueRecord } from './mitreData'

export class WorkbenchDB extends Dexie {
  objectives!: Table<Objective, string>
  signals!: Table<Signal, string>
  detections!: Table<Detection, string>
  meta!: Table<ProjectMeta, string>
  mitreTechniques!: Table<MitreTechniqueRecord, string>

  constructor() {
    super('lite-detection-workbench')
    this.version(1).stores({
      objectives: 'id, status, telemetryReadiness, updatedAt',
      signals: 'id, logSource, updatedAt',
      detections: 'id, objectiveId, platform, updatedAt',
      meta: 'name',
    })
    this.version(2).stores({
      objectives: 'id, status, telemetryReadiness, updatedAt',
      signals: 'id, logSource, updatedAt',
      detections: 'id, objectiveId, platform, updatedAt',
      meta: 'name',
      mitreTechniques: 'id, technique, tactic, name',
    })
  }
}

export const db = new WorkbenchDB()
