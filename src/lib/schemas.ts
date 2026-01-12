import { z } from 'zod'

export const Platform = z.enum(['exabeam_cim', 'crowdstrike_siem', 'crowdstrike_edr', 'sentinel_kql', 'sigma_generic'])

export const ObjectiveStatus = z.enum(['planned', 'blocked', 'implemented', 'tuned', 'validated'])

export const MitreRef = z.object({
  tactic: z.string().min(2),
  technique: z.string().min(2),
  subtechnique: z.string().optional(),
})

export const TelemetrySourcePropsSchema = z.object({
  dataClassification: z.string().optional(),
  internetExposed: z.boolean().optional(),
  authRequired: z.boolean().optional(),
  loggingEnabled: z.boolean().optional(),
  notes: z.string().optional(),
})

export const ObjectiveSchema = z.object({
  id: z.string().regex(/^OBJ-\d{4}$/),
  name: z.string().min(3),
  description: z.string().min(3),
  mitre: z.array(MitreRef).min(1),
  status: ObjectiveStatus,
  telemetryReadiness: z.enum(['unknown', 'available', 'partial', 'missing']),
  rationale: z.string().optional(),
  responsePlan: z.string().min(10).optional(),
  externalReferences: z.array(z.string().min(3)).default([]),
  owner: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  urgency: z.enum(['p0', 'p1', 'p2', 'p3']).default('p2'),
  requiredTelemetrySources: z.array(z.string()).default([]),
  requiredTelemetrySourceOverrides: z.record(TelemetrySourcePropsSchema).default({}),
  otherTelemetrySources: z.array(z.string()).default([]),
  telemetryNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Objective = z.infer<typeof ObjectiveSchema>

export const FieldMapping = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  notes: z.string().optional(),
})

export const SignalSchema = z.object({
  id: z.string().regex(/^SIG-\d{4}$/),
  name: z.string().min(3),
  description: z.string().min(3),
  logSource: z.string().min(2), // e.g. "Sysmon", "CrowdStrike FDR", "M365 Defender", "CloudTrail"
  eventTypes: z.array(z.string()).default([]),
  requiredFields: z.array(z.string()).default([]),
  mappings: z.array(FieldMapping).default([]),
  cimNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Signal = z.infer<typeof SignalSchema>

export const DetectionSchema = z.object({
  id: z.string().regex(/^RULE-\d{4}$/),
  objectiveId: z.string().regex(/^OBJ-\d{4}$/),
  signalIds: z.array(z.string().regex(/^SIG-\d{4}$/)).default([]),
  platform: Platform,
  title: z.string().min(3),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  content: z.string().min(1),
  tuningNotes: z.string().optional(),
  falsePositives: z.string().optional(),
  testPlan: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Detection = z.infer<typeof DetectionSchema>

export const ProjectSchema = z.object({
  version: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProjectMeta = z.infer<typeof ProjectSchema>

export const AuditEntityType = z.enum(['objective', 'detection', 'signal', 'export'])
export const AuditAction = z.enum(['create', 'update', 'delete', 'export'])

export const AuditEventSchema = z.object({
  id: z.number().optional(),
  ts: z.string(),
  entityType: AuditEntityType,
  entityId: z.string().optional(),
  action: AuditAction,
  summary: z.string().optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  meta: z.record(z.unknown()).optional(),
})

export type AuditEvent = z.infer<typeof AuditEventSchema>
