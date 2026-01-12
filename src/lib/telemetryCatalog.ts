export type TelemetrySource = {
  id: string
  label: string
  details: string[]
}

export type TelemetryCategory = {
  id: 'on_prem' | 'aws' | 'azure' | 'gcp' | 'saas'
  label: string
  sources: TelemetrySource[]
}

export const TELEMETRY_CATALOG: TelemetryCategory[] = [
  {
    id: 'on_prem',
    label: 'On-prem / Endpoint / Network',
    sources: [
      { id: 'onprem.windows_security', label: 'Windows Security Event Log', details: ['4624/4625 logons', '4688 process creation (if enabled)', '4672 privilege use'] },
      { id: 'onprem.sysmon', label: 'Sysmon', details: ['EID 1 process create', 'EID 3 network connect', 'EID 7 image load', 'EID 10 process access'] },
      { id: 'onprem.powershell', label: 'PowerShell logging', details: ['Script block logging', 'Module logging', 'Transcription (optional)'] },
      { id: 'onprem.linux_auth', label: 'Linux auth/syslog', details: ['sshd auth events', 'sudo usage', 'process execution (auditd if available)'] },
      { id: 'onprem.macos_unified', label: 'macOS Unified Logs', details: ['process execution', 'auth events', 'system extensions (if applicable)'] },
      { id: 'onprem.edr_process', label: 'EDR process telemetry', details: ['process start/stop', 'parent/child', 'command line', 'signing'] },
      { id: 'onprem.edr_file_registry', label: 'EDR file/registry telemetry', details: ['file create/modify/delete', 'registry set/create/delete', 'persistence locations'] },
      { id: 'onprem.edr_network', label: 'EDR network telemetry', details: ['dest IP/port/domain', 'protocol', 'process-to-network linkage'] },
      { id: 'onprem.dns', label: 'DNS logs', details: ['client', 'query', 'response', 'NXDOMAIN rate'] },
      { id: 'onprem.proxy', label: 'Proxy / web gateway', details: ['URL', 'user', 'user-agent', 'TLS SNI (if available)'] },
      { id: 'onprem.firewall', label: 'Firewall logs', details: ['allow/deny', 'src/dst', 'port/proto', 'rule name'] },
      { id: 'onprem.netflow', label: 'NetFlow / network telemetry', details: ['src/dst', 'bytes/packets', 'duration', 'direction'] },
      { id: 'onprem.vpn', label: 'VPN / remote access', details: ['user', 'source IP', 'geo', 'device posture (if available)'] },
      { id: 'onprem.ad_audit', label: 'Active Directory audit', details: ['directory changes', 'group membership', 'GPO changes'] },
    ],
  },
  {
    id: 'aws',
    label: 'AWS',
    sources: [
      { id: 'aws.cloudtrail', label: 'CloudTrail', details: ['management events', 'userIdentity', 'eventName', 'sourceIPAddress', 'requestParameters'] },
      { id: 'aws.vpc_flow', label: 'VPC Flow Logs', details: ['srcaddr/dstaddr', 'srcport/dstport', 'action', 'bytes/packets'] },
      { id: 'aws.guardduty', label: 'GuardDuty findings', details: ['finding type', 'resource', 'severity', 'service action'] },
      { id: 'aws.cloudwatch', label: 'CloudWatch logs/metrics', details: ['service logs (app-specific)', 'alarms/metrics for baselining'] },
      { id: 'aws.eks_audit', label: 'EKS / Kubernetes audit', details: ['k8s audit events', 'API verbs', 'user/serviceAccount', 'object refs'] },
    ],
  },
  {
    id: 'azure',
    label: 'Azure / Microsoft',
    sources: [
      { id: 'azure.activity', label: 'Azure Activity Logs', details: ['resource changes', 'operationName', 'caller', 'status'] },
      { id: 'azure.entra_signin', label: 'Entra ID (Azure AD) sign-in logs', details: ['sign-in result', 'conditional access', 'device', 'location'] },
      { id: 'azure.entra_audit', label: 'Entra ID (Azure AD) audit logs', details: ['directory changes', 'admin actions', 'app consent changes'] },
      { id: 'azure.m365_audit', label: 'Microsoft 365 Unified Audit Log', details: ['Exchange/SharePoint/Teams activity', 'mailbox access', 'file sharing'] },
      { id: 'azure.defender', label: 'Microsoft Defender telemetry', details: ['endpoint/security alerts', 'entities', 'enrichment'] },
    ],
  },
  {
    id: 'gcp',
    label: 'GCP',
    sources: [
      { id: 'gcp.audit', label: 'GCP Audit Logs', details: ['Admin Activity', 'Data Access (if enabled)', 'serviceName/methodName', 'principalEmail'] },
      { id: 'gcp.vpc_flow', label: 'GCP VPC Flow Logs', details: ['src/dst', 'ports', 'bytes/packets', 'connection state'] },
      { id: 'gcp.cloud_dns', label: 'Cloud DNS logs', details: ['queries', 'responses', 'client'] },
      { id: 'gcp.gke_audit', label: 'GKE / Kubernetes audit', details: ['k8s audit events', 'API verbs', 'user/serviceAccount', 'object refs'] },
    ],
  },
  {
    id: 'saas',
    label: 'SaaS',
    sources: [
      { id: 'saas.okta', label: 'Okta (IdP)', details: ['auth events', 'MFA', 'admin actions', 'app assignments'] },
      { id: 'saas.google_workspace', label: 'Google Workspace audit', details: ['login events', 'admin actions', 'Drive sharing', 'Gmail activity'] },
      { id: 'saas.github_audit', label: 'GitHub audit log', details: ['repo/org changes', 'token usage', 'actions/workflows events'] },
      { id: 'saas.slack', label: 'Slack audit logs', details: ['workspace admin actions', 'app installs', 'exports (if applicable)'] },
      { id: 'saas.salesforce', label: 'Salesforce event monitoring', details: ['login', 'API calls', 'report exports', 'admin actions'] },
    ],
  },
]

export const TELEMETRY_BY_ID = new Map<string, { label: string; details: string[]; category: TelemetryCategory['id'] }>(
  TELEMETRY_CATALOG.flatMap((c) => c.sources.map((s) => [s.id, { label: s.label, details: s.details, category: c.id }] as const)),
)

export function telemetryLabel(id: string) {
  return TELEMETRY_BY_ID.get(id)?.label ?? id
}

export function telemetryDetails(id: string) {
  return TELEMETRY_BY_ID.get(id)?.details ?? []
}

