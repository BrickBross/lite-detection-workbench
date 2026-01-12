# Lite Detection Workbench

> **Strategy-first detection engineering. Local-first. Export-to-Git.**

Lite Detection Workbench is a **frontend-only, local-first detection engineering studio** that helps teams design, reason about, and structure detections *before* writing SIEM rules — then export everything as a **Git-ready repository**.

It is **inspired by the OpenTide philosophy** (objectives, coverage-driven thinking, modelling before rules) while intentionally remaining lightweight, fast, and easy to host on **GitHub Pages**.

---

## 🚀 What this gives you

- A structured way to design detections before writing rules
- A UI for modelling objectives, feasibility, and gaps
- Starter detections for common formats (YAML) and query languages
- Lightweight MITRE-style coverage visualization
- A Git-native workflow (export → commit → CI/CD)
- A Copilot-friendly authoring environment

---

## 🧠 Core philosophy

This is **not** a SIEM.  
This is **not** a rule engine.  
This is **not** a backend service.

This is a **thinking tool** and **engineering workbench**.

It helps you answer:

> “What *should* we detect, how *could* we detect it, and what do we *not* detect yet?”

---

## 🧩 Conceptual architecture

```
Threat → Objective → Feasibility → Signals → Detections → Coverage → Export → Git
```

Everything begins with *intent*, not syntax.

---

## 🛠 How it works

### 1. Model intent (the *what*)

You define **Detection Objectives**:

- Detect LSASS memory access by non-system processes
- Detect OAuth token replay
- Detect AI agent secret exfiltration

These are **not rules**. They are **goals**.

---

### 2. Model feasibility (the *can we*)

For each objective, you capture:

- Target platforms (your SIEM/EDR/log pipeline)
- Telemetry readiness (available / partial / missing)
- Rationale and risk context
- Status (planned, blocked, implemented, tuned, validated)

This makes **blind spots visible**.

---

### 3. Generate detection starters (the *how*)

Instead of starting from scratch, you use guided templates to generate **starter detections** for:

- YAML-based rule formats
- SIEM query languages
- EDR/endpoint detections
- Field mapping / normalization notes

These are **hypotheses**, not final answers.

---

### 4. Track coverage

The workbench provides:

- MITRE-lite heatmaps
- Planned vs implemented tracking
- Telemetry readiness visibility
- Detection counts per objective

This turns detections into a **designed system**, not a pile of rules.

---

### 5. Export to Git

Everything is exported as a **repo-shaped ZIP** containing:

- YAML objectives
- YAML/Query detections
- Documentation
- Coverage indexes

You unzip it, open in VS Code, commit, and push.

Your **Git repo becomes the source of truth**.

Everything runs in your browser and stores locally in IndexedDB (no backend).

---

## 🧬 Relationship to OpenTide

Lite Detection Workbench is **inspired by** the OpenTide detection engineering philosophy:

- Objective-based modelling
- Threat-first thinking
- Coverage-driven planning
- Detection lifecycle awareness

This project:

- Does **not** include OpenTide code
- Is **not** affiliated with OpenTide
- Is **not** an official OpenTide project

If you use these concepts in presentations or tooling, please **acknowledge OpenTide** as the inspiration.

---

## 🧭 Roadmap

See [ROADMAP.md](./ROADMAP.md)

---

## 📸 Screenshots

Screenshots will live under `/assets/screenshots/`.

Suggested shots:
- Dashboard overview
- Objective wizard
- Detection builder
- Coverage view
- Export screen

---

## 🧑‍💻 Running locally

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/lite-detection-workbench/`.

If you fork/rename the repo, update the GitHub Pages base path in:

- `vite.config.ts` (`base`)
- `src/main.tsx` (`<BrowserRouter basename=...>`)

---

## 🌍 GitHub Pages deployment

This repo includes a GitHub Actions workflow to automatically deploy to GitHub Pages.

### Steps

1. Push to `main`
2. Go to **Settings → Pages**
3. Set **Source: GitHub Actions**

Your app will be live at:

```
https://<username>.github.io/lite-detection-workbench/
```

---

## 🤖 Copilot integration

This repo includes:

- `.github/copilot-instructions.md`
- Prompt files under `.github/prompts/`

These make GitHub Copilot Chat much more useful for:

- Generating starter detections from objectives
- Translating objectives into SIEM queries
- Creating field-mapping/normalization notes
- Proposing SIEM/EDR detection strategies

---

## One-sentence pitch

**Lite Detection Workbench is a strategy-first detection engineering studio that helps you design what you should detect, understand what you can detect, and export everything as Git-ready detection artifacts — inspired by OpenTide, but lightweight, fast, and local-first.**

---

## License

MIT
