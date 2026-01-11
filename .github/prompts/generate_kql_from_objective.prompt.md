# Generate KQL query from Objective

Given an Objective YAML (OBJ-####), generate a KQL starter:
- comment header includes objective id and MITRE mapping
- includes lookback window and parameters
- uses a reasonable default table (SigninLogs / DeviceProcessEvents / SecurityEvent) ONLY if clearly implied; otherwise add TODO
- contains a tuning section comment

Output only the KQL content.
