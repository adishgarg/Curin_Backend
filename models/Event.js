const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name:{
    type: String,
    required: true
    },
    startDate:{
    type: Date,
    required: true
    },
    endDate:{
    type: Date,
    required: true
    },
    location:{
    type: String,
    required: true
    },
    description:{
    type: String,
    required: true
    },
    createdBy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
    },
    createdAt:{
    type: Date,
    default: Date.now
    },
    organizations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    }],
    industries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Industry'
    }],
    employees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }],
    poster:[{
    fileId: { type: String, required: true }, // Google Drive file ID
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number },
    url: { type: String, required: true }, // Google Drive view URL
    downloadUrl: { type: String }, // Google Drive download URL
    uploadedAt: { type: Date, default: Date.now }
  }],
  budget:{
    type: Number,
    required: true
  },
  Conveners:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  organisedBy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
})

module.exports = mongoose.model('Event', eventSchema);