const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const router = express.Router();

// Validation middleware for employee creation
const validateEmployeeCreation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),

];

// Validation middleware for employee updates
const validateEmployeeUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid employee ID'),

  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number'),

  body('designation')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Designation cannot be empty')
];

// GET /api/employees - Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find()
      .select('-auditLogs -__v') // Exclude audit logs and version for listing
      .sort({ firstName: 1, lastName: 1 });

    res.status(200).json({
      status: 'success',
      message: `Retrieved ${employees.length} employee(s)`,
      data: {
        employees: employees.map(emp => ({
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          fullName: emp.fullName,
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching employees',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid employee ID',
        errors: errors.array()
      });
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Employee retrieved successfully',
      data: {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          fullName: employee.fullName,
          email: employee.email,
          phone: employee.phone,
          designation: employee.designation,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
          auditLogs: employee.auditLogs
        }
      }
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching employee',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// POST /api/employees - Create new employee
router.post('/', validateEmployeeCreation, async (req, res) => {
  try {
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

    const { firstName, lastName, email, phone, designation } = req.body;

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(409).json({
        status: 'error',
        message: 'Employee with this email already exists'
      });
    }

    const newEmployee = new Employee({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      phone: phone ? phone.trim() : undefined,
      designation: designation.trim()
    });

    const savedEmployee = await newEmployee.save();

    res.status(201).json({
      status: 'success',
      message: 'Employee created successfully',
      data: {
        employee: {
          _id: savedEmployee._id,
          firstName: savedEmployee.firstName,
          lastName: savedEmployee.lastName,
          fullName: savedEmployee.fullName,
          email: savedEmployee.email,
          phone: savedEmployee.phone,
          designation: savedEmployee.designation,
          createdAt: savedEmployee.createdAt,
          updatedAt: savedEmployee.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error creating employee:', error);

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

    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Employee with this email already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal server error while creating employee',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', validateEmployeeUpdate, async (req, res) => {
  try {
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
    const { firstName, lastName, email, phone, designation } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({ email });
      if (existingEmployee) {
        return res.status(409).json({
          status: 'error',
          message: 'Employee with this email already exists'
        });
      }
    }

    // Update fields
    if (firstName !== undefined) employee.firstName = firstName.trim();
    if (lastName !== undefined) employee.lastName = lastName.trim();
    if (email !== undefined) employee.email = email;
    if (phone !== undefined) employee.phone = phone.trim();
    if (designation !== undefined) employee.designation = designation.trim();

    const updatedEmployee = await employee.save();

    res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      data: {
        employee: {
          _id: updatedEmployee._id,
          firstName: updatedEmployee.firstName,
          lastName: updatedEmployee.lastName,
          fullName: updatedEmployee.fullName,
          email: updatedEmployee.email,
          phone: updatedEmployee.phone,
          designation: updatedEmployee.designation,
          createdAt: updatedEmployee.createdAt,
          updatedAt: updatedEmployee.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error updating employee:', error);

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

    res.status(500).json({
      status: 'error',
      message: 'Internal server error while updating employee',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid employee ID',
        errors: errors.array()
      });
    }

    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Employee deleted successfully',
      data: {
        deletedEmployee: {
          _id: employee._id,
          fullName: employee.fullName,
          email: employee.email
        }
      }
    });

  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting employee',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

module.exports = router;
