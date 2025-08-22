const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(phone);
      },
      message: 'Please enter a valid phone number'
    },
    unique: true
  },
  
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
    enum: ['LPI', 'PPI', 'User']
  },
  organization:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization is required']
  },
  createdBy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'CreatedBy is required']
  },
  password:{
    type: String,
    required: [true, 'Password is required'],
    select: false,
  }
  
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for better query performance
employeeSchema.index({ firstName: 1, lastName: 1 });

module.exports = mongoose.model('Employee', employeeSchema);