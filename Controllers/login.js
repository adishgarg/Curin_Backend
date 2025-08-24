const express = require("express")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const { body, validationResult } = require("express-validator")
const Employee = require("../models/Employee")

const router = express.Router()

router.post("/login", [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid input',
        errors: errors.array() 
      })
    }

    const { email, password } = req.body

    const employee = await Employee.findOne({ email }).select('+password')
    if (!employee) {
      return res.status(401).json({ 
        status: 'error',
        message: "Invalid credentials" 
      })
    }

    if (!employee.password) {
      return res.status(401).json({ 
        status: 'error',
        message: "Account not properly configured" 
      })
    }

    const isMatch = await bcrypt.compare(password, employee.password)
    if (!isMatch) {
      return res.status(401).json({ 
        status: 'error',
        message: "Invalid credentials" 
      })
    }

    const token = jwt.sign(
      { 
        id: employee._id, 
        email: employee.email,
        designation: employee.designation,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "4d" }
    )

    await employee.save()

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: employee._id,
          email: employee.email,
          designation: employee.designation,
          name: `${employee.firstName} ${employee.lastName}`,
          fullName: employee.fullName // using virtual field
        }
      }
    })

  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ 
      status: 'error',
      message: "Server error during login" 
    })
  }
})

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error',
        message: "No token provided" 
      })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ 
        status: 'error',
        message: "Invalid token" 
      })
    }

    const employee = await Employee.findById(decoded.id)
    if (!employee) {
      return res.status(404).json({ 
        status: 'error',
        message: "User not found" 
      })
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: employee._id,
          email: employee.email,
          designation: employee.designation,
          name: `${employee.firstName} ${employee.lastName}`,
          fullName: employee.fullName // using virtual field
        }
      }
    })

  } catch (err) {
    console.error('Fetch user error:', err)
    res.status(500).json({ 
      status: 'error',
      message: "Server error fetching user" 
    })
  }
})

module.exports = router