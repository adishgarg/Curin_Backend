const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Organization = require('../models/Organisation'); 
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const organizations = await Organization.find()
      .select('-auditLogs -__v') // Exclude audit logs and version for listing
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      message: `Retrieved ${organizations.length} organization(s)`,
      data: {
        organizations: organizations.map(org => ({
          _id: org._id,
          name: org.name,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching organizations',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

module.exports = router;