import { PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Boxes, Clock, Info, Menu, Palette, Settings, Shield, X } from 'lucide-react'
import { motion } from 'framer-motion'

const nav = [
  { to: '/', label: 'Objectives', icon: Boxes },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/about', label: 'About', icon: Info },
  { to: '/settings', label: 'Settings', icon: Settings },
]

type ThemeId = 'dark' | 'light' | 'nord' | 'dracula' | 'solarized' | 'forest' | 'rose'

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'nord', label: 'Nord' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'solarized', label: 'Solarized' },
  { id: 'forest', label: 'Forest' },
  { id: 'rose', label: 'Rose' },
]

const THEME_STORAGE_KEY = 'ldw.theme'

export default function Shell({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeId>('dark')
  const themeIndex = useMemo(() => Math.max(0, THEMES.findIndex((t) => t.id === theme)), [theme])
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && THEMES.some((t) => t.id === stored)) setTheme(stored as ThemeId)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.8)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-2xl bg-[rgb(var(--surface2))] ring-1 ring-[rgb(var(--border))]">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Lite Detection Workbench" className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Lite Detection Workbench</div>
              <div className="text-[11px] text-[rgb(var(--muted))]">local-first → export-to-json</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden gap-1 md:flex">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition',
                      isActive
                        ? 'bg-[rgb(var(--surface2))] ring-[rgb(var(--border-strong))]'
                        : 'bg-transparent text-[rgb(var(--text-muted))] ring-[rgb(var(--border))] hover:bg-[rgb(var(--surface2)/0.6)] hover:ring-[rgb(var(--border-strong))]',
                    ].join(' ')
                  }
                >
                  <n.icon className="h-4 w-4 opacity-80" />
                  {n.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileNavOpen((cur) => !cur)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.4)] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2)/0.7)] md:hidden"
                aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileNavOpen}
              >
                {mobileNavOpen ? <X className="h-4 w-4 opacity-90" /> : <Menu className="h-4 w-4 opacity-90" />}
              </button>
              <button
                type="button"
                onClick={() => setTheme(THEMES[(themeIndex + 1) % THEMES.length].id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.4)] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2)/0.7)]"
                title="Cycle theme"
              >
                <Palette className="h-4 w-4 opacity-90" />
              </button>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeId)}
                className="h-9 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.4)] px-3 text-sm text-[rgb(var(--text))]"
                aria-label="Theme"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {mobileNavOpen ? (
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 md:hidden">
            <nav className="grid gap-2 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition',
                      isActive
                        ? 'bg-[rgb(var(--surface2))] ring-[rgb(var(--border-strong))]'
                        : 'bg-transparent text-[rgb(var(--text-muted))] ring-[rgb(var(--border))] hover:bg-[rgb(var(--surface2)/0.6)] hover:ring-[rgb(var(--border-strong))]',
                    ].join(' ')
                  }
                >
                  <n.icon className="h-4 w-4 opacity-80" />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.div>
      </main>

      <footer className="border-t border-[rgb(var(--border))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-[rgb(var(--faint))]">
          <span>© {new Date().getFullYear()} Lite Detection Workbench</span>
          <span>OpenTide-inspired workflow (acknowledged in About/README)</span>
        </div>
      </footer>
    </div>
  )
}
