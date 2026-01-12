import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { Objective } from '../lib/schemas'

type LayerTechnique = {
  techniqueID: string
  score?: number
  comment?: string
}

export default function MitreMatrix() {
  const [objectives, setObjectives] = useState<Objective[]>([])

  useEffect(() => {
    const load = async () => setObjectives(await db.objectives.toArray())
    load()
  }, [])

  const layer = useMemo(() => {
    const byTechnique = new Map<string, { count: number; objectiveIds: string[] }>()
    for (const o of objectives) {
      for (const m of o.mitre) {
        const k = m.technique
        const cur = byTechnique.get(k) ?? { count: 0, objectiveIds: [] }
        cur.count += 1
        cur.objectiveIds.push(o.id)
        byTechnique.set(k, cur)
      }
    }

    const techniques: LayerTechnique[] = Array.from(byTechnique.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([techniqueID, meta]) => ({
        techniqueID,
        score: meta.count,
        comment: `Objectives: ${Array.from(new Set(meta.objectiveIds)).join(', ')}`,
      }))

    return {
      version: '4.3',
      name: 'Lite Detection Workbench coverage',
      domain: 'enterprise-attack',
      description: 'Generated from Objectives → MITRE mappings (local-first).',
      techniques,
      gradient: {
        colors: ['#1f2937', '#e5e7eb'],
        minValue: 0,
        maxValue: Math.max(1, ...techniques.map((t) => t.score ?? 0)),
      },
      metadata: [
        { name: 'generated_by', value: 'lite-detection-workbench' },
        { name: 'generated_at', value: new Date().toISOString() },
      ],
    }
  }, [objectives])

  const downloadLayer = async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(layer, null, 2))
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attack-navigator-layer.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">MITRE ATT&CK Navigator</h1>
          <p className="text-sm text-zinc-400">
            Generate an ATT&CK Navigator layer from your Objectives and open it in the official Navigator.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <button
            onClick={downloadLayer}
            className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white"
          >
            Download layer JSON
          </button>
          <a
            className="rounded-2xl border border-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/40"
            href="https://mitre-attack.github.io/attack-navigator/"
            target="_blank"
            rel="noreferrer"
          >
            Open Navigator
          </a>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
        <div className="font-semibold">How to use</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
          <li>Click “Download layer JSON”.</li>
          <li>Open ATT&CK Navigator.</li>
          <li>Layer Controls → Open Existing Layer → upload the JSON.</li>
        </ol>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="text-xs text-zinc-500">
          Techniques mapped: <span className="text-zinc-200">{layer.techniques.length}</span> • Objectives:{' '}
          <span className="text-zinc-200">{objectives.length}</span>
        </div>
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <iframe
            title="ATT&CK Navigator"
            className="h-full w-full"
            src="https://mitre-attack.github.io/attack-navigator/"
          />
        </div>
      </div>
    </div>
  )
}

