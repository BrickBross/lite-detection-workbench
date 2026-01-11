import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { Detection, Objective } from '../lib/schemas'
import { motion } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie } from 'recharts'

export default function Coverage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [detections, setDetections] = useState<Detection[]>([])

  useEffect(() => {
    const load = async () => {
      setObjectives(await db.objectives.toArray())
      setDetections(await db.detections.toArray())
    }
    load()
  }, [])

  const byPlatform = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of detections) m.set(d.platform, (m.get(d.platform) ?? 0) + 1)
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
  }, [detections])

  const bySeverity = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of detections) m.set(d.severity, (m.get(d.severity) ?? 0) + 1)
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
  }, [detections])

  const objectiveCoverage = useMemo(() => {
    const detByObj = new Map<string, number>()
    for (const d of detections) detByObj.set(d.objectiveId, (detByObj.get(d.objectiveId) ?? 0) + 1)
    const covered = objectives.filter(o => (detByObj.get(o.id) ?? 0) > 0).length
    return { covered, total: objectives.length, gaps: Math.max(0, objectives.length - covered) }
  }, [objectives, detections])

  const kpi = [
    { title: 'Objectives', value: `${objectiveCoverage.total}`, sub: `${objectiveCoverage.covered} covered • ${objectiveCoverage.gaps} gaps` },
    { title: 'Detections', value: `${detections.length}`, sub: 'Total detection artifacts' },
    { title: 'Platforms', value: `${byPlatform.length}`, sub: 'Where detections exist' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Coverage</h1>
        <p className="text-sm text-zinc-400">Animated visibility across platforms, severity, and objective coverage.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {kpi.map((k, i) => (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="text-xs font-semibold text-zinc-400">{k.title}</div>
            <div className="mt-2 text-2xl font-semibold">{k.value}</div>
            <div className="mt-1 text-xs text-zinc-500">{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm font-semibold">Detections by platform</div>
          <div className="mt-3 h-64">
            {byPlatform.length === 0 ? (
              <div className="text-sm text-zinc-500">No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlatform}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm font-semibold">Detections by severity</div>
          <div className="mt-3 h-64">
            {bySeverity.length === 0 ? (
              <div className="text-sm text-zinc-500">No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bySeverity} dataKey="value" nameKey="name" outerRadius={90} label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 text-xs text-zinc-500">Tip: aim for severity consistency across platforms.</div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
        Next: use <span className="text-zinc-200">Gaps</span> to find objectives blocked by telemetry or incomplete detections.
      </motion.div>
    </div>
  )
}
