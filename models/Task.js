const mongoose = require('mongoose');

// Audit Log Schema for tracking changes
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'status_changed'],
    required: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed, // Stores what changed
    required: true
  },
  previousValues: {
    type: mongoose.Schema.Types.Mixed // Stores previous values
  },
  changedBy: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    trim: true
  }
});

const taskSchema = new mongoose.Schema({
  // Task Name
  taskName: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true
  },
  
  // Partner Organizations - Array of objects with name and ID
  partnerOrganizations: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  
  // Employees Assigned - Array of objects with name and ID
  employeesAssigned: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    name: {
      type: String,
      required: true,
      trim: true
    }
  }],
  
  // Dates
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  
  // Automated timestamp (when request was received)
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  // Description with word limit
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    validate: {
      validator: function(value) {
        const wordCount = value.trim().split(/\s+/).length;
        return wordCount <= 50;
      },
      message: 'Description cannot exceed 50 words'
    }
  },
  
  // Remarks - added during updates
  remarks: {
    type: String,
    trim: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Created by
  createdBy: {
    type: String,
    required: [true, 'Created by is required'],
    trim: true
  },
  
  // Audit trail
  auditLogs: [auditLogSchema]
  
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for description word count
taskSchema.virtual('descriptionWordCount').get(function() {
  return this.description ? this.description.trim().split(/\s+/).length : 0;
});

// Pre-save middleware for audit logging
taskSchema.pre('save', function(next) {
  const task = this;
  
  if (task.isNew) {
    // Log task creation
    task.auditLogs.push({
      action: 'created',
      changes: {
        taskName: task.taskName,
        partnerOrganizations: task.partnerOrganizations,
        employeesAssigned: task.employeesAssigned,
        startDate: task.startDate,
        endDate: task.endDate,
        description: task.description,
        status: task.status
      },
      changedBy: task.createdBy,
      remarks: 'Task created'
    });
  } else {
    // Log updates
    const modifiedPaths = task.modifiedPaths();
    if (modifiedPaths.length > 0) {
      const changes = {};
      const previousValues = {};
      
      modifiedPaths.forEach(path => {
        if (path !== 'auditLogs' && path !== 'updatedAt') {
          changes[path] = task[path];
          if (task.isModified(path)) {
            previousValues[path] = task._original ? task._original[path] : null;
          }
        }
      });
      
      if (Object.keys(changes).length > 0) {
        const action = modifiedPaths.includes('status') ? 'status_changed' : 'updated';
        
        task.auditLogs.push({
          action,
          changes,
          previousValues,
          changedBy: task.modifiedBy || 'system',
          remarks: task.updateRemarks || null
        });
      }
    }
  }
  
  next();
});

// Middleware to store original values for audit trail
taskSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update.modifiedBy) {
    this._modifiedBy = update.modifiedBy;
  }
  if (update.updateRemarks) {
    this._updateRemarks = update.updateRemarks;
  }
  next();
});

// Index for better query performance
taskSchema.index({ taskName: 1 });
taskSchema.index({ 'partnerOrganizations.id': 1 });
taskSchema.index({ 'employeesAssigned.id': 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ startDate: 1, endDate: 1 });
taskSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Task', taskSchema);
