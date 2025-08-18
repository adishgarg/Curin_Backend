const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const Industries = require('../models/Industries');

router.get("/", async (req, res) => {
    try{
        const industries = await Industries.find().select('-__v');
        res.status(200).json({
            status: 'success',
            message: `Retrieved ${industries.length} industry(ies)`,
            data: {
                industries
            }
        });
    } catch (error) {
        console.error('Error fetching industries:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error while fetching industries',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
})

module.exports = router;