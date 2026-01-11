import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import type { Signal } from '../lib/schemas'
import { nextId, isoNow } from '../lib/ids'

const CIM_SUGGESTIONS = [
  'actor.user','actor.ip','actor.device','target.user','target.host',
  'process.name','process.command_line','file.path','network.dest_ip','network.dest_port',
  'auth.result','cloud.api',
]

export default function Signals() {
  const [items, setItems] = useState<Signal[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const load = async () => setItems(await db.signals.orderBy('updatedAt').reverse().toArray())
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Signals</h1>
          <p className="text-sm text-zinc-400">Telemetry catalogue + light CIM-style field mapping.</p>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white">
          New Signal
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">No signals yet.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs text-zinc-500">{s.id}</div>
                  <div className="text-lg font-semibold">{s.name}</div>
                  <div className="mt-1 text-sm text-zinc-400">{s.description}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge>{s.logSource}</Badge>
                    {(s.eventTypes ?? []).slice(0, 6).map((e) => <Badge key={e}>{e}</Badge>)}
                    {(s.eventTypes ?? []).length > 6 ? <Badge>+{(s.eventTypes ?? []).length - 6} more</Badge> : null}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">Updated {new Date(s.updatedAt).toLocaleString()}</div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Box title="Required fields" body={(s.requiredFields ?? []).join(', ') || '—'} />
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3">
                  <div className="text-xs font-semibold text-zinc-300">Mappings (source → CIM)</div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-400">
                    {(s.mappings ?? []).length === 0 ? '—' : (s.mappings ?? []).slice(0, 6).map((m, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">{m.from}</span><span className="text-zinc-600">→</span><span className="truncate">{m.to}</span>
                      </div>
                    ))}
                    {(s.mappings ?? []).length > 6 ? <div className="text-zinc-600">+{(s.mappings ?? []).length - 6} more</div> : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open ? <SignalModal onClose={() => setOpen(false)} suggestions={CIM_SUGGESTIONS} /> : null}
    </div>
  )
}

function SignalModal({ onClose, suggestions }: { onClose: () => void; suggestions: string[] }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logSource, setLogSource] = useState('')
  const [eventTypes, setEventTypes] = useState('')
  const [requiredFields, setRequiredFields] = useState('')
  const [mappings, setMappings] = useState<{ from: string; to: string }[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(suggestions[0] ?? 'actor.user')

  const canSave = name.trim().length >= 3 && description.trim().length >= 3 && logSource.trim().length >= 2

  const addMapping = () => {
    if (!from.trim() || !to.trim()) return
    setMappings((cur) => [...cur, { from: from.trim(), to: to.trim() }])
    setFrom('')
  }

  const save = async () => {
    const existing = await db.signals.toCollection().primaryKeys()
    const id = nextId('SIG', existing as string[])
    const now = isoNow()
    const s: Signal = {
      id,
      name: name.trim(),
      description: description.trim(),
      logSource: logSource.trim(),
      eventTypes: eventTypes.split(',').map((x) => x.trim()).filter(Boolean),
      requiredFields: requiredFields.split(',').map((x) => x.trim()).filter(Boolean),
      mappings,
      createdAt: now,
      updatedAt: now,
    }
    await db.signals.add(s)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">New Signal</div>
            <div className="mt-1 text-xs text-zinc-500">Capture telemetry + optional CIM mapping.</div>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900/40">Close</button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Field label="Name"><Input value={name} onChange={(e:any) => setName(e.target.value)} /></Field>
            <Field label="Description"><Textarea value={description} onChange={(e:any) => setDescription(e.target.value)} /></Field>
            <Field label="Log source"><Input value={logSource} onChange={(e:any) => setLogSource(e.target.value)} /></Field>
            <Field label="Event types (comma-separated)"><Input value={eventTypes} onChange={(e:any) => setEventTypes(e.target.value)} /></Field>
            <Field label="Required fields (comma-separated)"><Input value={requiredFields} onChange={(e:any) => setRequiredFields(e.target.value)} /></Field>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3">
              <div className="text-xs font-semibold text-zinc-300">Field mappings (source → CIM)</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input value={from} onChange={(e:any) => setFrom(e.target.value)} placeholder="source field" />
                <select className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={to} onChange={(e:any) => setTo(e.target.value)}>
                  {suggestions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mt-2 flex justify-end">
                <button onClick={addMapping} className="rounded-2xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-white">Add mapping</button>
              </div>
              <div className="mt-3 max-h-44 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
                {mappings.length === 0 ? <div className="text-zinc-500">No mappings yet.</div> : mappings.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2"><span className="truncate">{m.from}</span><span className="text-zinc-600">→</span><span className="truncate">{m.to}</span></div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-3 text-xs text-zinc-500">
              Tip: start with user/host/process/ip. Add detail as you tune detections.
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-2xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900/40">Cancel</button>
          <button onClick={save} disabled={!canSave} className="rounded-2xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40">Save Signal</button>
        </div>
      </div>
    </div>
  )
}

function Badge({ children }: { children: any }) { return <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">{children}</span> }
function Box({ title, body }: { title: string; body: string }) {
  return (<div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3"><div className="text-xs font-semibold text-zinc-300">{title}</div><div className="mt-2 text-xs text-zinc-400">{body}</div></div>)
}
function Field({ label, children }: { label: string; children: any }) { return (<div><div className="text-xs font-semibold text-zinc-300">{label}</div><div className="mt-2">{children}</div></div>) }
function Input(props: any) { return <input {...props} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600" /> }
function Textarea(props: any) { return <textarea {...props} rows={4} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-600" /> }
