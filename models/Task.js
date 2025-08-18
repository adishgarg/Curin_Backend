const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Time and date stamps
  userTimestamp: {
    type: Date,
    required: [true, 'User timestamp is required']
  },
  automaticTimestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  // Partner Organization
  partnerOrganization: {
    type: String,
    required: [true, 'Partner organization is required'],
    trim: true
  },
  
  // Industries involved
  industriesInvolved: [{
    type: String,
    required: true,
    trim: true
  }],
  
  // Work done - 50 words details
  workDone: {
    type: String,
    required: [true, 'Work done description is required'],
    trim: true
  },
  
  // Summary / Remarks
  summary: {
    type: String,
    trim: true
  },
  
  // Additional metadata
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for word count in workDone
taskSchema.virtual('workDoneWordCount').get(function() {
  return this.workDone ? this.workDone.trim().split(/\s+/).length : 0;
});

// Index for better query performance
taskSchema.index({ partnerOrganization: 1, automaticTimestamp: -1 });
taskSchema.index({ industriesInvolved: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);
