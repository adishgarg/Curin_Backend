const express = require('express');
const { createTask, validateTaskCreation } = require('./create');
const { getAllTasks, getTasksSummary } = require('./getAllTasks');

const router = express.Router();

router.get('/', getAllTasks);

router.get('/summary', getTasksSummary);

router.post('/', validateTaskCreation, createTask);

// GET /api/tasks/:id - Get task by ID (you can add this later)
router.get('/:id', (req, res) => {
  res.json({
    status: 'info',
    message: 'Task details endpoint - Coming soon'
  });
});

module.exports = router;
