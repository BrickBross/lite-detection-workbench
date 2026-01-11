import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import type { Objective } from '../lib/schemas'

export default function Objectives() {
  const [items, setItems] = useState<Objective[]>([])

  useEffect(() => {
    const load = async () => setItems(await db.objectives.orderBy('updatedAt').reverse().toArray())
    load()
    const sub = db.on('changes', load)
    return () => sub.unsubscribe()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Objectives</h1>
          <p className="text-sm text-zinc-400">Define what you want to detect (before writing rules).</p>
        </div>
        <a
          href="/lite-detection-workbench/wizard"
          className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white"
        >
          New Objective
        </a>
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
                <div className="text-xs text-zinc-500">
                  Updated {new Date(o.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                MITRE: {o.mitre.map((m) => `${m.tactic}/${m.technique}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Badge({ children }: { children: any }) {
  return <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">{children}</span>
}
