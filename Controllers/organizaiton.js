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

router.put('/update/:id', auth(), async (req, res) => {
    const orgId = req.params.id;
    const { name } = req.body;

    try {
        const org = await Organization.findById(orgId); 
        if (!org) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }
        
        const changes = [];
        if (name && name !== org.name) {
            changes.push({ field: 'name', oldValue: org.name, newValue: name });
            org.name = name;
        }

        if (changes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No changes detected'
            });
        }

        org.auditLogs.push({
            changedBy: req.user._id,
            changes,
            remarks: 'Organization updated'
        });

        const updatedOrg = await org.save();
        res.status(200).json({
            success: true,
            data: updatedOrg
        });
    } catch (error) {
        console.error('Error updating organization:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});

router.delete('/delete/:id', auth(["LPI","PPI"]), async (req, res) => {
    const orgId = req.params.id;

    try {
        const org = await Organization.findById(org);
        if (!org) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        await Organization.findByIdAndDelete(orgId);
        res.status(200).json({
            success: true,
            message: 'Organization deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting organization:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});

module.exports = router;