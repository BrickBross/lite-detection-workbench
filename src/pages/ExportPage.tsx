import { useEffect, useMemo, useState } from 'react'
import { recordAuditEvent } from '../lib/audit'
import { db } from '../lib/db'
import { isoNow } from '../lib/ids'
import type { ExportPayload } from '../lib/exportTypes'
import { TELEMETRY_ROWS } from '../lib/telemetryCatalog'
import type { Detection, Objective, ProjectMeta, Signal } from '../lib/schemas'

export default function ExportPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [detections, setDetections] = useState<Detection[]>([])
  const [downloading, setDownloading] = useState(false)

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

  const exportJson = async () => {
    setDownloading(true)
    try {
      const payload: ExportPayload = { meta, objectives, signals, detections }
      const enriched = {
        ...payload,
        telemetryCatalog: {
          sources: TELEMETRY_ROWS,
        },
      }

      const json = JSON.stringify(enriched, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lite-detection-workbench-export.json`
      a.click()
      URL.revokeObjectURL(url)

      await recordAuditEvent({
        entityType: 'export',
        action: 'export',
        summary: `Exported lite-detection-workbench-export.json`,
        meta: {
          format: 'json',
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
        <p className="text-sm text-[rgb(var(--muted))]">Download a single JSON file containing your project data.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Objectives" value={objectives.length} />
        <Stat label="Signals" value={signals.length} />
        <Stat label="Detections" value={detections.length} />
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Export as JSON</div>
            <div className="mt-1 text-xs text-[rgb(var(--faint))]">
              Includes objectives, signals, detections, and a telemetry catalog snapshot (for resolving telemetry ids).
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={exportJson}
              disabled={downloading}
              className="w-full rounded-2xl bg-[rgb(var(--accent))] px-5 py-2 text-sm font-semibold text-[rgb(var(--accent-fg))] disabled:opacity-40 md:w-auto"
            >
              {downloading ? 'Building…' : 'Download JSON'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
      <div className="text-xs text-[rgb(var(--faint))]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

