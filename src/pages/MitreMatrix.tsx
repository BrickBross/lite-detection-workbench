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
        const key = m.technique
        const cur = byTechnique.get(key) ?? { count: 0, objectiveIds: [] }
        cur.count += 1
        cur.objectiveIds.push(o.id)
        byTechnique.set(key, cur)
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
      description: 'Generated from Objectives + MITRE mappings (local-first).',
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

  const downloadLayer = () => {
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
          <p className="text-sm text-[rgb(var(--muted))]">
            Generate an ATT&CK Navigator layer from your Objectives and open it in the official Navigator.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <button
            onClick={downloadLayer}
            className="rounded-2xl bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-[rgb(var(--accent-fg))] hover:bg-[rgb(var(--accent)/0.9)]"
          >
            Download layer JSON
          </button>
          <a
            className="rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.4)]"
            href="https://mitre-attack.github.io/attack-navigator/"
            target="_blank"
            rel="noreferrer"
          >
            Open Navigator
          </a>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-sm text-[rgb(var(--text-muted))]">
        <div className="font-semibold">How to use</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[rgb(var(--muted))]">
          <li>Download the layer JSON.</li>
          <li>Open ATT&CK Navigator.</li>
          <li>Layer Controls → Open Existing Layer → upload the JSON.</li>
        </ol>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
        <div className="text-xs text-[rgb(var(--faint))]">
          Techniques mapped: <span className="text-[rgb(var(--text))]">{layer.techniques.length}</span> • Objectives:{' '}
          <span className="text-[rgb(var(--text))]">{objectives.length}</span>
        </div>
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-black">
          <iframe title="ATT&CK Navigator" className="h-full w-full" src="https://mitre-attack.github.io/attack-navigator/" />
        </div>
      </div>
    </div>
  )
}
