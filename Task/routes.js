const express = require('express');
const { createTask, validateTaskCreation } = require('./create');
const { getAllTasks, getTasksSummary } = require('./getAllTasks');
const { updateTask, validateTaskUpdate } = require('./update');

const router = express.Router();

// GET /api/tasks - Get all tasks
router.get('/', getAllTasks);

// GET /api/tasks/summary - Get tasks summary
router.get('/summary', getTasksSummary);

// POST /api/tasks/create - Create a new task
router.post('/create', validateTaskCreation, createTask);

// PUT /api/tasks/:id - Update a task
router.put('/:id', validateTaskUpdate, updateTask);

// GET /api/tasks/:id - Get task by ID (you can add this later)
router.get('/:id', (req, res) => {
  res.json({
    status: 'info',
    message: 'Task details endpoint - Coming soon'
  });
});

module.exports = router;
