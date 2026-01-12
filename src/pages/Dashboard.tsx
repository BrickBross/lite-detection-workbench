import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import { useMitreTechniques } from '../lib/mitreData'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const [counts, setCounts] = useState({ objectives: 0, signals: 0, detections: 0 })
  const [coverage, setCoverage] = useState<{ technique: string; covered: number; total: number }[]>([])
  const mitreTechniques = useMitreTechniques()

  useEffect(() => {
    const load = async () => {
      const [o, s, d] = await Promise.all([db.objectives.count(), db.signals.count(), db.detections.count()])
      setCounts({ objectives: o, signals: s, detections: d })
      const objs = await db.objectives.toArray()
      const covered = new Map<string, number>()
      for (const obj of objs) {
        for (const m of obj.mitre) {
          covered.set(m.technique, (covered.get(m.technique) ?? 0) + 1)
        }
      }
      setCoverage(
        mitreTechniques.map((t) => ({
          technique: `${t.technique} (${t.tactic})`,
          covered: covered.get(t.technique) ?? 0,
          total: 1,
        })),
      )
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mitreTechniques])

  const headline = useMemo(() => {
    if (counts.objectives === 0) return 'Start with an objective. Build detections from intent.'
    if (counts.detections === 0) return 'Good: objectives exist. Next: attach detections.'
    return 'Nice. You are building detections like an engineer.'
  }, [counts])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-zinc-400">Lite Detection Workbench</div>
            <h1 className="mt-1 text-2xl font-semibold">{headline}</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Local-first detection engineering with export-to-Git workflows. Inspired by OpenTide concepts (objectives,
              signals, coverage), optimized for speed and portability.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 md:mt-0">
            <Stat label="Objectives" value={counts.objectives} />
            <Stat label="Signals" value={counts.signals} />
            <Stat label="Detections" value={counts.detections} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">MITRE coverage (lite)</h2>
          <p className="mt-1 text-xs text-zinc-500">A small starter set of techniques; extend in src/lib/mitre.ts</p>
          <div className="mt-4 space-y-3">
            {coverage.map((c) => (
              <div key={c.technique} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{c.technique}</span>
                  <span>{c.covered ? 'covered' : 'gap'}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-900 ring-1 ring-zinc-800">
                  <motion.div
                    className="h-2 rounded-full bg-zinc-200/70"
                    initial={{ width: 0 }}
                    animate={{ width: c.covered ? '100%' : '8%' }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Next best actions</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <Action title="Create a detection objective" desc="Use the wizard to capture the what, why, and prerequisites." to="/wizard" />
            <Action title="Attach detections" desc="Generate Sigma/KQL/CrowdStrike starter templates and tune them." to="/build" />
            <Action title="Export to Git" desc="Generate a repo-shaped zip ready to commit from VS Code." to="/export" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

function Action({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <a href={to} className="block rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:bg-zinc-900/40 hover:ring-1 hover:ring-zinc-700">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-xs text-zinc-500">{desc}</div>
    </a>
  )
}
