export default function About() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">About</h1>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
        <div className="font-semibold">What this is</div>
        <p className="mt-2 text-zinc-400">
          Lite Detection Workbench is a frontend-only, local-first web app for detection engineering. It helps you
          define <span className="text-zinc-200">objectives</span> (what to detect), attach{' '}
          <span className="text-zinc-200">signals</span> (telemetry), generate starter{' '}
          <span className="text-zinc-200">detections</span> (rules/queries/notes), and export a Git-ready
          repository.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
        <div className="font-semibold">OpenTide acknowledgement</div>
        <p className="mt-2 text-zinc-400">
          This app is <span className="text-zinc-200">inspired by</span> the OpenTide detection engineering approach
          (objectives, modelling, coverage-driven thinking). It is not affiliated with or endorsed by OpenTide, and it
          does not include OpenTide code. When you publish or present outputs, please also acknowledge OpenTide if the
          concepts are used.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
        <div className="font-semibold">Why no backend</div>
        <p className="mt-2 text-zinc-400">
          Everything runs in your browser and stores to local IndexedDB. This keeps the app easy to host on GitHub Pages
          and avoids operational overhead. Export-to-Git means your repo becomes the source of truth and CI/CD can do the
          heavy lifting later.
        </p>
      </div>
    </div>
  )
}
