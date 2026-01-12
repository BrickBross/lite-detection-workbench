import { useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import {
  defaultSettingsSnapshot,
  ensureSettings,
  normalizeSettings,
  saveSettings,
  type WorkbenchSettings,
} from '../lib/settings'

type SettingsDraft = {
  statusText: string
  telemetryReadinessText: string
  severityText: string
  urgencyText: string
}

type BuildResult =
  | { ok: false; message: string }
  | {
      ok: true
      value: WorkbenchSettings
    }

const toText = (values: string[]) => values.join('\n')

const parseList = (text: string) => {
  const raw = text
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const unique: string[] = []
  for (const item of raw) if (!unique.includes(item)) unique.push(item)
  return unique
}

export default function Settings() {
  const [settings, setSettings] = useState<WorkbenchSettings>(defaultSettingsSnapshot())
  const [draft, setDraft] = useState<SettingsDraft>({
    statusText: '',
    telemetryReadinessText: '',
    severityText: '',
    urgencyText: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ensureSettings().then((loaded) => {
      setSettings(loaded)
      setDraft({
        statusText: toText(loaded.statusOptions),
        telemetryReadinessText: toText(loaded.telemetryReadinessOptions),
        severityText: toText(loaded.severityOptions),
        urgencyText: toText(loaded.urgencyOptions),
      })
    })
  }, [])

  const buildSettingsFromDraft = (): BuildResult => {
    const statusOptions = parseList(draft.statusText)
    const telemetryReadinessOptions = parseList(draft.telemetryReadinessText)
    const severityOptions = parseList(draft.severityText)
    const urgencyOptions = parseList(draft.urgencyText)

    if (!statusOptions.length) return { ok: false, message: 'Status list cannot be empty.' }
    if (!telemetryReadinessOptions.length) return { ok: false, message: 'Telemetry readiness list cannot be empty.' }
    if (!severityOptions.length) return { ok: false, message: 'Severity list cannot be empty.' }
    if (!urgencyOptions.length) return { ok: false, message: 'Urgency list cannot be empty.' }

    const next = normalizeSettings({
      id: 'settings',
      statusOptions,
      telemetryReadinessOptions,
      severityOptions,
      urgencyOptions,
      updatedAt: settings.updatedAt,
    })
    return { ok: true, value: next }
  }

  const save = async () => {
    setSavedMessage(null)
    const built = buildSettingsFromDraft()
    if (!built.ok) {
      setError(built.message)
      return
    }
    setError(null)
    const saved = await saveSettings(built.value)
    setSettings(saved)
    setSavedMessage('Settings saved.')
  }

  const exportSettings = () => {
    const built = buildSettingsFromDraft()
    if (!built.ok) {
      setError(built.message)
      return
    }
    setError(null)
    const json = JSON.stringify(built.value, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lite-detection-workbench.settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importSettings = async (file: File) => {
    let parsed: any
    try {
      parsed = JSON.parse(await file.text())
    } catch (e: any) {
      setError(`Invalid JSON: ${e?.message ?? 'failed to parse'}`)
      return
    }
    const normalized = normalizeSettings(parsed ?? {})
    const saved = await saveSettings(normalized)
    setSettings(saved)
    setDraft({
      statusText: toText(saved.statusOptions),
      telemetryReadinessText: toText(saved.telemetryReadinessOptions),
      severityText: toText(saved.severityOptions),
      urgencyText: toText(saved.urgencyOptions),
    })
    setError(null)
    setSavedMessage('Settings imported.')
  }

  const clearAllData = async () => {
    const ok = confirm('Clear all stored data? This will remove objectives, detections, audit history, and settings.')
    if (!ok) return
    await db.delete()
    localStorage.clear()
    location.reload()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-[rgb(var(--muted))]">Manage labels, export/import settings, or reset local data.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Label>Status options</Label>
          <Textarea
            value={draft.statusText}
            onChange={(e: any) => setDraft((cur) => ({ ...cur, statusText: e.target.value }))}
            placeholder="planned&#10;blocked&#10;implemented"
          />
          <Hint>One per line (commas also work). These power Objective status dropdowns.</Hint>
        </Card>
        <Card>
          <Label>Telemetry readiness options</Label>
          <Textarea
            value={draft.telemetryReadinessText}
            onChange={(e: any) => setDraft((cur) => ({ ...cur, telemetryReadinessText: e.target.value }))}
            placeholder="unknown&#10;available&#10;partial&#10;missing"
          />
          <Hint>One per line. Used for Objective telemetry readiness.</Hint>
        </Card>
        <Card>
          <Label>Severity options</Label>
          <Textarea
            value={draft.severityText}
            onChange={(e: any) => setDraft((cur) => ({ ...cur, severityText: e.target.value }))}
            placeholder="low&#10;medium&#10;high&#10;critical"
          />
          <Hint>One per line. Used for Objectives and Detections.</Hint>
        </Card>
        <Card>
          <Label>Urgency options</Label>
          <Textarea
            value={draft.urgencyText}
            onChange={(e: any) => setDraft((cur) => ({ ...cur, urgencyText: e.target.value }))}
            placeholder="p0&#10;p1&#10;p2&#10;p3"
          />
          <Hint>One per line. Used for Objective urgency.</Hint>
        </Card>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}
      {savedMessage ? <div className="text-sm text-[rgb(var(--muted))]">{savedMessage}</div> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-2xl bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-[rgb(var(--accent-fg))]"
        >
          Save settings
        </button>
        <button
          type="button"
          onClick={exportSettings}
          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-4 py-2 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
        >
          Export settings
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2)/0.3)] px-4 py-2 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface2)/0.6)]"
        >
          Import settings
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) importSettings(file)
          }}
        />
        <button
          type="button"
          onClick={clearAllData}
          className="rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm text-red-200 hover:bg-red-950/35"
        >
          Clear all data
        </button>
      </div>
    </div>
  )
}

function Card({ children }: any) {
  return <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">{children}</div>
}
function Label({ children }: any) {
  return <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{children}</div>
}
function Hint({ children }: any) {
  return <div className="mt-2 text-xs text-[rgb(var(--faint))]">{children}</div>
}
function Textarea(props: any) {
  return (
    <textarea
      {...props}
      rows={6}
      className="mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--border-strong))]"
    />
  )
}
