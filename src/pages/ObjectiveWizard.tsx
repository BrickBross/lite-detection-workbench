import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { recordAuditEvent } from '../lib/audit'
import { nextId, isoNow } from '../lib/ids'
import { useMitreTechniques } from '../lib/mitreData'
import { TelemetryPicker } from '../lib/TelemetryPicker'
import { telemetryDefaults, telemetryLabel } from '../lib/telemetryCatalog'
import type { Objective } from '../lib/schemas'

export default function ObjectiveWizard() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mitre, setMitre] = useState<string>('T1003')
  const [tactic, setTactic] = useState<string>('Credential Access')
  const [mitreSearch, setMitreSearch] = useState('')
  const [status, setStatus] = useState<Objective['status']>('planned')
  const [telemetryReadiness, setTelemetryReadiness] = useState<Objective['telemetryReadiness']>('partial')
  const [rationale, setRationale] = useState('')
  const [severity, setSeverity] = useState<Objective['severity']>('medium')
  const [urgency, setUrgency] = useState<Objective['urgency']>('p2')
  const [requiredTelemetrySources, setRequiredTelemetrySources] = useState<string[]>([])
  const [requiredTelemetrySourceOverrides, setRequiredTelemetrySourceOverrides] = useState<Objective['requiredTelemetrySourceOverrides']>({})
  const [otherTelemetrySourcesText, setOtherTelemetrySourcesText] = useState('')
  const [telemetryNotes, setTelemetryNotes] = useState('')

  const mitreOptions = useMitreTechniques()

  const canSave = name.trim().length >= 3 && description.trim().length >= 3

  const filteredMitreOptions = useMemo(() => {
    const q = mitreSearch.trim().toLowerCase()
    if (!q) return mitreOptions
    return mitreOptions.filter((x) => `${x.technique} ${x.name} ${x.tactic}`.toLowerCase().includes(q)).slice(0, 200)
  }, [mitreOptions, mitreSearch])

  const selectedTelemetry = useMemo(() => requiredTelemetrySources.map((id) => ({ id, defaults: telemetryDefaults(id) })), [requiredTelemetrySources])

  const setSelectedTelemetrySources = (next: string[]) => {
    setRequiredTelemetrySources(next)
    setRequiredTelemetrySourceOverrides((cur) => {
      const out: Objective['requiredTelemetrySourceOverrides'] = {}
      for (const id of next) {
        const existing = cur[id]
        if (existing) out[id] = existing
        else {
          const d = telemetryDefaults(id)
          out[id] = d ? { ...d } : {}
        }
      }
      return out
    })
  }

  const save = async () => {
    const existing = await db.objectives.toCollection().primaryKeys()
    const id = nextId('OBJ', existing as string[])
    const now = isoNow()
    const obj: Objective = {
      id,
      name: name.trim(),
      description: description.trim(),
      mitre: [{ tactic, technique: mitre }],
      status,
      telemetryReadiness,
      rationale: rationale.trim() ? rationale.trim() : undefined,
      severity,
      urgency,
      requiredTelemetrySources,
      requiredTelemetrySourceOverrides,
      otherTelemetrySources: otherTelemetrySourcesText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      telemetryNotes: telemetryNotes.trim() ? telemetryNotes.trim() : undefined,
      createdAt: now,
      updatedAt: now,
    }
    await db.objectives.add(obj)
    await recordAuditEvent({
      entityType: 'objective',
      action: 'create',
      entityId: id,
      summary: `Created ${id}`,
      after: obj,
    })
    navigate('/objectives')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">New Objective</h1>
        <p className="text-sm text-zinc-400">
          Capture the <span className="text-zinc-200">what</span> and <span className="text-zinc-200">why</span> before writing detections.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Label>Objective name</Label>
          <Input
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Detect LSASS memory access by non-system processes"
          />
          <Label className="mt-3">Description</Label>
          <Textarea
            value={description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Describe the attacker behavior in plain language..."
          />
          <Label className="mt-3">Rationale (optional)</Label>
          <Textarea
            value={rationale}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRationale(e.target.value)}
            placeholder="Why does this matter? What risk does it reduce?"
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Detection severity</Label>
              <select
                className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={severity}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSeverity(e.target.value as any)}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </div>
            <div>
              <Label>Urgency</Label>
              <select
                className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={urgency}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setUrgency(e.target.value as any)}
              >
                <option value="p0">p0 (urgent)</option>
                <option value="p1">p1 (within 60 days)</option>
                <option value="p2">p2 (within 120 days)</option>
                <option value="p3">p3 (backlog)</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <Label>MITRE mapping (lite)</Label>
          <input
            value={mitreSearch}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMitreSearch(e.target.value)}
            placeholder="Search MITRE techniques (e.g., T1003, credential dumping)"
            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={mitre}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const t = mitreOptions.find((x) => x.technique === e.target.value)
                setMitre(e.target.value)
                if (t) setTactic(t.tactic)
              }}
            >
              {filteredMitreOptions.map((t) => (
                <option key={t.technique} value={t.technique}>
                  {t.technique} - {t.name}
                </option>
              ))}
            </select>
            <Input value={tactic} onChange={(e: ChangeEvent<HTMLInputElement>) => setTactic(e.target.value)} />
          </div>

          <Label className="mt-3">Required telemetry sources</Label>
          <TelemetryPicker
            selectedIds={requiredTelemetrySources}
            onChangeSelectedIds={setSelectedTelemetrySources}
            otherTelemetrySourcesText={otherTelemetrySourcesText}
            onChangeOtherTelemetrySourcesText={setOtherTelemetrySourcesText}
            defaultCollapsed
          />

          {selectedTelemetry.length ? (
            <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3">
              <div className="text-xs font-semibold text-zinc-300">Selected source properties</div>
              <div className="mt-2 space-y-2">
                {selectedTelemetry.map(({ id, defaults }) => {
                  const cur = requiredTelemetrySourceOverrides[id] ?? {}
                  const dataClassification = cur.dataClassification ?? defaults?.dataClassification ?? ''
                  const internetExposed = cur.internetExposed ?? defaults?.internetExposed ?? false
                  const authRequired = cur.authRequired ?? defaults?.authRequired ?? false
                  const loggingEnabled = cur.loggingEnabled ?? defaults?.loggingEnabled ?? false
                  const notes = cur.notes ?? ''
                  return (
                    <div key={id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="text-xs text-zinc-500">{id}</div>
                          <div className="truncate text-sm font-semibold text-zinc-200">{telemetryLabel(id)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          <label className="flex items-center gap-2 text-xs text-zinc-300">
                            <input
                              type="checkbox"
                              checked={internetExposed}
                              onChange={(e) =>
                                setRequiredTelemetrySourceOverrides((cur) => ({
                                  ...cur,
                                  [id]: { ...(cur[id] ?? {}), internetExposed: e.target.checked },
                                }))
                              }
                            />
                            Internet exposed
                          </label>
                          <label className="flex items-center gap-2 text-xs text-zinc-300">
                            <input
                              type="checkbox"
                              checked={authRequired}
                              onChange={(e) =>
                                setRequiredTelemetrySourceOverrides((cur) => ({
                                  ...cur,
                                  [id]: { ...(cur[id] ?? {}), authRequired: e.target.checked },
                                }))
                              }
                            />
                            Auth required
                          </label>
                          <label className="flex items-center gap-2 text-xs text-zinc-300">
                            <input
                              type="checkbox"
                              checked={loggingEnabled}
                              onChange={(e) =>
                                setRequiredTelemetrySourceOverrides((cur) => ({
                                  ...cur,
                                  [id]: { ...(cur[id] ?? {}), loggingEnabled: e.target.checked },
                                }))
                              }
                            />
                            Logging enabled
                          </label>
                          <select
                            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
                            value={dataClassification}
                            onChange={(e) =>
                              setRequiredTelemetrySourceOverrides((cur) => ({
                                ...cur,
                                [id]: { ...(cur[id] ?? {}), dataClassification: e.target.value },
                              }))
                            }
                          >
                            <option value="">(classification)</option>
                            <option value="Public">Public</option>
                            <option value="Internal">Internal</option>
                            <option value="Confidential">Confidential</option>
                            <option value="Restricted">Restricted</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-xs font-semibold text-zinc-300">Notes (optional)</div>
                        <textarea
                          value={notes}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                            setRequiredTelemetrySourceOverrides((cur) => ({
                              ...cur,
                              [id]: { ...(cur[id] ?? {}), notes: e.target.value },
                            }))
                          }
                          rows={2}
                          placeholder="Log location, retention, required fields, gaps..."
                          className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          <Label className="mt-3">Telemetry notes (optional)</Label>
          <Textarea
            value={telemetryNotes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTelemetryNotes(e.target.value)}
            placeholder="Any assumptions, required fields, log locations, retention requirements, known gaps..."
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <select
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as any)}
              >
                <option value="planned">planned</option>
                <option value="blocked">blocked</option>
                <option value="implemented">implemented</option>
                <option value="tuned">tuned</option>
                <option value="validated">validated</option>
              </select>
            </div>
            <div>
              <Label>Telemetry readiness</Label>
              <select
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={telemetryReadiness}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setTelemetryReadiness(e.target.value as any)}
              >
                <option value="unknown">unknown</option>
                <option value="available">available</option>
                <option value="partial">partial</option>
                <option value="missing">missing</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col items-end justify-between gap-3 md:flex-row md:items-center">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={canSave} readOnly />
          Validation passed
        </label>
        <div className="flex items-center justify-end gap-3">
        <Link to="/objectives" className="rounded-2xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900/40">
          Cancel
        </Link>
        <button
          onClick={save}
          disabled={!canSave}
          className="rounded-2xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40"
        >
          Save Objective
        </button>
        </div>
      </div>
    </div>
  )
}

function Card({ children }: any) {
  return <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">{children}</div>
}
function Label({ children, className = '' }: any) {
  return <div className={`text-xs font-semibold text-zinc-300 ${className}`}>{children}</div>
}
function Input(props: any) {
  return (
    <input
      {...props}
      className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
    />
  )
}
function Textarea(props: any) {
  return (
    <textarea
      {...props}
      rows={4}
      className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
    />
  )
}
