import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { Objective } from '../lib/schemas'

type Strategy = {
  title: string
  whenToUse: string
  telemetry: string[]
  tuning: string[]
  outputs: string[]
}

const STRATEGIES: Strategy[] = [
  {
    title: 'Policy violation (should-never-happen)',
    whenToUse: 'Best when you can define a clean allowlist/denylist and the behavior is rare by design.',
    telemetry: ['Identity + admin audit logs', 'EDR process events', 'Cloud audit'],
    tuning: ['Maintain allowlists', 'Scope to crown-jewel assets/accounts', 'Add maintenance windows'],
    outputs: ['High-confidence alerts', 'Low FP when scoped'],
  },
  {
    title: 'Sequence / correlation',
    whenToUse: 'When one signal is noisy but a sequence becomes meaningful (A then B within N minutes).',
    telemetry: ['SIEM correlation', 'EDR + identity logs'],
    tuning: ['Choose time windows', 'Link by same user/host', 'Suppress known workflows'],
    outputs: ['Higher fidelity than single-event rules'],
  },
  {
    title: 'Rarity / baseline',
    whenToUse: 'For new/unusual behavior: first-time admin action, rare API call, new process tree.',
    telemetry: ['Historical logs', 'Stable entity identifiers'],
    tuning: ['Exclude noisy tenants', 'Use rolling baselines', 'Tune thresholds'],
    outputs: ['Great at surfacing novel TTPs'],
  },
  {
    title: 'Direct indicator match (starter)',
    whenToUse: 'Fastest to build with known bads (paths, args, domains), but can be brittle.',
    telemetry: ['Process creation', 'DNS/Proxy', 'Cloud audit'],
    tuning: ['Prefer behavior over static IOCs', 'Keep allowlists', 'Watch for drift'],
    outputs: ['Quick wins; iterate to behavior'],
  },
]

export default function Assistant() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [objectiveId, setObjectiveId] = useState('')

  useEffect(() => {
    const load = async () => {
      const objs = await db.objectives.orderBy('updatedAt').reverse().toArray()
      setObjectives(objs)
      if (!objectiveId && objs[0]) setObjectiveId(objs[0].id)
    }
    load()
    const sub = db.on('changes', load)
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const obj = useMemo(() => objectives.find((o) => o.id === objectiveId) ?? null, [objectives, objectiveId])
  const recs = useMemo(() => (obj ? suggestStrategies(obj) : STRATEGIES), [obj])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Detection Assistant (Lite)</h1>
        <p className="text-sm text-zinc-400">A guided worksheet for when you don’t yet know how to detect it. No LLM required.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Label>Objective</Label>
          <select className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
            {objectives.length === 0 ? <option value="">No objectives yet</option> : null}
            {objectives.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.name}</option>)}
          </select>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3 text-xs text-zinc-500">
            <div className="font-semibold text-zinc-300">How to use</div>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Pick an objective.</li>
              <li>Select a strategy on the right and capture telemetry requirements as Signals.</li>
              <li>Generate Sigma/KQL/CrowdStrike/Exabeam starters in <span className="text-zinc-200">Build</span>.</li>
            </ol>
          </div>
        </Card>

        <Card>
          <Label>Recommended strategies</Label>
          <div className="mt-3 space-y-3">
            {recs.map((s) => (
              <div key={s.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3">
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-zinc-500">{s.whenToUse}</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <Mini title="Telemetry">{s.telemetry.map((t) => <li key={t}>{t}</li>)}</Mini>
                  <Mini title="Tuning">{s.tuning.map((t) => <li key={t}>{t}</li>)}</Mini>
                </div>
                <div className="mt-2 text-xs text-zinc-500">Outputs: {s.outputs.join(' • ')}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function suggestStrategies(o: Objective): Strategy[] {
  const text = `${o.name} ${o.description}`.toLowerCase()
  if (text.includes('auth') || text.includes('signin') || text.includes('oauth') || text.includes('token')) return [STRATEGIES[2], STRATEGIES[0], STRATEGIES[1]]
  if (text.includes('process') || text.includes('lsass') || text.includes('memory') || text.includes('injection')) return [STRATEGIES[1], STRATEGIES[0], STRATEGIES[3]]
  return [STRATEGIES[0], STRATEGIES[1], STRATEGIES[2], STRATEGIES[3]]
}

function Card({ children }: any) { return <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">{children}</div> }
function Label({ children }: any) { return <div className="text-xs font-semibold text-zinc-300">{children}</div> }
function Mini({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
      <div className="text-[11px] font-semibold text-zinc-400">{title}</div>
      <ul className="mt-1 list-disc pl-5 text-[11px] text-zinc-500">{children}</ul>
    </div>
  )
}
