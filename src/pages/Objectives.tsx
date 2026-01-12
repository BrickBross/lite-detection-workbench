import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { recordAuditEvent } from '../lib/audit'
import { isoNow, nextId } from '../lib/ids'
import { useMitreTechniques } from '../lib/mitreData'
import { TelemetryPicker } from '../lib/TelemetryPicker'
import { TELEMETRY_BY_ID, telemetryDetailsFromProps, telemetryLabel } from '../lib/telemetryCatalog'
import { ObjectiveSchema, type Objective } from '../lib/schemas'
import { defaultSettingsSnapshot, ensureSettings, withCurrentOption, type WorkbenchSettings } from '../lib/settings'

export default function Objectives() {
  const [items, setItems] = useState<Objective[]>([])
  const [editing, setEditing] = useState<Objective | null>(null)
  const [viewing, setViewing] = useState<Objective | null>(null)
  const [q, setQ] = useState('')
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [groupBy, setGroupBy] = useState<'none' | 'mitre' | 'telemetry'>('none')
  const [settings, setSettings] = useState<WorkbenchSettings>(defaultSettingsSnapshot())

  useEffect(() => {
    const load = async () => setItems(await db.objectives.orderBy('updatedAt').reverse().toArray())
    load()
  }, [])
  useEffect(() => {
    ensureSettings().then(setSettings)
  }, [])

  const mitreOptions = useMitreTechniques()
  const mitreNameByTechnique = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of mitreOptions) if (!map.has(r.technique)) map.set(r.technique, r.name)
    return map
  }, [mitreOptions])
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return items
    return items.filter((o) => {
      const mitreText = (o.mitre ?? []).map((m) => `${m.tactic} ${m.technique} ${m.subtechnique ?? ''}`).join(' ')
      const telemetryText = (o.requiredTelemetrySources ?? []).join(' ') + ' ' + (o.otherTelemetrySources ?? []).join(' ')
      const refsText = (o.externalReferences ?? []).join(' ')
      const hay =
        `${o.id} ${o.name} ${o.description} ${o.responsePlan ?? ''} ${o.status} ${o.telemetryReadiness} ${o.severity ?? ''} ${o.urgency ?? ''} ${o.query ?? ''} ${mitreText} ${telemetryText} ${refsText}`.toLowerCase()
      return hay.includes(query)
    })
  }, [items, q])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null

    const groups = new Map<string, Objective[]>()
    const add = (key: string, obj: Objective) => groups.set(key, [...(groups.get(key) ?? []), obj])

    if (groupBy === 'mitre') {
      for (const o of filtered) {
        const keys = new Set<string>((o.mitre ?? []).map((m) => m.technique).filter(Boolean))
        for (const k of keys) add(k, o)
      }
    } else if (groupBy === 'telemetry') {
      for (const o of filtered) {
        const keys = new Set<string>((o.requiredTelemetrySources ?? []).filter(Boolean))
        if (keys.size === 0) add('(none)', o)
        else for (const k of keys) add(k, o)
      }
    }

    return Array.from(groups.entries())
      .map(([key, objs]) => ({ key, items: objs }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }, [filtered, groupBy])

  const exportObjective = async (objective: Objective) => {
    const telemetrySourcesDetailed = (objective.requiredTelemetrySources ?? []).map((id) => {
      const row = TELEMETRY_BY_ID.get(id)
      const override = objective.requiredTelemetrySourceOverrides?.[id] ?? {}
      const defaults = row?.defaults ?? {}
      const merged = { ...(defaults ?? {}), ...(override ?? {}) }
      return {
        id,
        name: row?.name ?? id,
        provider: row?.provider ?? null,
        category: row?.category ?? null,
        defaults,
        override,
        merged,
        details: telemetryDetailsFromProps(merged),
      }
    })
    const mitreExpanded = (objective.mitre ?? []).map((m) => ({
      ...m,
      name: mitreNameByTechnique.get(m.technique) ?? null,
    }))
    const assistantContext = {
      objectiveSummary: `${objective.name}: ${objective.description}`,
      intent: objective.rationale ?? null,
      responsePlan: objective.responsePlan ?? null,
      mitre: mitreExpanded,
      telemetryReadiness: objective.telemetryReadiness,
      requiredTelemetrySources: telemetrySourcesDetailed,
      otherTelemetrySources: objective.otherTelemetrySources ?? [],
      queryAvailable: objective.queryAvailable ?? false,
      query: objective.queryAvailable ? objective.query ?? null : null,
      desiredOutputs: [
        'detection_idea_summary',
        'recommended_data_sources',
        'candidate_detection_queries',
        'testing_and_false_positive_notes',
      ],
      clarifyQuestions: [
        'Which SIEM or analytics platform should the detection target?',
        'Which detection format is preferred (Sigma, KQL, SPL, EQL, SQL, or vendor-specific)?',
        'Is there a preferred schema or data model (ECS, CIM, OCSF, vendor schema)?',
        'What log sources are available and how complete is the telemetry?',
        'Are there known false positives or exclusions to bake in?',
      ],
    }
    const enriched = {
      ...objective,
      mitreExpanded,
      telemetrySourcesDetailed,
      assistantContext,
    }
    const json = JSON.stringify(enriched, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${objective.id}.json`
    a.click()
    URL.revokeObjectURL(url)

    await recordAuditEvent({
      entityType: 'export',
      action: 'export',
      summary: `Exported ${objective.id}.json`,
      meta: { entityType: 'objective', entityId: objective.id },
    })
  }

  const importObjectivesFromJson = async (file: File) => {
    const text = await file.text()
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch (e: any) {
      alert(`Invalid JSON: ${e?.message ?? 'failed to parse'}`)
      return
    }

    const rawObjectives: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.objectives) ? parsed.objectives : [parsed]
    if (!rawObjectives.length) {
      alert('No objectives found in JSON.')
      return
    }

    const existingIds = new Set<string>((await db.objectives.toCollection().primaryKeys()) as string[])
    const now = isoNow()

    const imported: Objective[] = []
    const errors: string[] = []

    for (let i = 0; i < rawObjectives.length; i++) {
      const candidate = rawObjectives[i]
      const normalized = {
        ...candidate,
        createdAt: typeof candidate?.createdAt === 'string' ? candidate.createdAt : now,
        updatedAt: typeof candidate?.updatedAt === 'string' ? candidate.updatedAt : now,
      }

      const parsedObjective = ObjectiveSchema.safeParse(normalized)
      if (!parsedObjective.success) {
        errors.push(`Item ${i + 1}: ${parsedObjective.error.issues[0]?.message ?? 'invalid objective'}`)
        continue
      }

      let objective = parsedObjective.data
      const idOk = /^OBJ-\d{4}$/.test(objective.id)
      const needsNewId = !idOk || existingIds.has(objective.id)
      if (needsNewId) {
        const id = nextId('OBJ', Array.from(existingIds))
        objective = { ...objective, id, createdAt: now, updatedAt: now }
      }

      existingIds.add(objective.id)
      imported.push(objective)
    }

    if (!imported.length) {
      alert(`No objectives imported.\n\n${errors.join('\n')}`)
      return
    }

    await db.transaction('rw', db.objectives, db.audit, async () => {
      for (const obj of imported) {
        await db.objectives.put(obj)
        await recordAuditEvent({
          entityType: 'objective',
          action: 'create',
          entityId: obj.id,
          summary: `Imported ${obj.id} from JSON`,
          after: obj,
          meta: { sourceFile: file.name },
        })
      }
    })

    setItems(await db.objectives.orderBy('updatedAt').reverse().toArray())
    alert(`Imported ${imported.length} objective(s).${errors.length ? `\n\nSkipped ${errors.length} invalid item(s).` : ''}`)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Objectives</h1>
          <p className="text-xs text-[rgb(var(--muted))]">Define what you want to detect (before writing rules).</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:items-end">
          <div className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
            <input
              value={q}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
              placeholder="Search objectives (id, name, MITRE, status...)"
              className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))] md:w-[360px]"
            />
            <select
              value={groupBy}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setGroupBy(e.target.value as any)}
              className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm md:w-[240px]"
              aria-label="Group objectives by"
            >
              <option value="none">Group: none</option>
              <option value="mitre">Group: MITRE technique</option>
              <option value="telemetry">Group: telemetry source</option>
            </select>
            <Link
              to="/wizard"
              className="rounded-2xl bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-[rgb(var(--accent-fg))] hover:bg-[rgb(var(--accent)/0.9)]"
            >
              New Objective
            </Link>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
            >
              Import JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) importObjectivesFromJson(file)
              }}
            />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-sm text-[rgb(var(--muted))]">
          No objectives yet. Create one with the wizard.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-sm text-[rgb(var(--muted))]">No matches.</div>
      ) : groupBy === 'none' ? (
        <div className="grid gap-3">
          {filtered.map((o) => (
            <ObjectiveCard key={o.id} o={o} onView={() => setViewing(o)} onEdit={() => setEditing(o)} onExport={() => exportObjective(o)} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(grouped ?? []).map((g) => {
            const label =
              groupBy === 'mitre'
                ? `${g.key}${mitreNameByTechnique.get(g.key) ? ` — ${mitreNameByTechnique.get(g.key)}` : ''}`
                : groupBy === 'telemetry'
                  ? g.key === '(none)'
                    ? '(no required telemetry sources)'
                    : telemetryLabel(g.key)
                  : g.key
            return (
              <div key={g.key} className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{label}</div>
                    <div className="mt-1 text-xs text-[rgb(var(--faint))]">
                      {g.items.length} objective{g.items.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3">
                  {g.items.map((o) => (
                    <ObjectiveCard
                      key={`${g.key}:${o.id}`}
                      o={o}
                      onView={() => setViewing(o)}
                      onEdit={() => setEditing(o)}
                      onExport={() => exportObjective(o)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing ? (
        <EditObjectiveModal
          o={editing}
          mitreOptions={mitreOptions}
          settings={settings}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setItems((cur) => cur.map((x) => (x.id === next.id ? next : x)))
            setEditing(null)
          }}
          onDeleted={(id) => {
            setItems((cur) => cur.filter((x) => x.id !== id))
            setEditing(null)
          }}
        />
      ) : null}
      {viewing ? <ViewObjectiveModal o={viewing} onClose={() => setViewing(null)} /> : null}
    </div>
  )
}

type BadgeTone = 'status' | 'telemetry' | 'severity' | 'urgency' | 'source'

const badgeToneClasses: Record<BadgeTone, string> = {
  status: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  telemetry: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  severity: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  urgency: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  source: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

function Badge({ label, value, tone }: { label: string; value: string; tone: BadgeTone }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium',
        badgeToneClasses[tone],
      ].join(' ')}
    >
      <span className="text-[11px] opacity-80">{label}:</span>
      <span className="text-[rgb(var(--text))]">{formatOptionLabel(value)}</span>
    </span>
  )
}

function ObjectiveCard({
  o,
  onView,
  onEdit,
  onExport,
}: {
  o: Objective
  onView: () => void
  onEdit: () => void
  onExport: () => void
}) {
  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs text-[rgb(var(--faint))]">{o.id}</div>
          <div className="text-lg font-semibold">{o.name}</div>
          <div className="mt-1 text-sm text-[rgb(var(--muted))]">{o.description}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge label="Status" value={o.status} tone="status" />
            <Badge label="Telemetry" value={o.telemetryReadiness} tone="telemetry" />
            <Badge label="Severity" value={o.severity} tone="severity" />
            <Badge label="Urgency" value={o.urgency} tone="urgency" />
            {(o.requiredTelemetrySources ?? []).slice(0, 4).map((s) => (
              <Badge key={s} label="Source" value={telemetryLabel(s)} tone="source" />
            ))}
            {(o.requiredTelemetrySources ?? []).length > 4 ? (
              <Badge label="Source" value={`+${(o.requiredTelemetrySources ?? []).length - 4} more`} tone="source" />
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={onView}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
          >
            View
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
          >
            Export JSON
          </button>
        </div>
      </div>
      <div className="mt-3 text-xs text-[rgb(var(--faint))]">MITRE: {(o.mitre ?? []).map((m) => `${m.tactic}/${m.technique}`).join(', ')}</div>
      <div className="mt-3 flex justify-end text-[11px] text-[rgb(var(--faint))]">
        <div className="text-right">
          Updated {new Date(o.updatedAt).toLocaleString()} • Created {new Date(o.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

function EditObjectiveModal({
  o,
  mitreOptions,
  settings,
  onClose,
  onSaved,
  onDeleted,
}: {
  o: Objective
  mitreOptions: { technique: string; tactic: string; name: string }[]
  settings: WorkbenchSettings
  onClose: () => void
  onSaved: (o: Objective) => void
  onDeleted: (id: string) => void
}) {
  const [name, setName] = useState(o.name)
  const [description, setDescription] = useState(o.description)
  const [rationale, setRationale] = useState(o.rationale ?? '')
  const [responsePlan, setResponsePlan] = useState(o.responsePlan ?? '')
  const [externalReferences, setExternalReferences] = useState<string[]>(
    o.externalReferences && o.externalReferences.length ? o.externalReferences : [''],
  )
  const [status, setStatus] = useState<Objective['status']>(o.status)
  const [telemetryReadiness, setTelemetryReadiness] = useState<Objective['telemetryReadiness']>(o.telemetryReadiness)
  const [severity, setSeverity] = useState<Objective['severity']>(o.severity ?? 'medium')
  const [urgency, setUrgency] = useState<Objective['urgency']>(o.urgency ?? 'p2')
  const [requiredTelemetrySources, setRequiredTelemetrySources] = useState<string[]>(o.requiredTelemetrySources ?? [])
  const [otherTelemetrySourcesText, setOtherTelemetrySourcesText] = useState((o.otherTelemetrySources ?? []).join(', '))
  const [telemetryNotes, setTelemetryNotes] = useState(o.telemetryNotes ?? '')
  const [queryAvailable, setQueryAvailable] = useState(o.queryAvailable ?? false)
  const [query, setQuery] = useState(o.query ?? '')
  const [mitre, setMitre] = useState(o.mitre.length ? o.mitre : [{ tactic: 'Credential Access', technique: 'T1003' }])

  const canSave = name.trim().length >= 3 && description.trim().length >= 3 && responsePlan.trim().length >= 10 && mitre.length > 0

  const save = async () => {
    if (!canSave) return
    const now = isoNow()
    const next: Objective = {
      ...o,
      name: name.trim(),
      description: description.trim(),
      rationale: rationale.trim() ? rationale.trim() : undefined,
      responsePlan: responsePlan.trim(),
      externalReferences: externalReferences
        .map((x) => x.trim())
        .filter(Boolean),
      status,
      telemetryReadiness,
      severity,
      urgency,
      requiredTelemetrySources,
      otherTelemetrySources: otherTelemetrySourcesText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      telemetryNotes: telemetryNotes.trim() ? telemetryNotes.trim() : undefined,
      queryAvailable,
      query: queryAvailable && query.trim() ? query.trim() : undefined,
      mitre,
      updatedAt: now,
    }
    await db.objectives.put(next)
    await recordAuditEvent({
      entityType: 'objective',
      action: 'update',
      entityId: o.id,
      summary: `Updated ${o.id}`,
      before: o,
      after: next,
    })
    onSaved(next)
  }

  const del = async () => {
    if (!confirm(`Delete ${o.id}? This will also delete any detections linked to this objective.`)) return

    const linkedDetections = await db.detections.where('objectiveId').equals(o.id).toArray()

    for (const d of linkedDetections) await db.detections.delete(d.id)
    await db.objectives.delete(o.id)

    for (const d of linkedDetections) {
      await recordAuditEvent({
        entityType: 'detection',
        action: 'delete',
        entityId: d.id,
        summary: `Deleted ${d.id} (objective ${o.id} removed)`,
        before: d,
      })
    }
    await recordAuditEvent({
      entityType: 'objective',
      action: 'delete',
      entityId: o.id,
      summary: `Deleted ${o.id}`,
      before: o,
      meta: { deletedDetections: linkedDetections.map((d) => d.id) },
    })

    onDeleted(o.id)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Edit objective</div>
            <div className="mt-1 text-xs text-[rgb(var(--faint))]">{o.id}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <Label>Name</Label>
            <Input value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            <Label className="mt-3">Description</Label>
            <Textarea value={description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
            <Label className="mt-3">Rationale (optional)</Label>
            <Textarea value={rationale} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRationale(e.target.value)} />
            <div className="mt-3">
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
                <input
                  type="checkbox"
                  checked={queryAvailable}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setQueryAvailable(checked)
                    if (!checked) setQuery('')
                  }}
                />
                Query available
              </label>
              {queryAvailable ? (
                <Textarea
                  value={query}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setQuery(e.target.value)}
                  placeholder="Paste the query here (KQL, Sigma, etc.)"
                />
              ) : null}
            </div>
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
                  className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs"
                  value={severity}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSeverity(e.target.value as any)}
                >
                  {withCurrentOption(settings.severityOptions, severity).map((option) => (
                    <option key={option} value={option}>
                      {formatOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Urgency</Label>
                <select
                  className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs"
                  value={urgency}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setUrgency(e.target.value as any)}
                >
                  {withCurrentOption(settings.urgencyOptions, urgency).map((option) => (
                    <option key={option} value={option}>
                      {formatOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <Label>MITRE mapping</Label>
            <div className="mt-2 space-y-2">
              {mitre.map((m, i) => (
                <div key={`${m.technique}-${i}`} className="grid grid-cols-12 gap-2">
                  <select
                    className="col-span-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs"
                    value={m.technique}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      const t = mitreOptions.find((x) => x.technique === e.target.value)
                      setMitre((cur) =>
                        cur.map((x, idx) => (idx === i ? { ...x, technique: e.target.value, tactic: t?.tactic ?? x.tactic } : x)),
                      )
                    }}
                  >
                    {mitreOptions.map((t) => (
                      <option key={`${t.technique}|${t.tactic}`} value={t.technique}>
                        {t.technique} - {t.name} ({t.tactic})
                      </option>
                    ))}
                  </select>
                  <Input
                    className="col-span-6 mt-0"
                    value={m.tactic}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setMitre((cur) => cur.map((x, idx) => (idx === i ? { ...x, tactic: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setMitre((cur) => cur.filter((_, idx) => idx !== i))}
                    className="col-span-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-2 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMitre((cur) => [...cur, { tactic: 'Execution', technique: 'T1059' }])}
              className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
            >
              + Add mapping
            </button>

            <Label className="mt-4">Required telemetry sources</Label>
            <TelemetryPicker
              selectedIds={requiredTelemetrySources}
              onChangeSelectedIds={setRequiredTelemetrySources}
              otherTelemetrySourcesText={otherTelemetrySourcesText}
              onChangeOtherTelemetrySourcesText={setOtherTelemetrySourcesText}
              defaultCollapsed
            />

            <Label className="mt-3">Telemetry notes (optional)</Label>
            <Textarea value={telemetryNotes} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTelemetryNotes(e.target.value)} />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <select
                  className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs"
                  value={status}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as any)}
                >
                  {withCurrentOption(settings.statusOptions, status).map((option) => (
                    <option key={option} value={option}>
                      {formatOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Telemetry readiness</Label>
                <select
                  className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs"
                  value={telemetryReadiness}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setTelemetryReadiness(e.target.value as any)}
                >
                  {withCurrentOption(settings.telemetryReadinessOptions, telemetryReadiness).map((option) => (
                    <option key={option} value={option}>
                      {formatOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-[rgb(var(--border))] pt-4">
          <button
            type="button"
            onClick={del}
            className="mr-auto rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-200 hover:bg-red-950/35"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.4)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-2xl bg-[rgb(var(--accent))] px-5 py-2 text-sm font-semibold text-[rgb(var(--accent-fg))] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewObjectiveModal({ o, onClose }: { o: Objective; onClose: () => void }) {
  const telemetrySources = (o.requiredTelemetrySources ?? []).map((s) => telemetryLabel(s))
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Objective {o.id}</div>
            <div className="mt-1 text-xs text-[rgb(var(--faint))]">{o.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Description</div>
              <div className="mt-2 text-sm text-[rgb(var(--muted))]">{o.description}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Response</div>
              <div className="mt-2 text-sm text-[rgb(var(--muted))]">{o.responsePlan ?? '(not provided)'}</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Rationale</div>
              <div className="mt-2 text-sm text-[rgb(var(--muted))]">{o.rationale ?? '(not provided)'}</div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge label="Status" value={o.status} tone="status" />
              <Badge label="Telemetry" value={o.telemetryReadiness} tone="telemetry" />
              <Badge label="Severity" value={o.severity} tone="severity" />
              <Badge label="Urgency" value={o.urgency} tone="urgency" />
            </div>

            {o.queryAvailable ? (
              <div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Query</div>
                <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-xs text-[rgb(var(--text-muted))]">
                  {o.query ?? '(not provided)'}
                </pre>
              </div>
            ) : null}

            <div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">MITRE mapping</div>
              <div className="mt-2 text-sm text-[rgb(var(--muted))]">
                {(o.mitre ?? []).map((m) => `${m.tactic}/${m.technique}${m.subtechnique ? `.${m.subtechnique}` : ''}`).join(', ') || '(none)'}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Required telemetry sources</div>
              <div className="mt-2 text-sm text-[rgb(var(--muted))]">
                {telemetrySources.length ? telemetrySources.join(', ') : '(none)'}
              </div>
            </div>

            {o.otherTelemetrySources?.length ? (
              <div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Other telemetry sources</div>
                <div className="mt-2 text-sm text-[rgb(var(--muted))]">{o.otherTelemetrySources.join(', ')}</div>
              </div>
            ) : null}

            {o.telemetryNotes ? (
              <div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Telemetry notes</div>
                <div className="mt-2 text-sm text-[rgb(var(--muted))]">{o.telemetryNotes}</div>
              </div>
            ) : null}

            {o.externalReferences?.length ? (
              <div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">External references</div>
                <div className="mt-2 text-sm text-[rgb(var(--muted))]">{o.externalReferences.join(', ')}</div>
              </div>
            ) : null}
          </div>
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
      className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]"
    />
  )
}

function formatOptionLabel(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}
