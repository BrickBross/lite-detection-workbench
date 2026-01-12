import { useEffect, useMemo, useState } from 'react'
import { db } from './db'
import { MITRE_TECHNIQUES } from './mitre'

export type MitreTechniqueLite = {
  technique: string
  tactic: string
  name: string
}

export type MitreTechniqueRecord = MitreTechniqueLite & {
  id: string
}

let seedPromise: Promise<void> | null = null

function titleCaseFromPhase(phase: string) {
  return phase
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

async function ensureMitreSeeded() {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    const count = await db.mitreTechniques.count()
    if (count > 0) return

    const url = `${import.meta.env.BASE_URL}enterprise-attack.json`
    const res = await fetch(url)
    if (!res.ok) return

    const text = await res.text()
    const { techniques } = parseMitreAttackStix(text)
    if (!techniques.length) return
    await saveMitreTechniques(techniques)
  })()
  return seedPromise
}

export function useMitreTechniques() {
  const [rows, setRows] = useState<MitreTechniqueLite[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await ensureMitreSeeded()
      const stored = await db.mitreTechniques.toArray()
      if (cancelled) return
      if (stored.length) setRows(stored.map(({ technique, tactic, name }) => ({ technique, tactic, name })))
      else setRows(null)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => rows ?? MITRE_TECHNIQUES, [rows])
}

export function parseMitreAttackStix(jsonText: string): { techniques: MitreTechniqueRecord[]; warnings: string[] } {
  const warnings: string[] = []
  let doc: any
  try {
    doc = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid JSON (failed to parse)')
  }

  const objects: any[] = Array.isArray(doc?.objects) ? doc.objects : []
  if (!objects.length) warnings.push('No STIX objects[] found; expected enterprise-attack.json format.')

  const out = new Map<string, MitreTechniqueRecord>()

  for (const obj of objects) {
    if (obj?.type !== 'attack-pattern') continue
    const name = typeof obj?.name === 'string' ? obj.name : null
    if (!name) continue

    const refs: any[] = Array.isArray(obj?.external_references) ? obj.external_references : []
    const mitreRef = refs.find((r) => r?.source_name === 'mitre-attack' && typeof r?.external_id === 'string')
    const techniqueId: string | null = mitreRef?.external_id ?? null
    if (!techniqueId) continue

    const phases: any[] = Array.isArray(obj?.kill_chain_phases) ? obj.kill_chain_phases : []
    const tactics = phases
      .filter((p) => p?.kill_chain_name === 'mitre-attack' && typeof p?.phase_name === 'string')
      .map((p) => titleCaseFromPhase(p.phase_name))

    const finalTactics = tactics.length ? tactics : ['Unknown']
    for (const tactic of finalTactics) {
      const id = `${techniqueId}|${tactic}`
      out.set(id, { id, technique: techniqueId, tactic, name })
    }
  }

  const techniques = Array.from(out.values()).sort((a, b) => (a.tactic + a.technique + a.name).localeCompare(b.tactic + b.technique + b.name))
  if (!techniques.length) warnings.push('Parsed 0 techniques; ensure you provided the MITRE ATT&CK STIX JSON (enterprise-attack.json).')

  return { techniques, warnings }
}

export async function saveMitreTechniques(records: MitreTechniqueRecord[]) {
  await db.transaction('rw', db.mitreTechniques, async () => {
    await db.mitreTechniques.clear()
    await db.mitreTechniques.bulkPut(records)
  })
}
