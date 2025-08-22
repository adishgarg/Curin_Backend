const mongoose = require('mongoose');

const AuditChangeSchema = new mongoose.Schema({
  field: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, 
  resourceType: { type: String, required: true }, 
  resourceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'resourceType', default: null },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  changes: [AuditChangeSchema],
  remarks: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);