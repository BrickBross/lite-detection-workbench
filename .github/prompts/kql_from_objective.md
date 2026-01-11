Generate Microsoft Sentinel KQL from Objective + Signals.

Rules:
- Use table names as placeholders if unknown (e.g., DeviceProcessEvents, SigninLogs) and note assumptions.
- Use mapped CIM-style fields in comments (actor.user, process.command_line, etc.) and map to actual columns you choose.
- Include a section: 'Assumptions' and 'Tuning knobs' (thresholds, allowlists).
- Return: KQL query + short explanation.
