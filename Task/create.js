const Task = require('../models/Task');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateTaskCreation = [
  body('userTimestamp')
    .notEmpty()
    .withMessage('User timestamp is required')
    .isISO8601()
    .withMessage('User timestamp must be in valid ISO 8601 format'),

  body('partnerOrganization')
    .trim()
    .notEmpty()
    .withMessage('Partner organization is required'),

  body('industriesInvolved')
    .isArray({ min: 1 })
    .withMessage('At least one industry must be specified'),

  body('workDone')
    .trim()
    .notEmpty()
    .withMessage('Work done description is required'),

  body('summary')
    .optional()
    .trim(),

  body('status')
    .optional()
    .isIn(['active', 'completed', 'on-hold', 'cancelled'])
    .withMessage('Status must be one of: active, completed, on-hold, cancelled'),

  body('createdBy')
    .optional()
    .trim()
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
      userTimestamp,
      partnerOrganization,
      industriesInvolved,
      workDone,
      summary,
      status = 'active',
      createdBy = 'system'
    } = req.body;

    // Create new task
    const newTask = new Task({
      userTimestamp: new Date(userTimestamp),
      partnerOrganization: partnerOrganization.trim(),
      industriesInvolved: industriesInvolved.map(industry => industry.trim()),
      workDone: workDone.trim(),
      summary: summary ? summary.trim() : undefined,
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
          id: savedTask._id,
          userTimestamp: savedTask.userTimestamp,
          automaticTimestamp: savedTask.automaticTimestamp,
          partnerOrganization: savedTask.partnerOrganization,
          industriesInvolved: savedTask.industriesInvolved,
          workDone: savedTask.workDone,
          workDoneWordCount: savedTask.workDoneWordCount,
          summary: savedTask.summary,
          status: savedTask.status,
          createdBy: savedTask.createdBy,
          createdAt: savedTask.createdAt,
          updatedAt: savedTask.updatedAt
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