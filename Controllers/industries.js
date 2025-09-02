const express = require('express');
const router = express.Router();
const Industry = require('../models/Industries');
const audit = require('../middleware/audit');
const auth = require('../middleware/auth');

router.use(auth());
router.use(audit());

router.get('/getAll',auth(), async (req, res) => {
    try {
        const industries = await Industry.find();
        res.json(industries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/create', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const newIndustry = new Industry(req.body);
        const saved = await newIndustry.save();
        await req.audit({
            action: 'create',
            resourceType: 'Industry',
            resourceId: saved._id,
            changes: [{ field: 'all', newValue: saved.toObject() }]
        });

        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/update/:id', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const industryId = req.params.id;
        const industry = await Industry.findById(industryId);
        if (!industry) {
            return res.status(404).json({ message: 'Industry not found' });
        }

        const oldData = industry.toObject();
        Object.assign(industry, req.body);
        const updated = await industry.save();

        // Determine changes
        const changes = [];
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                changes.push({
                    field: key,
                    oldValue: oldData[key],
                    newValue: req.body[key]
                });
            }
        }

        await req.audit({
            action: 'update',
            resourceType: 'Industry',
            resourceId: updated._id,
            changes
        });

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/delete/:id', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const industryId = req.params.id;
        const industry = await Industry.findById(industryId);
        if (!industry) {
            return res.status(404).json({ message: 'Industry not found' });
        }

        await Industry.deleteOne({ _id: industryId });

        await req.audit({
            action: 'delete',
            resourceType: 'Industry',
            resourceId: industry._id,
            changes: [{ field: 'all', oldValue: industry.toObject() }]
        });

        res.json({ message: 'Industry deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;