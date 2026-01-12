# Lite Detection Workbench

<p align="center">
  <img src="public/logo.svg" alt="Lite Detection Workbench" width="96" height="96" />
</p>

<p align="center">
  <a href="#"><img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white"></a>
  <a href="#"><img alt="React" src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-10B981"></a>
</p>

Strategy-first detection engineering. Local-first. Export-to-JSON.

Lite Detection Workbench is a frontend-only, local-first workspace for defining detection intent before writing rules. It helps you model objectives, capture telemetry feasibility, and keep the “why” and “response” context alongside your detection plans so you can hand off a complete package to an AI or engineer.

## What you can do

- Create detection objectives with MITRE mapping (lite)
- Capture telemetry requirements, readiness, and detailed source attributes.
- Record response expectations (how to respond + who to contact)
- Track severity, urgency, and status with custom labels
- Add external references and query notes to support investigations
- Export objectives as AI-ready JSON for sharing or rule generation

## Export

- Per-objective JSON export: use the “Export JSON” button on an objective card.
- Settings export/import: use the Settings page to save or reuse your label sets.

## AI-ready objective export

Each objective export includes:

- The full objective model (description, rationale, response plan, telemetry notes)
- Expanded MITRE technique names and telemetry details
- Query availability and optional query text
- A structured `assistantContext` block that summarizes intent and suggests clarifying questions

### Example workflow

1. Create an objective and fill in description, response, telemetry, and MITRE mapping.
2. Export the objective JSON.
3. Paste the JSON into your AI tool and ask it to produce a detection.

Example prompt to an AI assistant:

```
You are a detection engineer. Use the objective JSON below to draft a detection.
Clarify the target SIEM, preferred query language, and schema if missing.
Return: a short detection summary, candidate queries, and testing/FP notes.

<paste objective JSON here>
```

## Themes

Use the theme picker in the header to switch between:

- Light, Dark, Nord, Dracula, Solarized, Forest, Rose

Theme selection is saved in `localStorage`.

## Running locally

```bash
npm ci
npm run dev
```

## Acknowledgement

This project is inspired by the OpenTide detection engineering philosophy (objective-first, coverage-driven planning). It is not affiliated with OpenTide and does not include OpenTide code.

## License

MIT
