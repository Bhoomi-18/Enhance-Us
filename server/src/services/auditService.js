import AuditLog from '../models/auditLogModel.js';

/**
 * Records an immutable administrative audit log entry.
 * Never stores passwords, tokens, full auth headers, or secret credentials.
 */
export const recordAuditLog = async ({
  actor = null,
  action,
  targetId = null,
  targetType = 'GENERAL',
  details = {},
  ip = null,
}) => {
  try {
    if (AuditLog.db?.readyState !== 1) {
      console.log(`📋 [Audit Log Memory] Action: ${action} by ${actor?.email || 'System'}`);
      return null;
    }

    const entry = await AuditLog.create({
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system@enhanceus.org',
      actorName: actor?.name || 'Administrator',
      action,
      targetId: targetId ? String(targetId) : null,
      targetType,
      details: typeof details === 'object' ? details : { info: details },
      ip: ip ? String(ip).substring(0, 45) : null,
      timestamp: new Date(),
    });

    return entry;
  } catch (err) {
    console.warn('⚠️ [Audit Log Warning] Failed to persist audit entry:', err.message);
    return null;
  }
};

/**
 * Retrieves paginated audit logs with search and action filtering
 */
export const getAuditLogs = async ({ page = 1, limit = 25, action = null, search = null }) => {
  if (AuditLog.db?.readyState !== 1) {
    return { logs: [], total: 0, page: Number(page), pages: 1 };
  }

  const query = {};
  if (action && action !== 'ALL') {
    query.action = action;
  }
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ actorEmail: regex }, { action: regex }, { targetId: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
};

export default {
  recordAuditLog,
  getAuditLogs,
};
