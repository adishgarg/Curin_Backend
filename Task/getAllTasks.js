const Task = require('../models/Task');

// Get all tasks with optional filtering, sorting, and pagination
const getAllTasks = async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      sortBy = 'automaticTimestamp',
      sortOrder = 'desc',
      status,
      partnerOrganization,
      industry,
      dateFrom,
      dateTo,
      createdBy
    } = req.query;

    // Build filter object
    const filter = {};

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Partner organization filter (case-insensitive partial match)
    if (partnerOrganization) {
      filter.partnerOrganization = { $regex: partnerOrganization, $options: 'i' };
    }

    // Industry filter
    if (industry) {
      filter.industriesInvolved = { $in: [new RegExp(industry, 'i')] };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.automaticTimestamp = {};
      if (dateFrom) {
        filter.automaticTimestamp.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.automaticTimestamp.$lte = new Date(dateTo);
      }
    }

    // Created by filter
    if (createdBy) {
      filter.createdBy = { $regex: createdBy, $options: 'i' };
    }

    // Pagination setup
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Sort setup
    const sortObject = {};
    sortObject[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const tasks = await Task.find(filter)
      .sort(sortObject)
      .skip(skip)
      .limit(limitNumber)
      .select('-__v'); // Exclude version field

    // Get total count for pagination info
    const totalTasks = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalTasks / limitNumber);

    // Calculate pagination info
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    // Response
    res.status(200).json({
      status: 'success',
      message: `Retrieved ${tasks.length} tasks`,
      data: {
        tasks,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalTasks,
          tasksPerPage: limitNumber,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNumber + 1 : null,
          prevPage: hasPrevPage ? pageNumber - 1 : null
        },
        filters: {
          status,
          partnerOrganization,
          industry,
          dateFrom,
          dateTo,
          createdBy
        },
        sorting: {
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);

    // Handle invalid date format
    if (error.message.includes('Invalid date')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Please use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        field: 'dateFrom or dateTo'
      });
    }

    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid parameter format',
        field: error.path
      });
    }

    // Generic error response
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching tasks',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Get tasks summary/statistics
const getTasksSummary = async (req, res) => {
  try {
    // Get counts by status
    const statusCounts = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get counts by partner organization
    const partnerCounts = await Task.aggregate([
      {
        $group: {
          _id: '$partnerOrganization',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get most common industries
    const industryCounts = await Task.aggregate([
      { $unwind: '$industriesInvolved' },
      {
        $group: {
          _id: '$industriesInvolved',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get total tasks
    const totalTasks = await Task.countDocuments();

    // Get recent tasks (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTasks = await Task.countDocuments({
      automaticTimestamp: { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      status: 'success',
      message: 'Tasks summary retrieved successfully',
      data: {
        totalTasks,
        recentTasks,
        statusBreakdown: statusCounts,
        topPartners: partnerCounts,
        topIndustries: industryCounts
      }
    });

  } catch (error) {
    console.error('Error fetching tasks summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching tasks summary',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = {
  getAllTasks,
  getTasksSummary
};
