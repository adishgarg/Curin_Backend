const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // Basic Information
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
    }
  },
  
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true
  },
  
  
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
employeeSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for tenure calculation
employeeSchema.virtual('tenure').get(function() {
  if (!this.joiningDate) return null;
  const today = this.exitDate ? new Date(this.exitDate) : new Date();
  const joinDate = new Date(this.joiningDate);
  const diffTime = Math.abs(today - joinDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  return { years, months, totalDays: diffDays };
});

// Pre-save middleware for audit logging
employeeSchema.pre('save', function(next) {
  const employee = this;
  
  if (employee.isNew) {
    // Log employee creation
    employee.auditLogs.push({
      action: 'created',
      changes: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        designation: employee.designation,
        role: employee.role,
        status: employee.status
      },
      changedBy: employee.createdBy,
      remarks: 'Employee record created'
    });
  } else {
    // Log updates
    const modifiedPaths = employee.modifiedPaths();
    if (modifiedPaths.length > 0) {
      const changes = {};
      const previousValues = {};
      
      modifiedPaths.forEach(path => {
        if (path !== 'auditLogs' && path !== 'updatedAt') {
          changes[path] = employee[path];
          if (employee.isModified(path)) {
            previousValues[path] = employee._original ? employee._original[path] : null;
          }
        }
      });
      
      if (Object.keys(changes).length > 0) {
        let action = 'updated';
        if (modifiedPaths.includes('status')) action = 'status_changed';
        if (modifiedPaths.includes('role')) action = 'role_changed';
        
        employee.auditLogs.push({
          action,
          changes,
          previousValues,
          changedBy: employee.modifiedBy || 'system',
          remarks: employee.updateRemarks || null
        });
      }
    }
  }
  
  next();
});

// Indexes for better query performance
employeeSchema.index({ email: 1 });
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ firstName: 1, lastName: 1 });
employeeSchema.index({ joiningDate: 1 });

module.exports = mongoose.model('Employee', employeeSchema);