import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../lib/db'
import { recordAuditEvent } from '../lib/audit'
import type { ExportOptions, ExportPayload } from '../lib/exportTypes'
import { isoNow } from '../lib/ids'
import type { Detection, Objective, ProjectMeta, Signal } from '../lib/schemas'

export default function ExportPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [detections, setDetections] = useState<Detection[]>([])
  const [downloading, setDownloading] = useState(false)

  const [includeBundles, setIncludeBundles] = useState(true)
  const [includeManifests, setIncludeManifests] = useState(true)
  const [includePrompts, setIncludePrompts] = useState(true)

  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const load = async () => {
      setObjectives(await db.objectives.toArray())
      setSignals(await db.signals.toArray())
      setDetections(await db.detections.toArray())
    }
    load()
  }, [])

  const meta: ProjectMeta = useMemo(
    () => ({
      version: '0.1.0',
      name: 'lite-detection-workbench',
      createdAt: objectives[0]?.createdAt ?? isoNow(),
      updatedAt: isoNow(),
    }),
    [objectives],
  )

  const exportZip = async () => {
    setDownloading(true)
    try {
      if (!workerRef.current) workerRef.current = new Worker(new URL('../workers/exporter.ts', import.meta.url), { type: 'module' })
      const worker = workerRef.current

      const payload: ExportPayload = { meta, objectives, signals, detections }
      const repoName = 'lite-detection-workbench-export'
      const options: ExportOptions = {
        includeBundles,
        includeManifests,
        includePrompts,
      }

      const bytes: Uint8Array = await new Promise((resolve, reject) => {
        const onMsg = (ev: MessageEvent<any>) => {
          if (ev.data?.ok) {
            worker.removeEventListener('message', onMsg)
            resolve(new Uint8Array(ev.data.bytes))
          } else reject(new Error('Export failed'))
        }
        worker.addEventListener('message', onMsg)
        worker.postMessage({ payload, repoName, options })
      })

      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${repoName}.zip`
      a.click()
      URL.revokeObjectURL(url)

      await recordAuditEvent({
        entityType: 'export',
        action: 'export',
        summary: `Exported ${repoName}.zip`,
        meta: {
          repoName,
          options,
          counts: { objectives: objectives.length, signals: signals.length, detections: detections.length },
        },
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Export</h1>
        <p className="text-sm text-zinc-400">Generate a repo-shaped zip you can unzip and commit with VS Code.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Objectives" value={objectives.length} />
        <Stat label="Signals" value={signals.length} />
        <Stat label="Detections" value={detections.length} />
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Generate Detection Bundle (ZIP)</div>
            <div className="mt-1 text-xs text-zinc-500">
              Always includes <span className="text-zinc-300">project/</span>, <span className="text-zinc-300">objectives/</span>,{' '}
              <span className="text-zinc-300">signals/</span>, <span className="text-zinc-300">detections/</span>, and{' '}
              <span className="text-zinc-300">docs/</span>.
            </div>

            <div className="mt-4 grid gap-3 text-sm">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={includeBundles} onChange={(e) => setIncludeBundles(e.target.checked)} />
                <span className="text-zinc-300">Include bundles (packs + all-detections + summary)</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeManifests}
                  onChange={(e) => setIncludeManifests(e.target.checked)}
                />
                <span className="text-zinc-300">Include manifests (JSON indexes for pipelines)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={includePrompts} onChange={(e) => setIncludePrompts(e.target.checked)} />
                <span className="text-zinc-300">Include prompt pack (.github/prompts/)</span>
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400">
              <div className="font-semibold text-zinc-300">What you get</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <span className="text-zinc-300">bundles/</span> (optional): <span className="text-zinc-300">all-detections.md</span>,{' '}
                  <span className="text-zinc-300">bundle-summary.md</span>, <span className="text-zinc-300">&lt;platform&gt;/</span>
                </li>
                <li>
                  <span className="text-zinc-300">bundles/manifests/</span> (optional): <span className="text-zinc-300">all.json</span>,{' '}
                  <span className="text-zinc-300">&lt;platform&gt;.json</span>
                </li>
                <li>
                  <span className="text-zinc-300">.github/prompts/</span> (optional): generation prompts for Sigma/KQL/Exabeam/CrowdStrike
                </li>
              </ul>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={exportZip}
              disabled={downloading}
              className="w-full rounded-2xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40 md:w-auto"
            >
              {downloading ? 'Building ZIP…' : 'Download ZIP'}
            </button>
            <div className="mt-2 text-xs text-zinc-500">Tip: commit the unzipped folder to a new repo for export-to-Git workflows.</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
        <div className="font-semibold">Recommended workflow</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
          <li>Download zip and unzip to a folder.</li>
          <li>Open folder in VS Code.</li>
          <li>Review/edit generated YAML and rule content.</li>
          <li>Commit and push to your GitHub repo.</li>
        </ol>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
