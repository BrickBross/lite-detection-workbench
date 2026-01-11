import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { Detection, Objective, Signal } from '../lib/schemas'
import { isoNow } from '../lib/ids'

export default function Detections() {
  const [detections, setDetections] = useState<Detection[]>([])
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [editing, setEditing] = useState<Detection | null>(null)

  useEffect(() => {
    const load = async () => {
      setDetections(await db.detections.orderBy('updatedAt').reverse().toArray())
      setObjectives(await db.objectives.toArray())
      setSignals(await db.signals.toArray())
    }
    load()
  }, [])

  const objMap = useMemo(() => new Map(objectives.map((o) => [o.id, o.name])), [objectives])
  const sigMap = useMemo(() => new Map(signals.map((s) => [s.id, s.name])), [signals])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Detections</h1>
          <p className="text-sm text-zinc-400">Review, edit, and score detections before export.</p>
        </div>
        <a href="/lite-detection-workbench/build" className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white">
          New (Build)
        </a>
      </div>

      {detections.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">No detections yet.</div>
      ) : (
        <div className="grid gap-3">
          {detections.map((d) => (
            <div key={d.id} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs text-zinc-500">{d.id}</div>
                  <div className="text-lg font-semibold">{d.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {d.platform} • {d.severity} • {d.objectiveId} — {objMap.get(d.objectiveId) ?? 'Unknown objective'}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Signals: {d.signalIds.length ? d.signalIds.map((id) => sigMap.get(id) ?? id).join(', ') : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ScorePill score={scoreDetection(d)} />
                  <button onClick={() => setEditing(d)} className="rounded-2xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900/40">Edit</button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete ${d.id}?`)) return
                      await db.detections.delete(d.id)
                    }}
                    className="rounded-2xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900/40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <pre className="mt-4 max-h-56 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">{d.content}</pre>
            </div>
          ))}
        </div>
      )}

      {editing ? <EditModal d={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

function scoreDetection(d: Detection) {
  let score = 0
  if (d.title.trim().length >= 8) score += 15
  if (d.content.trim().length >= 80) score += 25
  if (d.signalIds.length >= 1) score += 15
  if (d.falsePositives && d.falsePositives.trim().length >= 10) score += 10
  if (d.testPlan && d.testPlan.trim().length >= 10) score += 15
  if (d.tuningNotes && d.tuningNotes.trim().length >= 10) score += 10
  if (d.platform === 'sigma_generic' && d.content.includes('detection:')) score += 10
  return Math.min(100, score)
}

function ScorePill({ score }: { score: number }) {
  const label = score >= 80 ? 'ship' : score >= 55 ? 'draft' : 'fragile'
  return (
    <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200">
      {label} • {score}
    </span>
  )
}

function EditModal({ d, onClose }: { d: Detection; onClose: () => void }) {
  const [title, setTitle] = useState(d.title)
  const [severity, setSeverity] = useState(d.severity)
  const [content, setContent] = useState(d.content)
  const [falsePositives, setFalsePositives] = useState(d.falsePositives ?? '')
  const [tuningNotes, setTuningNotes] = useState(d.tuningNotes ?? '')
  const [testPlan, setTestPlan] = useState(d.testPlan ?? '')

  const save = async () => {
    await db.detections.update(d.id, {
      title,
      severity,
      content,
      falsePositives,
      tuningNotes,
      testPlan,
      updatedAt: isoNow(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Edit {d.id}</div>
            <div className="mt-1 text-xs text-zinc-500">{d.platform} • {d.objectiveId}</div>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900/40">Close</button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Field label="Title"><Input value={title} onChange={(e:any) => setTitle(e.target.value)} /></Field>
            <Field label="Severity">
              <select className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={severity} onChange={(e:any) => setSeverity(e.target.value)}>
                {['low','medium','high','critical'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="False positives"><Textarea value={falsePositives} onChange={(e:any) => setFalsePositives(e.target.value)} /></Field>
            <Field label="Tuning notes"><Textarea value={tuningNotes} onChange={(e:any) => setTuningNotes(e.target.value)} /></Field>
            <Field label="Test plan"><Textarea value={testPlan} onChange={(e:any) => setTestPlan(e.target.value)} /></Field>
          </div>
          <div>
            <Field label="Content"><Textarea rows={18} value={content} onChange={(e:any) => setContent(e.target.value)} /></Field>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-2xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900/40">Cancel</button>
          <button onClick={save} className="rounded-2xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-white">Save</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return (<div><div className="text-xs font-semibold text-zinc-300">{label}</div><div className="mt-2">{children}</div></div>) }
function Input(props: any) { return <input {...props} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600" /> }
function Textarea(props: any) { const { rows = 4, ...rest } = props; return <textarea {...rest} rows={rows} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600" /> }
