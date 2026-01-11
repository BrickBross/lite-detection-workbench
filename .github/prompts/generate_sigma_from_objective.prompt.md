# Generate Sigma rule from Objective

You are given an Objective YAML (OBJ-####). Create a Sigma rule starter that:
- references the objective id in `title` or a comment
- maps MITRE tags appropriately
- includes a clear `logsource`
- includes `falsepositives` and `level`
- uses placeholders where exact fields are unknown

Output only the Sigma YAML.
