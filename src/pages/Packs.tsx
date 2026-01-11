import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { Detection } from '../lib/schemas'

type Pack = {
  platform: string
  count: number
  description: string
}

const DESCRIPTIONS: Record<string, string> = {
  sigma: 'Portable rules to compile into SIEM backends. Great for sharing and review.',
  kql: 'Microsoft Sentinel/Security tooling. Ideal for M365 & cloud-first environments.',
  crowdstrike_siem: 'CrowdStrike SIEM oriented logic and query starters.',
  crowdstrike_edr: 'CrowdStrike EDR behavior detection notes and pivots.',
  exabeam_cim: 'Exabeam-aligned detection content with CIM normalization notes.',
}

export default function Packs() {
  const [detections, setDetections] = useState<Detection[]>([])

  useEffect(() => {
    const load = async () => setDetections(await db.detections.toArray())
    load()
    const sub = db.on('changes', load)
    return () => sub.unsubscribe()
  }, [])

  const packs = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of detections) m.set(d.platform, (m.get(d.platform) ?? 0) + 1)
    return Array.from(m.entries())
      .map(([platform, count]) => ({ platform, count, description: DESCRIPTIONS[platform] ?? 'Detection bundle for this platform.' } as Pack))
      .sort((a,b) => b.count - a.count)
  }, [detections])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Platform Packs</h1>
        <p className="text-sm text-zinc-400">A “pack” is a curated export bundle per platform (created on Export).</p>
      </div>

      {packs.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          No detections yet. Create some detections first.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {packs.map((p) => (
            <div key={p.platform} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{p.platform}</div>
                  <div className="mt-1 text-sm text-zinc-400">{p.description}</div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 px-3 py-2 text-xs text-zinc-300">{p.count} detections</div>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                Export will generate: <span className="text-zinc-300">bundles/{p.platform}/</span>, <span className="text-zinc-300">bundles/all-detections.md</span>, <span className="text-zinc-300">bundles/bundle-summary.md</span>, and <span className="text-zinc-300">bundles/manifests/*.json</span>.
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
        Go to <span className="text-zinc-200">Export</span> → enable “Include bundles” → download ZIP → push to GitHub.
      </div>
    </div>
  )
}
