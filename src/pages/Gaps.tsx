import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { Detection, Objective } from '../lib/schemas'

export default function Gaps() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [detections, setDetections] = useState<Detection[]>([])

  useEffect(() => {
    const load = async () => {
      setObjectives(await db.objectives.toArray())
      setDetections(await db.detections.toArray())
    }
    load()
  }, [])

  const detByObj = useMemo(() => {
    const m = new Map<string, Detection[]>()
    for (const d of detections) m.set(d.objectiveId, [...(m.get(d.objectiveId) ?? []), d])
    return m
  }, [detections])

  const rows = useMemo(() => {
    return objectives.map((o) => {
      const ds = detByObj.get(o.id) ?? []
      const hasDetections = ds.length > 0
      const missingSignals = ds.some(d => (d.signalIds ?? []).length === 0)
      const missingTestPlan = ds.some(d => !d.testPlan || d.testPlan.trim().length < 10)
      const missingFP = ds.some(d => !d.falsePositives || d.falsePositives.trim().length < 10)

      const flags = [
        !hasDetections ? 'no detections' : null,
        missingSignals ? 'detections missing signals' : null,
        missingTestPlan ? 'missing test plan' : null,
        missingFP ? 'missing FP notes' : null,
      ].filter(Boolean) as string[]

      return { id: o.id, name: o.name, flags, count: ds.length }
    }).filter(r => r.flags.length > 0)
      .sort((a,b) => b.flags.length - a.flags.length)
  }, [objectives, detByObj])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Gaps</h1>
        <p className="text-sm text-zinc-400">Find objectives that are blocked by missing telemetry or incomplete detections.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          No gaps found (nice). Create more objectives to see recommendations.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-xs text-zinc-500">{r.id}</div>
              <div className="text-lg font-semibold">{r.name}</div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {r.flags.map((f) => <Badge key={f}>{f}</Badge>)}
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{r.count} detections</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
        Next: add Signals, then in <span className="text-zinc-200">Build</span> attach Signals to detections and write a test plan + FP notes.
      </div>
    </div>
  )
}

function Badge({ children }: { children: any }) {
  return <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">{children}</span>
}
