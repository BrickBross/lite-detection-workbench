import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { Objective, Detection, Signal } from '../lib/schemas'
import { nextId, isoNow } from '../lib/ids'

type Template = {
  id: string
  title: string
  description: string
  platforms: Detection['platform'][]
  build: (o: Objective) => Partial<Detection>
}

const templates: Template[] = [
  {
    id: 'sigma_process_suspicious',
    title: 'Sigma: suspicious process execution (starter)',
    description: 'Great for initial hypotheses; tune with allowlists and context.',
    platforms: ['sigma_generic'],
    build: (o) => ({
      platform: 'sigma_generic',
      title: `${o.name} (Sigma starter)`,
      content: `title: ${o.name}
status: experimental
description: ${o.description}
references: []
author: lite-detection-workbench
tags:
  - attack.${o.mitre[0]?.tactic?.toLowerCase().replace(/\s+/g, '_') ?? 'tactic'}
  - attack.${o.mitre[0]?.technique ?? 'T0000'}
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith:
      - \\rundll32.exe
  condition: selection
falsepositives:
  - Administrative activity
level: medium
`,
      testPlan: 'Replay a known benign case and at least one simulated malicious case; document FPs.',
    }),
  },
  {
    id: 'kql_auth_anomaly',
    title: 'KQL: auth anomaly (starter)',
    description: 'Baseline or policy-violation style query skeleton for Sentinel.',
    platforms: ['sentinel_kql'],
    build: (o) => ({
      platform: 'sentinel_kql',
      title: `${o.name} (KQL starter)`,
      content: `// ${o.name}
// Objective: ${o.id}
// MITRE: ${o.mitre.map((m) => `${m.tactic}/${m.technique}`).join(', ')}

let lookback = 24h;
let threshold = 5;

SigninLogs
| where TimeGenerated >= ago(lookback)
| summarize Attempts=count() by UserPrincipalName, IPAddress
| where Attempts >= threshold
| project TimeGenerated=now(), UserPrincipalName, IPAddress, Attempts
`,
      testPlan: 'Validate schema/table names in your tenant; confirm expected baseline volumes.',
    }),
  },
  {
    id: 'cs_siem_api_abuse',
    title: 'CrowdStrike SIEM: API abuse (starter)',
    description: 'High-level starter to capture suspicious API patterns (adjust for your event schema).',
    platforms: ['crowdstrike_siem'],
    build: (o) => ({
      platform: 'crowdstrike_siem',
      title: `${o.name} (CrowdStrike SIEM starter)`,
      content: `# ${o.name}
# Objective: ${o.id}
# NOTE: This is a starter placeholder. Replace with CrowdStrike SIEM query/rule format used in your environment.
metadata:
  owner: detections
  severity: medium
logic:
  type: correlation
  description: Detect suspicious API pattern
  placeholder: true
tuning:
  allowlists: []
`,
      testPlan: 'Confirm exact CrowdStrike SIEM rule/query schema; replace placeholder with valid format.',
    }),
  },
  {
    id: 'cs_edr_process_injection',
    title: 'CrowdStrike EDR: process injection (starter)',
    description: 'Starter notes for an EDR telemetry-based detection, to be adapted to your EDR queries.',
    platforms: ['crowdstrike_edr'],
    build: (o) => ({
      platform: 'crowdstrike_edr',
      title: `${o.name} (CrowdStrike EDR starter)`,
      content: `# ${o.name}
# Objective: ${o.id}
# NOTE: Replace with your CrowdStrike Falcon detection / query approach (e.g., Event Search, custom IOA/IOCs).
edr_strategy:
  intent: Detect suspicious memory access / injection patterns
  entities:
    - source_process
    - target_process
  signals:
    - process_access
    - unsigned_module_load
    - suspicious_callstack (if available)
prereqs:
  - Ensure relevant EDR telemetry is retained and searchable.
`,
      testPlan: 'Simulate benign and malicious process access scenarios; validate coverage & FP rate.',
    }),
  },
  {
    id: 'exabeam_cim_note',
    title: 'Exabeam CIM: normalization notes (starter)',
    description: 'Create CIM-aligned detection notes + field mapping checklist.',
    platforms: ['exabeam_cim'],
    build: (o) => ({
      platform: 'exabeam_cim',
      title: `${o.name} (Exabeam CIM notes)`,
      content: `# ${o.name}
# Objective: ${o.id}

cim_alignment:
  required_entities:
    - actor.user
    - actor.ip
    - target.host
    - process.name
    - process.command_line
  mapping_notes:
    - Identify source fields for CrowdStrike / Windows logs -> map into CIM
    - Validate parsing and normalization in pipeline before enabling detection logic
detection_logic:
  placeholder: true
`,
      testPlan: 'Verify CIM fields are populated for at least 7 days of telemetry before enabling alerts.',
    }),
  },
]

