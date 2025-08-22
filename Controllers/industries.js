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

module.exports = router;