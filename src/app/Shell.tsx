import { PropsWithChildren } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Boxes, Download, Info, Shield, Wand2 } from 'lucide-react'
import { motion } from 'framer-motion'

const nav = [
  { to: '/', label: 'Objectives', icon: Boxes },
  { to: '/mitre', label: 'MITRE', icon: Shield },
  { to: '/wizard', label: 'New Objective', icon: Wand2 },
  { to: '/export', label: 'Export', icon: Download },
  { to: '/about', label: 'About', icon: Info },
]

export default function Shell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Lite Detection Workbench</div>
              <div className="text-[11px] text-zinc-400">local-first → export-to-git</div>
            </div>
          </Link>

          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ring-1 transition',
                    isActive
                      ? 'bg-zinc-900 ring-zinc-700'
                      : 'bg-transparent text-zinc-300 ring-zinc-800 hover:bg-zinc-900/60 hover:ring-zinc-700',
                  ].join(' ')
                }
              >
                <n.icon className="h-4 w-4 opacity-80" />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.div>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} Lite Detection Workbench</span>
          <span className="text-zinc-600">OpenTide-inspired workflow (acknowledged in About/README)</span>
        </div>
      </footer>
    </div>
  )
}
