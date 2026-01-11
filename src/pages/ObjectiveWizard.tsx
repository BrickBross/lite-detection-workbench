import { useMemo, useState } from 'react'
import { db } from '../lib/db'
import { MITRE_TECHNIQUES } from '../lib/mitre'
import { nextId, isoNow } from '../lib/ids'
import type { Objective } from '../lib/schemas'
import { Platform } from '../lib/schemas'

export default function ObjectiveWizard() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mitre, setMitre] = useState<string>('T1003')
  const [tactic, setTactic] = useState<string>('Credential Access')
  const [platforms, setPlatforms] = useState<string[]>(['sigma_generic'])
  const [status, setStatus] = useState<Objective['status']>('planned')
  const [telemetryReadiness, setTelemetryReadiness] = useState<Objective['telemetryReadiness']>('partial')
  const [rationale, setRationale] = useState('')

  const mitreOptions = useMemo(() => MITRE_TECHNIQUES, [])

  const canSave = name.trim().length >= 3 && description.trim().length >= 3 && platforms.length > 0

  const save = async () => {
    const existing = await db.objectives.toCollection().primaryKeys()
    const id = nextId('OBJ', existing as string[])
    const now = isoNow()
    const obj: Objective = {
      id,
      name: name.trim(),
      description: description.trim(),
      mitre: [{ tactic, technique: mitre }],
      platforms: platforms as any,
      status,
      telemetryReadiness,
      rationale: rationale.trim() ? rationale.trim() : undefined,
      createdAt: now,
      updatedAt: now,
    }
    await db.objectives.add(obj)
    window.location.href = '/lite-detection-workbench/objectives'
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
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Detect LSASS memory access by non-system processes" />
          <Label className="mt-3">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the attacker behavior in plain language..." />
          <Label className="mt-3">Rationale (optional)</Label>
          <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Why does this matter? What risk does it reduce?" />
        </Card>

        <Card>
          <Label>MITRE mapping (lite)</Label>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={mitre}
              onChange={(e) => {
                const t = mitreOptions.find((x) => x.technique === e.target.value)
                setMitre(e.target.value)
                if (t) setTactic(t.tactic)
              }}
            >
              {mitreOptions.map((t) => (
                <option key={t.technique} value={t.technique}>
                  {t.technique} — {t.name}
                </option>
              ))}
            </select>
            <Input value={tactic} onChange={(e) => setTactic(e.target.value)} />
          </div>

          <Label className="mt-3">Target platforms</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Platform.options.map((p) => (
              <Toggle
                key={p}
                on={platforms.includes(p)}
                label={p}
                onClick={() => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <select className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="planned">planned</option>
                <option value="blocked">blocked</option>
                <option value="implemented">implemented</option>
                <option value="tuned">tuned</option>
                <option value="validated">validated</option>
              </select>
            </div>
            <div>
              <Label>Telemetry readiness</Label>
              <select className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={telemetryReadiness} onChange={(e) => setTelemetryReadiness(e.target.value as any)}>
                <option value="available">available</option>
                <option value="partial">partial</option>
                <option value="missing">missing</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3">
        <a href="/lite-detection-workbench/objectives" className="rounded-2xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900/40">
          Cancel
        </a>
        <button
          onClick={save}
          disabled={!canSave}
          className="rounded-2xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40"
        >
          Save Objective
        </button>
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
  return <input {...props} className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600" />
}
function Textarea(props: any) {
  return <textarea {...props} rows={4} className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600" />
}
function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border px-3 py-2 text-left text-xs transition',
        on ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900/40',
      ].join(' ')}
    >
      <div className="font-semibold text-zinc-200">{label}</div>
      <div className="mt-1 text-zinc-500">{on ? 'selected' : 'click to select'}</div>
    </button>
  )
}
