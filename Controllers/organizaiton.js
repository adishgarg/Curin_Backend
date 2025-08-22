const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization')
const auth = require('../middleware/auth');
const audit = require('../middleware/audit');

router.use(auth());
router.use(audit());

router.get('/getAll', auth(), async(req, res) => {
    try{
        const Orgs = await Organization.find().populate('name')
        if(req.audit) await req.audit({
            action: 'read',
            resourceType: 'Organization',
            remarks: 'Fetched all organizations',
        });
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

router.post('/create', auth(), async (req, res) => {
    const { name } = req.body;

    try {
        const newOrg = new Organization({
            name,
            auditLogs: [
                {
                    changedBy: req.user._id,
                    changes: [{ field: "organization", oldValue: null, newValue: "Organization created" }],
                    remarks: "Organization created"
                }
            ]
        });

        const savedOrg = await newOrg.save();
        res.status(201).json({
            success: true,
            data: savedOrg
        });
    } catch (error) {
        console.error('Error creating organization:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});

module.exports = router;