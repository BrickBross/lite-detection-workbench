export type MitreTechnique = {
  technique: string
  tactic: string
  name: string
}

export const MITRE_TECHNIQUES: MitreTechnique[] = [
  { tactic: 'Credential Access', technique: 'T1003', name: 'OS Credential Dumping' },
  { tactic: 'Credential Access', technique: 'T1110', name: 'Brute Force' },
  { tactic: 'Credential Access', technique: 'T1555', name: 'Credentials from Password Stores' },
  { tactic: 'Defense Evasion', technique: 'T1562.001', name: 'Impair Defenses: Disable or Modify Tools' },
  { tactic: 'Defense Evasion', technique: 'T1070', name: 'Indicator Removal' },
  { tactic: 'Defense Evasion', technique: 'T1027', name: 'Obfuscated/Compressed Files and Information' },
  { tactic: 'Persistence', technique: 'T1136', name: 'Create Account' },
  { tactic: 'Persistence', technique: 'T1547', name: 'Boot or Logon Autostart Execution' },
  { tactic: 'Persistence', technique: 'T1053', name: 'Scheduled Task/Job' },
  { tactic: 'Initial Access', technique: 'T1566', name: 'Phishing' },
  { tactic: 'Initial Access', technique: 'T1190', name: 'Exploit Public-Facing Application' },
  { tactic: 'Command and Control', technique: 'T1071', name: 'Application Layer Protocol' },
  { tactic: 'Command and Control', technique: 'T1105', name: 'Ingress Tool Transfer' },
  { tactic: 'Command and Control', technique: 'T1095', name: 'Non-Application Layer Protocol' },
  { tactic: 'Execution', technique: 'T1059', name: 'Command and Scripting Interpreter' },
  { tactic: 'Discovery', technique: 'T1087', name: 'Account Discovery' },
  { tactic: 'Discovery', technique: 'T1046', name: 'Network Service Discovery' },
  { tactic: 'Collection', technique: 'T1114', name: 'Email Collection' },
  { tactic: 'Lateral Movement', technique: 'T1021', name: 'Remote Services' },
  { tactic: 'Exfiltration', technique: 'T1048', name: 'Exfiltration Over Alternative Protocol' },
  // Add more over time; keep lightweight for Lite version.
]
