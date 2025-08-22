const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: {
    type: String,
    trim: true,
    required: true,
    validate: {
      validator: function(value) {
        return value && value.length >= 10 && value.length <= 500;
      },
      message: 'Description must be between 10 and 500 characters'
    }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }],
  status: {
    type: String,
    required: true,
    enum: ['Cancelled', 'In Progress', 'Completed'],
    default: 'In Progress'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  files: [{ type: String }],
  partnerOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  industry: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
  remarks: [
    {
      text: { type: String, trim: true, required: true },
      createdAt: { type: Date, default: Date.now },
      files: { type: String, trim: true }
    }
  ],
  auditLogs: [
    {
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      changes: [
        {
          field: { type: String, required: true },
          oldValue: { type: mongoose.Schema.Types.Mixed },
          newValue: { type: mongoose.Schema.Types.Mixed }
        }
      ],
      changedAt: { type: Date, default: Date.now },
      remarks: { type: String, trim: true }
    }
  ]
})

module.exports = mongoose.model('Task', taskSchema)