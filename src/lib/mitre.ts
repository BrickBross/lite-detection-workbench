export type MitreTechnique = {
  technique: string
  tactic: string
  name: string
}

export const MITRE_TECHNIQUES: MitreTechnique[] = [
  { tactic: 'Credential Access', technique: 'T1003', name: 'OS Credential Dumping' },
  { tactic: 'Defense Evasion', technique: 'T1562.001', name: 'Impair Defenses: Disable or Modify Tools' },
  { tactic: 'Persistence', technique: 'T1136', name: 'Create Account' },
  { tactic: 'Initial Access', technique: 'T1566', name: 'Phishing' },
  { tactic: 'Command and Control', technique: 'T1071', name: 'Application Layer Protocol' },
  // Add more over time; keep lightweight for Lite version.
]
