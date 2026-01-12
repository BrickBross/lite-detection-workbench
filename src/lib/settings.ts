import { db } from './db'
import { isoNow } from './ids'

export type WorkbenchSettings = {
  id: 'settings'
  statusOptions: string[]
  telemetryReadinessOptions: string[]
  severityOptions: string[]
  urgencyOptions: string[]
  updatedAt: string
}

const DEFAULT_SETTINGS: WorkbenchSettings = {
  id: 'settings',
  statusOptions: ['planned', 'blocked', 'implemented', 'tuned', 'validated'],
  telemetryReadinessOptions: ['unknown', 'available', 'partial', 'missing'],
  severityOptions: ['low', 'medium', 'high', 'critical'],
  urgencyOptions: ['p0', 'p1', 'p2', 'p3'],
  updatedAt: '',
}

const normalizeList = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return [...fallback]
  const cleaned = value
    .map((item) => String(item).trim())
    .filter(Boolean)
  const unique: string[] = []
  for (const item of cleaned) if (!unique.includes(item)) unique.push(item)
  return unique.length ? unique : [...fallback]
}

export const normalizeSettings = (input: Partial<WorkbenchSettings> | null | undefined): WorkbenchSettings => {
  return {
    id: 'settings',
    statusOptions: normalizeList(input?.statusOptions, DEFAULT_SETTINGS.statusOptions),
    telemetryReadinessOptions: normalizeList(input?.telemetryReadinessOptions, DEFAULT_SETTINGS.telemetryReadinessOptions),
    severityOptions: normalizeList(input?.severityOptions, DEFAULT_SETTINGS.severityOptions),
    urgencyOptions: normalizeList(input?.urgencyOptions, DEFAULT_SETTINGS.urgencyOptions),
    updatedAt: input?.updatedAt && String(input.updatedAt).trim() ? String(input.updatedAt) : isoNow(),
  }
}

export const ensureSettings = async (): Promise<WorkbenchSettings> => {
  const existing = await db.settings.get('settings')
  if (existing) return normalizeSettings(existing)
  const defaults = normalizeSettings(DEFAULT_SETTINGS)
  await db.settings.put(defaults)
  return defaults
}

export const saveSettings = async (input: WorkbenchSettings): Promise<WorkbenchSettings> => {
  const normalized = normalizeSettings(input)
  await db.settings.put(normalized)
  return normalized
}

export const resetSettings = async (): Promise<WorkbenchSettings> => {
  const defaults = normalizeSettings(DEFAULT_SETTINGS)
  await db.settings.put(defaults)
  return defaults
}

export const defaultSettingsSnapshot = (): WorkbenchSettings => normalizeSettings(DEFAULT_SETTINGS)

export const withCurrentOption = (options: string[], current: string) => {
  if (!current) return options
  return options.includes(current) ? options : [...options, current]
}
