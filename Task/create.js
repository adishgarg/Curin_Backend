const Task = require('../models/Task');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateTaskCreation = [
  body('taskName')
    .trim()
    .notEmpty()
    .withMessage('Task name is required'),

  body('partnerOrganizations')
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
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be in valid ISO 8601 format'),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be in valid ISO 8601 format')
    .custom((endDate, { req }) => {
      const startDate = new Date(req.body.startDate);
      const end = new Date(endDate);
      if (end <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .custom((value) => {
      const wordCount = value.trim().split(/\s+/).length;
      if (wordCount > 50) {
        throw new Error('Description cannot exceed 50 words');
      }
      return true;
    }),

  body('remarks')
    .optional()
    .trim(),

  body('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: active, completed, cancelled'),

  body('createdBy')
    .trim()
    .notEmpty()
    .withMessage('Created by is required')
];

// Create task endpoint
const createTask = async (req, res) => {
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

    const {
      taskName,
      partnerOrganizations,
      employeesAssigned,
      startDate,
      endDate,
      description,
      remarks,
      status = 'active',
      createdBy
    } = req.body;

    // Process partner organizations
    const processedPartnerOrgs = partnerOrganizations.map(org => ({
      id: org.objID || null, // Map objID to id field in database
      name: org.name.trim()
    }));

    // Process employees
    const processedEmployees = employeesAssigned.map(emp => ({
      id: emp.objID || null, // Map objID to id field in database
      name: emp.name.trim()
    }));

    // Create new task
    const newTask = new Task({
      taskName: taskName.trim(),
      partnerOrganizations: processedPartnerOrgs,
      employeesAssigned: processedEmployees,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description.trim(),
      remarks: remarks ? remarks.trim() : undefined,
      status,
      createdBy: createdBy.trim()
    });

    // Save to database
    const savedTask = await newTask.save();

    // Return success response
    res.status(201).json({
      status: 'success',
      message: 'Task created successfully',
      data: {
        task: {
          _id: savedTask._id,
          taskName: savedTask.taskName,
          partnerOrganizations: savedTask.partnerOrganizations,
          employeesAssigned: savedTask.employeesAssigned,
          startDate: savedTask.startDate,
          endDate: savedTask.endDate,
          timestamp: savedTask.timestamp,
          description: savedTask.description,
          descriptionWordCount: savedTask.descriptionWordCount,
          remarks: savedTask.remarks,
          status: savedTask.status,
          createdBy: savedTask.createdBy,
          createdAt: savedTask.createdAt,
          updatedAt: savedTask.updatedAt,
          auditLogs: savedTask.auditLogs
        }
      }
    });

  } catch (error) {
    console.error('Error creating task:', error);

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

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Duplicate entry found',
        field: Object.keys(error.keyPattern)[0]
      });
    }

    // Generic error response
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating task',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = {
  createTask,
  validateTaskCreation
};