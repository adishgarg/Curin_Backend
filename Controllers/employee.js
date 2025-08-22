const express = require('express');
const Employee = require('../models/Employee')
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

router.get('/getAll', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

router.post('/create', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const { id } = req.params;
        if (req.body.password) {
        req.body.password = await bcrypt.hash(req.body.password, 12)
        }
        const newEmployee = new Employee({ ...req.body, createdBy: req.user._id });
        await newEmployee.save();
        res.status(201).json(newEmployee);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to add employee' });
    }
});

router.get('/get/:id', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

router.delete('/delete/:id', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const { id } = req.params;
        await Employee.findByIdAndDelete(id);
        res.status(200).send('Employee deleted successfully');
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

router.put('/update/:id', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const { id } = req.params;
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, 12)
        }
        if (req.body.createdBy) {
            delete req.body.createdBy;
        }
        const updatedEmployee = await Employee.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(updatedEmployee);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

router.put('/updatePass', auth(["LPI","PPI","User"]), async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const employee = await Employee.findById(req.user._id).select('+password');
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, employee.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Old password is incorrect' });
        }
        employee.password = await bcrypt.hash(newPassword, 12);
        await employee.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;