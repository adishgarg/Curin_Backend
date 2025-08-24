const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: {
    type: String,
    trim: true,
    required: true,
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
  files: [{
    fileId: { type: String, required: true }, // Google Drive file ID
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number },
    url: { type: String, required: true }, // Google Drive view URL
    downloadUrl: { type: String }, // Google Drive download URL
    uploadedAt: { type: Date, default: Date.now }
  }],
  partnerOrganizations: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  industriesInvolved: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
  remarks: [
    {
      text: { type: String, trim: true, required: true },
      createdAt: { type: Date, default: Date.now },
      files: [{
        fileId: { type: String }, // Google Drive file ID
        filename: { type: String },
        originalName: { type: String },
        mimetype: { type: String },
        size: { type: Number },
        url: { type: String }, // Google Drive view URL
        downloadUrl: { type: String }, // Google Drive download URL
        uploadedAt: { type: Date, default: Date.now }
      }]
    }
  ]
}, {
  timestamps: true 
})

module.exports = mongoose.model('Task', taskSchema)