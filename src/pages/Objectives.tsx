import type { ChangeEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { isoNow } from '../lib/ids'
import { useMitreTechniques } from '../lib/mitreData'
import type { Objective } from '../lib/schemas'
import { Platform } from '../lib/schemas'

export default function Objectives() {
  const [items, setItems] = useState<Objective[]>([])
  const [editing, setEditing] = useState<Objective | null>(null)

  useEffect(() => {
    const load = async () => setItems(await db.objectives.orderBy('updatedAt').reverse().toArray())
    load()
  }, [])

  const mitreOptions = useMitreTechniques()

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Objectives</h1>
          <p className="text-sm text-zinc-400">Define what you want to detect (before writing rules).</p>
        </div>
        <Link to="/wizard" className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white">
          New Objective
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          No objectives yet. Create one with the wizard.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((o) => (
            <div key={o.id} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs text-zinc-500">{o.id}</div>
                  <div className="text-lg font-semibold">{o.name}</div>
                  <div className="mt-1 text-sm text-zinc-400">{o.description}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge>{o.status}</Badge>
                    <Badge>{o.telemetryReadiness}</Badge>
                    {o.platforms.map((p) => (
                      <Badge key={p}>{p}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-zinc-500">Updated {new Date(o.updatedAt).toLocaleString()}</div>
                  <button
                    type="button"
                    onClick={() => setEditing(o)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/60"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                MITRE: {o.mitre.map((m) => `${m.tactic}/${m.technique}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <EditObjectiveModal
          o={editing}
          mitreOptions={mitreOptions}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setItems((cur) => cur.map((x) => (x.id === next.id ? next : x)))
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function Badge({ children }: { children: any }) {
  return <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">{children}</span>
}

function EditObjectiveModal({
  o,
  mitreOptions,
  onClose,
  onSaved,
}: {
  o: Objective
  mitreOptions: { technique: string; tactic: string; name: string }[]
  onClose: () => void
  onSaved: (o: Objective) => void
}) {
  const [name, setName] = useState(o.name)
  const [description, setDescription] = useState(o.description)
  const [rationale, setRationale] = useState(o.rationale ?? '')
  const [exabeamUseCasesText, setExabeamUseCasesText] = useState((o.exabeamUseCases ?? []).join(', '))
  const [status, setStatus] = useState<Objective['status']>(o.status)
  const [telemetryReadiness, setTelemetryReadiness] = useState<Objective['telemetryReadiness']>(o.telemetryReadiness)
  const [platforms, setPlatforms] = useState<string[]>(o.platforms as unknown as string[])
  const [mitre, setMitre] = useState(o.mitre.length ? o.mitre : [{ tactic: 'Credential Access', technique: 'T1003' }])

  const canSave = name.trim().length >= 3 && description.trim().length >= 3 && platforms.length > 0 && mitre.length > 0

  const save = async () => {
    if (!canSave) return
    const now = isoNow()
    const next: Objective = {
      ...o,
      name: name.trim(),
      description: description.trim(),
      rationale: rationale.trim() ? rationale.trim() : undefined,
      exabeamUseCases: exabeamUseCasesText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      status,
      telemetryReadiness,
      platforms: platforms as any,
      mitre,
      updatedAt: now,
    }
    await db.objectives.put(next)
    onSaved(next)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Edit objective</div>
            <div className="mt-1 text-xs text-zinc-500">{o.id}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/60"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <Label>Name</Label>
            <Input value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            <Label className="mt-3">Description</Label>
            <Textarea value={description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} />
            <Label className="mt-3">Rationale (optional)</Label>
            <Textarea value={rationale} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRationale(e.target.value)} />
            <Label className="mt-3">Exabeam use cases (optional)</Label>
            <Input value={exabeamUseCasesText} onChange={(e: ChangeEvent<HTMLInputElement>) => setExabeamUseCasesText(e.target.value)} />
          </Card>

          <Card>
            <Label>MITRE mapping</Label>
            <div className="mt-2 space-y-2">
              {mitre.map((m, i) => (
                <div key={`${m.technique}-${i}`} className="grid grid-cols-12 gap-2">
                  <select
                    className="col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"
                    value={m.technique}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      const t = mitreOptions.find((x) => x.technique === e.target.value)
                      setMitre((cur) =>
                        cur.map((x, idx) => (idx === i ? { ...x, technique: e.target.value, tactic: t?.tactic ?? x.tactic } : x)),
                      )
                    }}
                  >
                    {mitreOptions.map((t) => (
                      <option key={t.technique} value={t.technique}>
                        {t.technique} - {t.name}
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
                    className="col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900/30 px-2 py-2 text-xs text-zinc-200 hover:bg-zinc-900/60"
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
              className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/60"
            >
              + Add mapping
            </button>

            <Label className="mt-4">Platforms</Label>
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
                <select
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"
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
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"
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

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-2xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40"
          >
            Save
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
      className={[
        'mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600',
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
      className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
    />
  )
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
