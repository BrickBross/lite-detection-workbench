import { z } from 'zod'

export const Platform = z.enum(['exabeam_cim', 'crowdstrike_siem', 'crowdstrike_edr', 'sentinel_kql', 'sigma_generic'])

export const ObjectiveStatus = z.enum(['planned', 'blocked', 'implemented', 'tuned', 'validated'])

export const MitreRef = z.object({
  tactic: z.string().min(2),
  technique: z.string().min(2),
  subtechnique: z.string().optional(),
})

export const ObjectiveSchema = z.object({
  id: z.string().regex(/^OBJ-\d{4}$/),
  name: z.string().min(3),
  description: z.string().min(3),
  mitre: z.array(MitreRef).min(1),
  platforms: z.array(Platform).min(1),
  status: ObjectiveStatus,
  telemetryReadiness: z.enum(['available', 'partial', 'missing']),
  rationale: z.string().optional(),
  owner: z.string().optional(),
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
