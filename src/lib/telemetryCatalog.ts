import { SERVICE_CATALOG } from './threatCanvasCatalog'

export type TelemetryProvider = 'aws' | 'azure' | 'gcp' | 'saas' | 'onprem'

export type TelemetrySourceProps = {
  dataClassification?: string
  internetExposed?: boolean
  authRequired?: boolean
  loggingEnabled?: boolean
  notes?: string
}

export type TelemetryCatalogRow = {
  id: string
  provider: TelemetryProvider
  category: string
  name: string
  defaults: TelemetrySourceProps
  details: string[]
}

export type TelemetryCategory = {
  id: string
  label: string
  sources: TelemetryCatalogRow[]
}

export type TelemetryProviderGroup = {
  id: TelemetryProvider
  label: string
  categories: TelemetryCategory[]
}

function providerLabel(p: TelemetryProvider) {
  if (p === 'aws') return 'AWS'
  if (p === 'azure') return 'Azure / Microsoft'
  if (p === 'gcp') return 'GCP'
  if (p === 'saas') return 'SaaS'
  return 'On-prem'
}

function rowDefaults(raw: any): TelemetrySourceProps {
  const props = raw?.defaultProps ?? {}
  const out: TelemetrySourceProps = {}
  if (typeof props.dataClassification === 'string') out.dataClassification = props.dataClassification
  if (typeof props.internetExposed === 'boolean') out.internetExposed = props.internetExposed
  if (typeof props.authRequired === 'boolean') out.authRequired = props.authRequired
  if (typeof props.loggingEnabled === 'boolean') out.loggingEnabled = props.loggingEnabled
  return out
}

function rowDetails(props: TelemetrySourceProps): string[] {
  const details: string[] = []
  if (typeof props.dataClassification === 'string') details.push(`classification: ${props.dataClassification}`)
  if (typeof props.internetExposed === 'boolean') details.push(`internet exposed: ${props.internetExposed ? 'yes' : 'no'}`)
  if (typeof props.authRequired === 'boolean') details.push(`auth required: ${props.authRequired ? 'yes' : 'no'}`)
  if (typeof props.loggingEnabled === 'boolean') details.push(`logging enabled: ${props.loggingEnabled ? 'yes' : 'no'}`)
  if (typeof props.notes === 'string' && props.notes.trim()) details.push(`notes: ${props.notes.trim()}`)
  return details
}

const ALLOWED: TelemetryProvider[] = ['aws', 'azure', 'gcp', 'saas', 'onprem']

const rows: TelemetryCatalogRow[] = (SERVICE_CATALOG as any[])
  .filter((r) => ALLOWED.includes(r?.provider))
  .map((r) => {
    const defaults = rowDefaults(r)
    return {
      id: String(r.id),
      provider: r.provider as TelemetryProvider,
      category: String(r.category ?? r.defaultProps?.serviceCategory ?? 'Other'),
      name: String(r.name ?? 'Unknown'),
      defaults,
      details: rowDetails(defaults),
    }
  })
  .sort((a, b) => (a.provider + a.category + a.name).localeCompare(b.provider + b.category + b.name))

export const TELEMETRY_ROWS = rows

export const TELEMETRY_BY_ID = new Map<string, TelemetryCatalogRow>(rows.map((r) => [r.id, r] as const))

export const TELEMETRY_CATALOG: TelemetryProviderGroup[] = ALLOWED.map((provider) => {
  const providerRows = rows.filter((r) => r.provider === provider)
  const categories = new Map<string, TelemetryCatalogRow[]>()
  for (const r of providerRows) categories.set(r.category, [...(categories.get(r.category) ?? []), r])

  const categoryGroups: TelemetryCategory[] = Array.from(categories.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, sources]) => ({
      id: `${provider}:${category}`,
      label: category,
      sources: sources.sort((a, b) => a.name.localeCompare(b.name)),
    }))

  return {
    id: provider,
    label: providerLabel(provider),
    categories: categoryGroups,
  }
})

export function telemetryLabel(id: string) {
  return TELEMETRY_BY_ID.get(id)?.name ?? id
}

export function telemetryDetails(id: string) {
  return TELEMETRY_BY_ID.get(id)?.details ?? []
}

export function telemetryDefaults(id: string): TelemetrySourceProps | undefined {
  return TELEMETRY_BY_ID.get(id)?.defaults
}

export function telemetryDetailsFromProps(props: TelemetrySourceProps): string[] {
  return rowDetails(props)
}
