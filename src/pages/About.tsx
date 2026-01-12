export default function About() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">About</h1>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-sm text-[rgb(var(--text-muted))]">
        <div className="font-semibold">What this is</div>
        <p className="mt-2 text-[rgb(var(--muted))]">
          Lite Detection Workbench is a frontend-only, local-first workspace for defining detection intent before writing
          rules. It helps you model objectives, capture telemetry feasibility, and keep the “why” and “response” context
          alongside your detection plans so you can hand off a complete package to an AI or engineer.
        </p>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-sm text-[rgb(var(--text-muted))]">
        <div className="font-semibold">What you can do</div>
        <ul className="mt-2 space-y-2 text-[rgb(var(--muted))]">
          <li>Create detection objectives with MITRE mapping (lite)</li>
          <li>Capture telemetry requirements, readiness, and detailed source attributes</li>
          <li>Record response expectations (how to respond + who to contact)</li>
          <li>Track severity, urgency, and status with custom labels</li>
          <li>Add external references and query notes to support investigations</li>
          <li>Export objectives as AI-ready JSON for sharing or rule generation</li>
        </ul>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-sm text-[rgb(var(--text-muted))]">
        <div className="font-semibold">AI-ready objective export</div>
        <p className="mt-2 text-[rgb(var(--muted))]">
          Objective exports include the full objective model, expanded MITRE names, telemetry details, query availability,
          and a structured assistant context block that helps an AI draft detections and ask the right follow-up
          questions.
        </p>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-sm text-[rgb(var(--text-muted))]">
        <div className="font-semibold">OpenTide acknowledgement</div>
        <p className="mt-2 text-[rgb(var(--muted))]">
          This app is <span className="text-[rgb(var(--text))]">inspired by</span> the OpenTide detection engineering approach
          (objectives, modelling, coverage-driven thinking). It is not affiliated with or endorsed by OpenTide, and it
          does not include OpenTide code. When you publish or present outputs, please also acknowledge OpenTide if the
          concepts are used.
        </p>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-sm text-[rgb(var(--text-muted))]">
        <div className="font-semibold">Why no backend</div>
        <p className="mt-2 text-[rgb(var(--muted))]">
          Everything runs in your browser and stores to local IndexedDB. This keeps the app easy to host on GitHub Pages
          and avoids operational overhead. Export-to-JSON keeps sharing simple and portable.
        </p>
      </div>
    </div>
  )
}
