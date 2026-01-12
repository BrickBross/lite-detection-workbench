import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import type { AuditEvent } from '../lib/schemas'

type Tab = 'all' | 'objective' | 'detection' | 'signal' | 'export'

export default function History() {
  const [items, setItems] = useState<AuditEvent[]>([])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const rows = await db.audit.orderBy('ts').reverse().toArray()
      setItems(rows)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return items.filter((e) => {
      if (tab !== 'all' && e.entityType !== tab) return false
      if (!query) return true
      const hay = `${e.ts} ${e.entityType} ${e.action} ${e.entityId ?? ''} ${e.summary ?? ''} ${JSON.stringify(e.meta ?? {})}`.toLowerCase()
      return hay.includes(query)
    })
  }, [items, q, tab])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">History</h1>
          <p className="text-sm text-[rgb(var(--muted))]">Audit log of creates, edits, deletes, and exports.</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search history (id, action, text...)"
          className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))] md:w-[380px]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton on={tab === 'all'} onClick={() => setTab('all')}>
          All
        </TabButton>
        <TabButton on={tab === 'objective'} onClick={() => setTab('objective')}>
          Objectives
        </TabButton>
        <TabButton on={tab === 'detection'} onClick={() => setTab('detection')}>
          Detections
        </TabButton>
        <TabButton on={tab === 'signal'} onClick={() => setTab('signal')}>
          Signals
        </TabButton>
        <TabButton on={tab === 'export'} onClick={() => setTab('export')}>
          Exports
        </TabButton>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-sm text-[rgb(var(--muted))]">No history yet.</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-sm text-[rgb(var(--muted))]">No matches.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((e) => {
            const id = e.id ?? -1
            const isOpen = openId === id
            const changedPaths = diffPaths(e.before, e.after)
            return (
              <div key={String(e.id ?? `${e.ts}:${e.entityType}:${e.action}`)} className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
                <button type="button" onClick={() => setOpenId(isOpen ? null : id)} className="w-full text-left">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs text-[rgb(var(--faint))]">{e.ts}</div>
                      <div className="mt-1 text-sm font-semibold text-[rgb(var(--text))]">
                        {e.entityType}.{e.action} {e.entityId ? `· ${e.entityId}` : ''}
                      </div>
                      <div className="mt-1 text-xs text-[rgb(var(--muted))]">{e.summary ?? '(no summary)'}</div>
                    </div>
                    <div className="text-xs text-[rgb(var(--faint))]">{isOpen ? 'collapse' : 'expand'}</div>
                  </div>
                </button>

                {isOpen ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <JsonBlock title="Before" value={e.before} highlightPaths={changedPaths} tone="before" />
                    <JsonBlock title="After" value={e.after} highlightPaths={changedPaths} tone="after" />
                    {e.meta ? (
                      <div className="md:col-span-2">
                        <JsonBlock title="Meta" value={e.meta} highlightPaths={new Set()} tone="meta" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TabButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: any }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-3 py-1 text-xs transition',
        on
          ? 'border-[rgb(var(--border-strong))] bg-[rgb(var(--surface2))] text-[rgb(var(--text))]'
          : 'border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface2)/0.4)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

type JsonTone = 'before' | 'after' | 'meta'

function JsonBlock({
  title,
  value,
  highlightPaths,
  tone,
}: {
  title: string
  value: unknown
  highlightPaths: Set<string>
  tone: JsonTone
}) {
  const lines = value === undefined ? null : renderValue(value, 0, '$')
  const highlightClass =
    tone === 'after'
      ? 'bg-emerald-500/10 text-emerald-200'
      : tone === 'before'
        ? 'bg-rose-500/10 text-rose-200'
        : 'bg-transparent'
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
      <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{title}</div>
      <pre className="mt-2 max-h-72 overflow-auto text-xs text-[rgb(var(--text-muted))]">
        {lines
          ? lines.map((line, idx) => (
              <div
                key={`${line.path}:${idx}`}
                className={highlightPaths.has(line.path) ? `rounded px-1 ${highlightClass}` : undefined}
              >
                {line.text}
              </div>
            ))
          : '(none)'}
      </pre>
    </div>
  )
}

type JsonLine = {
  text: string
  path: string
}

function diffPaths(before: unknown, after: unknown, path = '$'): Set<string> {
  if (before === after) return new Set()
  const beforeIsObj = typeof before === 'object' && before !== null
  const afterIsObj = typeof after === 'object' && after !== null

  if (!beforeIsObj || !afterIsObj) return new Set([path])

  const beforeIsArray = Array.isArray(before)
  const afterIsArray = Array.isArray(after)
  if (beforeIsArray !== afterIsArray) return new Set([path])

  const out = new Set<string>()

  if (beforeIsArray && afterIsArray) {
    const a = before as unknown[]
    const b = after as unknown[]
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i++) {
      const childPath = `${path}[${i}]`
      if (i >= a.length || i >= b.length) {
        out.add(childPath)
        continue
      }
      for (const p of diffPaths(a[i], b[i], childPath)) out.add(p)
    }
    return out
  }

  const aObj = before as Record<string, unknown>
  const bObj = after as Record<string, unknown>
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)])
  for (const key of keys) {
    const childPath = path === '$' ? `$.${key}` : `${path}.${key}`
    if (!(key in aObj) || !(key in bObj)) {
      out.add(childPath)
      continue
    }
    for (const p of diffPaths(aObj[key], bObj[key], childPath)) out.add(p)
  }
  return out
}

function renderValue(value: unknown, indent: number, path: string): JsonLine[] {
  const pad = '  '.repeat(indent)
  if (value === null || value === undefined || typeof value !== 'object') {
    return [{ text: `${pad}${JSON.stringify(value)}`, path }]
  }

  if (Array.isArray(value)) {
    const lines: JsonLine[] = [{ text: `${pad}[`, path }]
    value.forEach((item, idx) => {
      const childPath = `${path}[${idx}]`
      const rendered = renderValue(item, indent + 1, childPath)
      if (rendered.length === 1) {
        const comma = idx === value.length - 1 ? '' : ','
        lines.push({ text: `${'  '.repeat(indent + 1)}${rendered[0].text.trim()}${comma}`, path: childPath })
      } else {
        const comma = idx === value.length - 1 ? '' : ','
        lines.push({ text: `${'  '.repeat(indent + 1)}${rendered[0].text.trim()}`, path: childPath })
        lines.push(...rendered.slice(1, -1))
        const closeLine = rendered[rendered.length - 1]
        lines.push({ text: `${closeLine.text}${comma}`, path: closeLine.path })
      }
    })
    lines.push({ text: `${pad}]`, path })
    return lines
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj)
  const lines: JsonLine[] = [{ text: `${pad}{`, path }]
  keys.forEach((key, idx) => {
    const childPath = path === '$' ? `$.${key}` : `${path}.${key}`
    const rendered = renderValue(obj[key], indent + 1, childPath)
    const comma = idx === keys.length - 1 ? '' : ','
    if (rendered.length === 1) {
      lines.push({
        text: `${'  '.repeat(indent + 1)}"${key}": ${rendered[0].text.trim()}${comma}`,
        path: childPath,
      })
      return
    }
    lines.push({
      text: `${'  '.repeat(indent + 1)}"${key}": ${rendered[0].text.trim()}`,
      path: childPath,
    })
    lines.push(...rendered.slice(1, -1))
    const closeLine = rendered[rendered.length - 1]
    lines.push({ text: `${closeLine.text}${comma}`, path: closeLine.path })
  })
  lines.push({ text: `${pad}}`, path })
  return lines
}
