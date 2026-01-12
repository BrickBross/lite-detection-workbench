import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import { parseMitreAttackStix, saveMitreTechniques, useMitreTechniques } from '../lib/mitreData'
import type { Objective } from '../lib/schemas'

export default function MitreMatrix() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState(false)
  const [importNote, setImportNote] = useState<string | null>(null)

  const mitreTechniques = useMitreTechniques()

  useEffect(() => {
    const load = async () => setObjectives(await db.objectives.toArray())
    load()
  }, [])

  const covered = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of objectives) for (const m of o.mitre) map.set(m.technique, (map.get(m.technique) ?? 0) + 1)
    return map
  }, [objectives])

  const rows = useMemo(() => {
    const filtered = mitreTechniques.filter((t) =>
      (`${t.technique} ${t.tactic} ${t.name}`).toLowerCase().includes(q.toLowerCase()),
    )
    return filtered.map((t) => ({ ...t, count: covered.get(t.technique) ?? 0 }))
  }, [q, covered, mitreTechniques])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">MITRE Matrix (Lite)</h1>
          <p className="text-sm text-zinc-400">
            Coverage indicator against your Objectives. Full ATT&CK techniques can auto-seed on first load (stored locally in IndexedDB).
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search technique, tactic, name..."
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600 md:w-96"
        />
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Import full MITRE ATT&CK (enterprise-attack.json)</div>
            <div className="mt-1 text-xs text-zinc-500">Upload the official STIX JSON to store it locally in IndexedDB.</div>
            {importNote ? <div className="mt-2 text-xs text-zinc-400">{importNote}</div> : null}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900">
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={importing}
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setImporting(true)
                setImportNote(null)
                try {
                  const text = await f.text()
                  const { techniques, warnings } = parseMitreAttackStix(text)
                  await saveMitreTechniques(techniques)
                  setImportNote(`Imported ${techniques.length} technique rows.${warnings.length ? ` Warnings: ${warnings.join(' ')}` : ''}`)
                } catch (err: any) {
                  setImportNote(`Import failed: ${err?.message ?? String(err)}`)
                } finally {
                  setImporting(false)
                  e.target.value = ''
                }
              }}
            />
            {importing ? 'Importing…' : 'Import JSON'}
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="grid grid-cols-12 gap-2 px-2 pb-2 text-xs text-zinc-500">
          <div className="col-span-2">Technique</div>
          <div className="col-span-3">Tactic</div>
          <div className="col-span-5">Name</div>
          <div className="col-span-2 text-right">Coverage</div>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={`${r.technique}|${r.tactic}`}
              className="grid grid-cols-12 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/20 px-2 py-2"
            >
              <div className="col-span-2 font-mono text-xs text-zinc-200">{r.technique}</div>
              <div className="col-span-3 text-xs text-zinc-300">{r.tactic}</div>
              <div className="col-span-5 text-xs text-zinc-400">{r.name}</div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <span className={r.count > 0 ? 'text-xs text-zinc-200' : 'text-xs text-zinc-500'}>
                  {r.count > 0 ? `${r.count} obj` : 'gap'}
                </span>
                <span
                  className={['inline-block h-2 w-2 rounded-full', r.count > 0 ? 'bg-zinc-200' : 'bg-zinc-700'].join(' ')}
                />
              </div>
            </div>
          ))}
          {rows.length === 0 ? <div className="p-4 text-sm text-zinc-500">No matches.</div> : null}
        </div>
      </div>
    </div>
  )
}
