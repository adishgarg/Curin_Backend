const AuditLog = require('../models/audit');

/**
 * Audit middleware factory.
 * Usage:
 *  - attach helper: router.use(audit());
 *  - in controller: await req.audit({ action: 'create', resourceType: 'Organization', resourceId: saved._id, changes: [...] })
 */
module.exports = function auditMiddleware() {
  return (req, res, next) => {
    // helper to record an audit entry
    req.audit = async function audit(entry = {}) {
      try {
        const { action, resourceType, resourceId = null, changes = [], remarks = '', metadata = {} } = entry;
        if (!action || !resourceType) return; // require minimal info

        const doc = new AuditLog({
          action,
          resourceType,
          resourceId,
          changedBy: req.user ? req.user._id : null,
          changes,
          remarks,
          userAgent: req.get('User-Agent') || '',
          ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0],
          metadata
        });

        // Save but don't throw to caller; log any error instead
        await doc.save();
      } catch (err) {
        console.error('Audit log error:', err);
      }
    };

    next();
  };
};