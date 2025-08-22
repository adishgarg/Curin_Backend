const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
 
router.get('/getAll', auth(), async (req, res) => {
     try{
         const tasks = await Task.find().populate('title startDate endDate status createdBy assignedTo partnerOrganization industry');
         res.status(200).json({
             success: true,
             data: tasks
         });
     } catch (error) {
         console.error('Error fetching tasks:', error);
         res.status(500).json({
             success: false,
             message: 'Server Error'
         });
     }
 })
 
router.post('/create', auth(), async (req, res) => {
     const { title, description, createdBy, assignedTo, status, startDate, endDate, files, partnerOrganization, industry } = req.body;

     try {
         const newTask = new Task({
             title,
             description,
             createdBy,
             assignedTo,
             status,
             startDate,
             endDate,
             files,
             partnerOrganization,
             industry,
             auditLogs: [
                 {
                     changedBy: req.user._id,
                     changes: [{ field: "task", oldValue: null, newValue: "Task created" }],
                     remarks: "Task created"
                 }
             ]
         });

         const savedTask = await newTask.save();
         res.status(201).json({
             success: true,
             data: savedTask
         });
     } catch (error) {
         console.error('Error creating task:', error);
         res.status(500).json({
             success: false,
             message: 'Server Error'
         });
     }
});

// Get a single task by ID
router.get('/get/:id', auth(), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('createdBy assignedTo partnerOrganization industry');
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Update a task by ID
router.put('/update/:id', auth(), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const updates = req.body;
        const changes = [];

        Object.keys(updates).forEach(field => {
            if (task[field] && task[field].toString() !== updates[field].toString()) {
                changes.push({
                    field,
                    oldValue: task[field],
                    newValue: updates[field]
                });
                task[field] = updates[field];
            }
        });

        if (changes.length > 0 || req.body.remarks) {
            task.auditLogs.push({
                changedBy: req.user._id,
                changes,
                remarks: req.body.remarks || ''
            });
        }

        const updatedTask = await task.save();
        res.status(200).json({ success: true, data: updatedTask });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Delete a task by ID
router.delete('/delete/:id', auth(), async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;