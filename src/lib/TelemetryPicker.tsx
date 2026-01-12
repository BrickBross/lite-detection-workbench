import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { TELEMETRY_BY_ID, TELEMETRY_CATALOG, TELEMETRY_ROWS } from './telemetryCatalog'

export function TelemetryPicker({
  selectedIds,
  onChangeSelectedIds,
  otherTelemetrySourcesText,
  onChangeOtherTelemetrySourcesText,
  defaultCollapsed = true,
}: {
  selectedIds: string[]
  onChangeSelectedIds: (next: string[]) => void
  otherTelemetrySourcesText: string
  onChangeOtherTelemetrySourcesText: (next: string) => void
  defaultCollapsed?: boolean
}) {
  const [q, setQ] = useState('')
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const selected = useMemo(() => new Set(selectedIds), [selectedIds])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChangeSelectedIds(Array.from(next))
  }

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    return TELEMETRY_ROWS.filter((r) => `${r.name} ${r.provider} ${r.category}`.toLowerCase().includes(query)).slice(0, 200)
  }, [q])

  const setAllExpanded = (open: boolean) => {
    if (!open) {
      setExpandedProviders({})
      setExpandedCategories({})
      return
    }
    const providers: Record<string, boolean> = {}
    const categories: Record<string, boolean> = {}
    for (const p of TELEMETRY_CATALOG) {
      providers[p.id] = true
      for (const c of p.categories) categories[c.id] = true
    }
    setExpandedProviders(providers)
    setExpandedCategories(categories)
  }

  const isProviderOpen = (providerId: string) => expandedProviders[providerId] ?? !defaultCollapsed
  const isCategoryOpen = (categoryId: string) => expandedCategories[categoryId] ?? !defaultCollapsed

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
          placeholder="Search telemetry sources (e.g., CloudTrail, Entra, GitHub, Reverse Proxy)"
          className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))] md:w-2/3"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAllExpanded(true)}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setAllExpanded(false)}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
          >
            Collapse all
          </button>
        </div>
      </div>

      {q.trim() ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
          <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Search results</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {filteredRows.map((r) => (
              <TelemetryToggle
                key={r.id}
                on={selected.has(r.id)}
                label={r.name}
                hint={`${r.provider.toUpperCase()} • ${r.category}${r.details.length ? ` • ${r.details.join(' • ')}` : ''}`}
                onClick={() => toggle(r.id)}
              />
            ))}
            {filteredRows.length === 0 ? <div className="text-xs text-[rgb(var(--faint))]">No matches.</div> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {TELEMETRY_CATALOG.map((provider) => {
            const providerSelectedCount = provider.categories.reduce(
              (acc, cat) => acc + cat.sources.filter((s) => selected.has(s.id)).length,
              0,
            )
            return (
              <div key={provider.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
                <button
                  type="button"
                  onClick={() => setExpandedProviders((cur) => ({ ...cur, [provider.id]: !isProviderOpen(provider.id) }))}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="text-sm font-semibold text-[rgb(var(--text))]">{provider.label}</div>
                  <div className="text-xs text-[rgb(var(--faint))]">
                    {providerSelectedCount ? `${providerSelectedCount} selected` : defaultCollapsed ? 'collapsed' : 'expanded'}
                  </div>
                </button>

                {isProviderOpen(provider.id) ? (
                  <div className="mt-3 space-y-3">
                    {provider.categories.map((cat) => {
                      const count = cat.sources.filter((s) => selected.has(s.id)).length
                      return (
                        <div key={cat.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.2)] p-3">
                          <button
                            type="button"
                            onClick={() => setExpandedCategories((cur) => ({ ...cur, [cat.id]: !isCategoryOpen(cat.id) }))}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{cat.label}</div>
                            <div className="text-xs text-[rgb(var(--faint))]">
                              {count ? `${count} selected` : isCategoryOpen(cat.id) ? 'expanded' : 'collapsed'}
                            </div>
                          </button>

                          {isCategoryOpen(cat.id) ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {cat.sources.map((s) => (
                                <TelemetryToggle
                                  key={s.id}
                                  on={selected.has(s.id)}
                                  label={s.name}
                                  hint={s.details.join(' • ')}
                                  onClick={() => toggle(s.id)}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Other telemetry sources (optional)</div>
        <div className="mt-2 text-xs text-[rgb(var(--faint))]">Use this for custom apps, niche vendors, or anything not in the catalog.</div>
        <input
          value={otherTelemetrySourcesText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeOtherTelemetrySourcesText(e.target.value)}
          placeholder="Comma-separated (e.g., custom.app.audit, vendorX.alerts)"
          className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]"
        />
      </div>

      <div className="text-xs text-[rgb(var(--faint))]">
        Catalog count: {TELEMETRY_BY_ID.size} sources. Add more via “Other telemetry sources”.
      </div>
    </div>
  )
}

function TelemetryToggle({ on, label, hint, onClick }: { on: boolean; label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border px-3 py-2 text-left text-xs transition',
        on
          ? 'border-[rgb(var(--border-strong))] bg-[rgb(var(--surface2))]'
          : 'border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface2)/0.4)]',
      ].join(' ')}
    >
      <div className="font-semibold text-[rgb(var(--text))]">{label}</div>
      <div className="mt-1 text-[rgb(var(--faint))]">{hint ?? (on ? 'selected' : 'click to select')}</div>
    </button>
  )
}

