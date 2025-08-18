const Task = require('../models/Task');
const { body, param, validationResult } = require('express-validator');

// Validation middleware for task updates
const validateTaskUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID'),

  body('taskName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task name cannot be empty'),

  body('partnerOrganizations')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one partner organization must be specified')
    .custom((organizations) => {
      for (const org of organizations) {
        if (!org.name || typeof org.name !== 'string' || org.name.trim().length === 0) {
          throw new Error('Each partner organization must have a name');
        }
        if (org.objID && typeof org.objID !== 'string') {
          throw new Error('Partner organization objID must be a string if provided');
        }
      }
      return true;
    }),

  body('employeesAssigned')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one employee must be assigned')
    .custom((employees) => {
      for (const emp of employees) {
        if (!emp.name || typeof emp.name !== 'string' || emp.name.trim().length === 0) {
          throw new Error('Each employee must have a name');
        }
        if (emp.objID && typeof emp.objID !== 'string') {
          throw new Error('Employee objID must be a string if provided');
        }
      }
      return true;
    }),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in valid ISO 8601 format'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in valid ISO 8601 format'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .custom((value) => {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount > 50) {
        throw new Error('Description cannot exceed 50 words');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: active, completed, cancelled'),

  body('remarks')
    .optional()
    .trim(),

  body('modifiedBy')
    .trim()
    .notEmpty()
    .withMessage('Modified by is required for updates')
];

// Update task endpoint
const updateTask = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    const { id } = req.params;
    const {
      taskName,
      partnerOrganizations,
      employeesAssigned,
      startDate,
      endDate,
      description,
      status,
      remarks,
      modifiedBy
    } = req.body;

    // Find the existing task
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    // Store original values for audit trail
    existingTask._original = existingTask.toObject();

    // Build update object
    const updateData = {};
    
    if (taskName !== undefined) {
      updateData.taskName = taskName.trim();
    }
    
    if (partnerOrganizations !== undefined) {
      updateData.partnerOrganizations = partnerOrganizations.map(org => ({
        id: org.objID || null, // Map objID to id field in database
        name: org.name.trim()
      }));
    }
    
    if (employeesAssigned !== undefined) {
      updateData.employeesAssigned = employeesAssigned.map(emp => ({
        id: emp.objID || null, // Map objID to id field in database
        name: emp.name.trim()
      }));
    }
    
    if (startDate !== undefined) {
      updateData.startDate = new Date(startDate);
    }
    
    if (endDate !== undefined) {
      updateData.endDate = new Date(endDate);
      
      // Validate end date is after start date
      const startDateToCheck = updateData.startDate || existingTask.startDate;
      if (updateData.endDate <= startDateToCheck) {
        return res.status(400).json({
          status: 'error',
          message: 'End date must be after start date'
        });
      }
    }
    
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (remarks !== undefined) {
      updateData.remarks = remarks.trim();
    }

    // Set audit trail fields
    updateData.modifiedBy = modifiedBy.trim();
    updateData.updateRemarks = remarks ? remarks.trim() : null;

    // Update the task
    Object.assign(existingTask, updateData);
    const updatedTask = await existingTask.save();

    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: {
        task: {
          _id: updatedTask._id,
          taskName: updatedTask.taskName,
          partnerOrganizations: updatedTask.partnerOrganizations,
          employeesAssigned: updatedTask.employeesAssigned,
          startDate: updatedTask.startDate,
          endDate: updatedTask.endDate,
          timestamp: updatedTask.timestamp,
          description: updatedTask.description,
          descriptionWordCount: updatedTask.descriptionWordCount,
          remarks: updatedTask.remarks,
          status: updatedTask.status,
          createdBy: updatedTask.createdBy,
          createdAt: updatedTask.createdAt,
          updatedAt: updatedTask.updatedAt,
          auditLogs: updatedTask.auditLogs
        }
      }
    });

  } catch (error) {
    console.error('Error updating task:', error);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Generic error response
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating task',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = {
  updateTask,
  validateTaskUpdate
};