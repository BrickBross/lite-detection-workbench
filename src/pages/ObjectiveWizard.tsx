import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { recordAuditEvent } from '../lib/audit'
import { nextId, isoNow } from '../lib/ids'
import { useMitreTechniques } from '../lib/mitreData'
import { TelemetryPicker } from '../lib/TelemetryPicker'
import { telemetryDefaults, telemetryLabel } from '../lib/telemetryCatalog'
import type { Objective } from '../lib/schemas'
import { defaultSettingsSnapshot, ensureSettings, withCurrentOption } from '../lib/settings'

export default function ObjectiveWizard() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mitre, setMitre] = useState<string>('T1003')
  const [tactic, setTactic] = useState<string>('Credential Access')
  const [mitreSearch, setMitreSearch] = useState('')
  const [settings, setSettings] = useState(defaultSettingsSnapshot())
  const [status, setStatus] = useState<Objective['status']>('planned')
  const [telemetryReadiness, setTelemetryReadiness] = useState<Objective['telemetryReadiness']>('partial')
  const [rationale, setRationale] = useState('')
  const [responsePlan, setResponsePlan] = useState('')
  const [externalReferences, setExternalReferences] = useState<string[]>([''])
  const [severity, setSeverity] = useState<Objective['severity']>('medium')
  const [urgency, setUrgency] = useState<Objective['urgency']>('p2')
  const [requiredTelemetrySources, setRequiredTelemetrySources] = useState<string[]>([])
  const [requiredTelemetrySourceOverrides, setRequiredTelemetrySourceOverrides] = useState<Objective['requiredTelemetrySourceOverrides']>({})
  const [otherTelemetrySourcesText, setOtherTelemetrySourcesText] = useState('')
  const [telemetryNotes, setTelemetryNotes] = useState('')

  const mitreOptions = useMitreTechniques()

  useEffect(() => {
    ensureSettings().then((loaded) => {
      setSettings(loaded)
      setStatus((cur) => (loaded.statusOptions.includes(cur) ? cur : loaded.statusOptions[0] ?? cur))
      setTelemetryReadiness((cur) =>
        loaded.telemetryReadinessOptions.includes(cur) ? cur : loaded.telemetryReadinessOptions[0] ?? cur,
      )
      setSeverity((cur) => (loaded.severityOptions.includes(cur) ? cur : loaded.severityOptions[0] ?? cur))
      setUrgency((cur) => (loaded.urgencyOptions.includes(cur) ? cur : loaded.urgencyOptions[0] ?? cur))
    })
  }, [])

  const canSave = name.trim().length >= 3 && description.trim().length >= 3 && responsePlan.trim().length >= 10

  const selectedMitreKey = `${mitre}|${tactic}`
  const selectedMitre = useMemo(
    () => mitreOptions.find((x) => `${x.technique}|${x.tactic}` === selectedMitreKey) ?? null,
    [mitreOptions, selectedMitreKey],
  )

  const filteredMitreOptions = useMemo(() => {
    const q = mitreSearch.trim().toLowerCase()
    if (!q) return mitreOptions
    return mitreOptions.filter((x) => `${x.technique} ${x.name} ${x.tactic}`.toLowerCase().includes(q)).slice(0, 200)
  }, [mitreOptions, mitreSearch])

  const searchingMitre = !!mitreSearch.trim()
  const selectedInMitreMatches = useMemo(() => {
    if (!searchingMitre) return true
    return filteredMitreOptions.some((x) => `${x.technique}|${x.tactic}` === selectedMitreKey)
  }, [filteredMitreOptions, searchingMitre, selectedMitreKey])

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
      responsePlan: responsePlan.trim(),
      externalReferences: externalReferences
        .map((x) => x.trim())
        .filter(Boolean),
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
        <p className="text-sm text-[rgb(var(--muted))]">
          Capture the <span className="text-[rgb(var(--text))]">what</span> and <span className="text-[rgb(var(--text))]">why</span> before writing detections.
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
          <Label className="mt-3">Response (required)</Label>
          <Textarea
            value={responsePlan}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setResponsePlan(e.target.value)}
            placeholder="How would this alert be responded to (triage steps, containment, validation)? Who would be contacted (SOC, IR, system owner, app team, etc.)?"
          />

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <Label>External references (optional)</Label>
              <button
                type="button"
                onClick={() => setExternalReferences((cur) => (cur.length >= 20 ? cur : [...cur, '']))}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-1.5 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
                title="Add another URL"
              >
                +
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {externalReferences.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    className="mt-0"
                    value={v}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setExternalReferences((cur) => cur.map((x, idx) => (idx === i ? e.target.value : x)))
                    }
                    placeholder="https://..."
                  />
                    {externalReferences.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setExternalReferences((cur) => cur.filter((_, idx) => idx !== i))}
                        className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
                        title="Remove"
                      >
                        A-
                      </button>
                    ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Detection severity</Label>
              <select
                className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm"
                value={severity}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSeverity(e.target.value as any)}
              >
                {withCurrentOption(settings.severityOptions, severity).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Urgency</Label>
              <select
                className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm"
                value={urgency}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setUrgency(e.target.value as any)}
              >
                {withCurrentOption(settings.urgencyOptions, urgency).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
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
            className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]"
          />
          <div className="mt-2 text-xs text-[rgb(var(--faint))]">
            {mitreSearch.trim() ? `Matches: ${filteredMitreOptions.length} (showing up to 200)` : `Techniques: ${mitreOptions.length}`}
          </div>
          {searchingMitre && !selectedInMitreMatches && selectedMitre ? (
            <div className="mt-2 text-xs text-[rgb(var(--faint))]">
              Current selection: {selectedMitre.technique} - {selectedMitre.name} ({selectedMitre.tactic})
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <select
              className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm"
              value={selectedInMitreMatches ? selectedMitreKey : ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                if (!e.target.value) return
                const [technique, nextTactic] = e.target.value.split('|')
                setMitre(technique)
                setTactic(nextTactic ?? 'Unknown')
                setMitreSearch('')
              }}
            >
              {selectedInMitreMatches ? null : (
                <option value="" disabled>
                  Select from matches...
                </option>
              )}
              {filteredMitreOptions.map((t) => (
                <option key={`${t.technique}|${t.tactic}`} value={`${t.technique}|${t.tactic}`}>
                  {t.technique} - {t.name} ({t.tactic})
                </option>
              ))}
            </select>
            <Input value={tactic} readOnly title="Tactic is derived from the selected technique." />
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
            <div className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.2)] p-3">
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Selected source properties</div>
              <div className="mt-2 space-y-2">
                {selectedTelemetry.map(({ id, defaults }) => {
                  const cur = requiredTelemetrySourceOverrides[id] ?? {}
                  const dataClassification = cur.dataClassification ?? defaults?.dataClassification ?? ''
                  const internetExposed = cur.internetExposed ?? defaults?.internetExposed ?? false
                  const authRequired = cur.authRequired ?? defaults?.authRequired ?? false
                  const loggingEnabled = cur.loggingEnabled ?? defaults?.loggingEnabled ?? false
                  const notes = cur.notes ?? ''
                  return (
                    <div key={id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="text-xs text-[rgb(var(--faint))]">{id}</div>
                          <div className="truncate text-sm font-semibold text-[rgb(var(--text))]">{telemetryLabel(id)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
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
                          <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
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
                          <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
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
                            className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs text-[rgb(var(--text-muted))]"
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
                        <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Notes (optional)</div>
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
                          className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]"
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
              className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm"
              value={status}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as any)}
            >
                {withCurrentOption(settings.statusOptions, status).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Telemetry readiness</Label>
            <select
              className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm"
              value={telemetryReadiness}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setTelemetryReadiness(e.target.value as any)}
            >
                {withCurrentOption(settings.telemetryReadinessOptions, telemetryReadiness).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col items-end justify-between gap-3 md:flex-row md:items-center">
        <label className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
          <input type="checkbox" checked={canSave} readOnly />
          Validation passed
        </label>
        <div className="flex items-center justify-end gap-3">
        <Link
          to="/objectives"
          className="rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.4)]"
        >
          Cancel
        </Link>
        <button
          onClick={save}
          disabled={!canSave}
          className="rounded-2xl bg-[rgb(var(--accent))] px-5 py-2 text-sm font-semibold text-[rgb(var(--accent-fg))] disabled:opacity-40"
        >
          Save Objective
        </button>
        </div>
      </div>
    </div>
  )
}

function Card({ children }: any) {
  return <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">{children}</div>
}
function Label({ children, className = '' }: any) {
  return <div className={`text-xs font-semibold text-[rgb(var(--text-muted))] ${className}`}>{children}</div>
}
function Input(props: any) {
  return (
    <input
      {...props}
      className={[
        'mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]',
        props.className ?? '',
      ].join(' ')}
    />
  )
}
function Textarea(props: any) {
  return (
    <textarea
      {...props}
      rows={4}
      className={[
        'mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]',
        props.className ?? '',
      ].join(' ')}
    />
  )
}
