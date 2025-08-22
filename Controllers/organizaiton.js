const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization')
const auth = require('../middleware/auth');

router.get('/getAll', auth(), async(req, res) => {
    try{
        const Orgs = await Organization.find().populate('name')
        res.status(200).json({
            success: true,
            data: Orgs
        });
    }catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
})

module.exports = router;