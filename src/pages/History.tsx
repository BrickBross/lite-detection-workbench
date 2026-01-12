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
                    <JsonBlock title="Before" value={e.before} />
                    <JsonBlock title="After" value={e.after} />
                    {e.meta ? (
                      <div className="md:col-span-2">
                        <JsonBlock title="Meta" value={e.meta} />
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

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
      <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{title}</div>
      <pre className="mt-2 max-h-72 overflow-auto text-xs text-[rgb(var(--text-muted))]">
        {value === undefined ? '(none)' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}
