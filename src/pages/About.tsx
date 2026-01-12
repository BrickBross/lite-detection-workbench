export default function About() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">About</h1>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-sm text-[rgb(var(--text-muted))]">
        <div className="font-semibold">What this is</div>
        <p className="mt-2 text-[rgb(var(--muted))]">
          Lite Detection Workbench is a frontend-only, local-first web app for detection engineering. It helps you
          define <span className="text-[rgb(var(--text))]">objectives</span> (what to detect), attach{' '}
          <span className="text-[rgb(var(--text))]">signals</span> (telemetry), generate starter{' '}
          <span className="text-[rgb(var(--text))]">detections</span> (rules/queries/notes), and export JSON.
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
