# Copilot instructions for Lite Detection Workbench

You are assisting in a local-first detection engineering app inspired by OpenTide concepts.

## Repo conventions
- Objectives live in `objectives/OBJ-####.yaml` and follow a simple schema:
  - id, name, description, mitre[], platforms[], status, telemetryReadiness, rationale, createdAt, updatedAt
- Detections live in `detections/<platform>/RULE-####.<ext>`
  - `detections/sigma/*.yaml` (Sigma)
  - `detections/kql/*.kql` (Microsoft Sentinel)
  - `detections/crowdstrike-siem/*.yaml` (placeholder schema; adapt to the user's format)
  - `detections/crowdstrike-edr/*.yaml` (notes/strategy; adapt to Falcon workflows)
  - `detections/exabeam-cim/*.yaml` (CIM-alignment notes + placeholder logic)
- Every detection must reference the Objective ID in a comment or metadata header.

## Style goals
- Make outputs practical, minimal, and easy to tune.
- Prefer explicit prerequisites: required logs, fields, and pitfalls.
- Do NOT invent vendor-specific field names if uncertain; clearly mark TODO placeholders.

## Exabeam CIM alignment
- When writing Exabeam notes, include:
  - required_entities
  - mapping_notes
  - detection_logic placeholder
  - validation steps (ensure fields populated for >= 7 days)

## Sigma + KQL quality
- Sigma: include `logsource`, `detection`, `falsepositives`, and `level`.
- KQL: include lookback windows and sanity checks; avoid brittle table names; add TODO if uncertain.

## OpenTide acknowledgement
- When generating docs, include a short acknowledgement note that the workflow is OpenTide-inspired (not affiliated).


## Prompt pack
Use prompts under `.github/prompts/` when generating detections or mappings.
Prefer **objective-first** outputs and reference Signals (telemetry + mappings).
