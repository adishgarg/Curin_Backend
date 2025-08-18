const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const employeeSchema = new mongoose.Schema({
    name: String,
    position: String
});
const Employee = mongoose.model('Employee', employeeSchema);

router.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

module.exports = router;