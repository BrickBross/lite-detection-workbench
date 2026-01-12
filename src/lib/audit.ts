import { db } from './db'
import { isoNow } from './ids'
import type { AuditEvent, AuditEntityType, AuditAction } from './schemas'

export async function recordAuditEvent(e: {
  entityType: AuditEntityType
  action: AuditAction
  entityId?: string
  summary?: string
  before?: unknown
  after?: unknown
  meta?: Record<string, unknown>
}) {
  const event: AuditEvent = {
    ts: isoNow(),
    entityType: e.entityType,
    action: e.action,
    entityId: e.entityId,
    summary: e.summary,
    before: e.before,
    after: e.after,
    meta: e.meta,
  }
  try {
    await db.audit.add(event)
  } catch {
    // Ignore audit failures; core UX should still work.
  }
}

