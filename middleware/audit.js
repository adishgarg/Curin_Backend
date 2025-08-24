const AuditLog = require('../models/audit');

module.exports = function auditMiddleware() {
  return (req, res, next) => {
    req.audit = async function audit(entry = {}) {
      try {
        const { action, resourceType, resourceId = null, changes = [], remarks = '', metadata = {} } = entry;
        if (!action || !resourceType) return;

        // Only log create, update, and delete actions - skip read activities
        const auditableActions = ['create', 'update', 'delete'];
        if (!auditableActions.includes(action.toLowerCase())) {
          return; // Skip logging for read actions
        }

        const doc = new AuditLog({
          action,
          resourceType,
          resourceId,
          changedBy: req.user ? req.user._id : null,
          changes,
          remarks,
          ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0] || '',
          userAgent: req.get('User-Agent') || '',
          metadata
        });

        // best-effort write; do not block/throw to calling route on failure
        await doc.save();
      } catch (err) {
        console.error('Audit log error:', err);
      }
    };

    next();
  };
};