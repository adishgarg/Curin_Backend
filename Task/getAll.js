const Task = require('../models/Task');
const { query, validationResult } = require('express-validator');

// Validation middleware for query parameters
const validateGetTasks = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('status')
    .optional()
    .isIn(['active', 'completed', 'on-hold', 'cancelled'])
    .withMessage('Status must be one of: active, completed, on-hold, cancelled'),
  
  query('partnerOrganization')
    .optional()
    .trim()
    .escape(),
  
  query('industry')
    .optional()
    .trim()
    .escape(),
  
  query('sortBy')
    .optional()
    .isIn(['automaticTimestamp', 'userTimestamp', 'partnerOrganization', 'status', 'createdAt'])
    .withMessage('SortBy must be one of: automaticTimestamp, userTimestamp, partnerOrganization, status, createdAt'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder must be either asc or desc')
];

// Get all tasks endpoint
const getAllTasks = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    // Extract query parameters with defaults
    const {
      page = 1,
      limit = 10,
      status,
      partnerOrganization,
      industry,
      sortBy = 'automaticTimestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (partnerOrganization) {
      filter.partnerOrganization = { $regex: partnerOrganization, $options: 'i' };
    }
    
    if (industry) {
      filter.industriesInvolved = { $in: [new RegExp(industry, 'i')] };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [tasks, totalTasks] = await Promise.all([
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v') // Exclude version field
        .lean(), // Use lean() for better performance
      Task.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalTasks / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Return response
    res.status(200).json({
      status: 'success',
      message: `Retrieved ${tasks.length} task(s)`,
      data: {
        tasks: tasks.map(task => ({
          _id: task._id,
          userTimestamp: task.userTimestamp,
          automaticTimestamp: task.automaticTimestamp,
          partnerOrganization: task.partnerOrganization,
          industriesInvolved: task.industriesInvolved,
          workDone: task.workDone,
          summary: task.summary,
          status: task.status,
          createdBy: task.createdBy,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalTasks,
          tasksPerPage: limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        },
        filters: {
          status: status || null,
          partnerOrganization: partnerOrganization || null,
          industry: industry || null
        },
        sorting: {
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);

    // Generic error response
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching tasks',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = {
  getAllTasks,
  validateGetTasks
};