export default function DetectionBuilder() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [objectiveId, setObjectiveId] = useState<string>('')
  const [templateId, setTemplateId] = useState<string>(templates[0].id)
  const [preview, setPreview] = useState<Partial<Detection> | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [selectedSignals, setSelectedSignals] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      const objs = await db.objectives.orderBy('updatedAt').reverse().toArray()
      setSignals(await db.signals.orderBy('updatedAt').reverse().toArray())
      setObjectives(objs)
      if (!objectiveId && objs[0]) setObjectiveId(objs[0].id)
    }
    load()
    const sub = db.on('changes', load)
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedObjective = useMemo(() => objectives.find((o) => o.id === objectiveId) ?? null, [objectives, objectiveId])
  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId)!, [templateId])

  useEffect(() => {
    if (!selectedObjective) return setPreview(null)
    setPreview(selectedTemplate.build(selectedObjective))
  }, [selectedObjective, selectedTemplate])

  const save = async () => {
    if (!selectedObjective || !preview) return
    const existing = await db.detections.toCollection().primaryKeys()
    const id = nextId('RULE', existing as string[])
    const now = isoNow()
    const det: Detection = {
      id,
      objectiveId: selectedObjective.id,
      signalIds: selectedSignals,
      platform: preview.platform!,
      title: preview.title ?? `${selectedObjective.name} (${preview.platform})`,
      severity: (preview.severity ?? 'medium') as any,
      content: preview.content ?? '',
      tuningNotes: preview.tuningNotes,
      falsePositives: preview.falsePositives,
      testPlan: preview.testPlan,
      createdAt: now,
      updatedAt: now,
    }
    await db.detections.add(det)
    window.location.href = '/lite-detection-workbench/detections'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Build detections</h1>
        <p className="text-sm text-zinc-400">Turn an objective into starter detections for Sigma / KQL / CrowdStrike / Exabeam notes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Label>Objective</Label>
          <select
            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={objectiveId}
            onChange={(e) => setObjectiveId(e.target.value)}
          >
            {objectives.length === 0 ? <option value="">No objectives yet</option> : null}
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {o.name}
              </option>
            ))}
          </select>

          <Label className="mt-3">Template</Label>
          <select
            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
            {selectedTemplate.description}
          </div>

<Label className="mt-3">Signals (optional)</Label>
<div className="mt-2 max-h-40 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-300">
  {signals.length === 0 ? (
    <div className="p-2 text-zinc-500">No signals yet. Add some in Signals.</div>
  ) : (
    <div className="space-y-2 p-2">
      {signals.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={selectedSignals.includes(s.id)}
            onChange={(e) => {
              setSelectedSignals((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))
            }}
          />
          <span className="text-zinc-200">{s.id}</span>
          <span className="text-zinc-500">—</span>
          <span className="truncate">{s.name}</span>
        </label>
      ))}
    </div>
  )}
</div>

<div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={save}
              disabled={!selectedObjective}
              className="rounded-2xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40"
            >
              Save detection
            </button>
          </div>
        </Card>

        <Card>
          <Label>Preview</Label>
          {!preview ? (
            <div className="mt-3 text-sm text-zinc-400">Create an objective first.</div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-semibold">{preview.title}</div>
              <div className="text-xs text-zinc-500">Platform: {preview.platform}</div>
              <pre className="mt-2 max-h-[420px] overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">
                {preview.content}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({ children }: any) {
  return <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">{children}</div>
}
function Label({ children }: any) {
  return <div className="text-xs font-semibold text-zinc-300">{children}</div>
}
