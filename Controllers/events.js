const express = require('express');
const Event = require('../models/Event');
const auth = require('../middleware/auth');
const audit = require('../middleware/audit');
const { multiple, uploadToGoogleDrive } = require('../middleware/upload');
const mongoose = require('mongoose');

const router = express.Router();

router.use(auth());
router.use(audit());

// Create Event with file upload support
router.post('/create', multiple('poster', 5), auth(["LPI","PPI"]), async (req, res) => {
    try {
        console.log('req.body:', req.body);
        console.log('req.files:', req.files);

        // Frontend sends separate fields, not JSON string
        const {
            eventName,
            proposedDateFrom,
            proposedDateTo,
            fromTime,
            toTime,
            organizedBy,
            venue,
            budget,
            conveners,
            description = `${eventName} scheduled from ${proposedDateFrom} to ${proposedDateTo}`
        } = req.body;

        console.log('Event data from frontend:', {
            eventName,
            proposedDateFrom,
            proposedDateTo,
            fromTime,
            toTime,
            organizedBy,
            venue,
            budget,
            conveners,
            description
        });

        // Validation
        const errors = [];
        
        if (!eventName || eventName.trim().length === 0) {
            errors.push('Event name is required');
        }
        
        if (!proposedDateFrom) {
            errors.push('Start date is required');
        }
        
        if (!proposedDateTo) {
            errors.push('End date is required');
        }
        
        if (!venue || venue.trim().length === 0) {
            errors.push('Venue is required');
        }
        
        if (!budget || isNaN(Number(budget))) {
            errors.push('Valid budget is required');
        }
        
        if (!organizedBy || !mongoose.Types.ObjectId.isValid(organizedBy)) {
            errors.push('Valid organizing organization is required');
        }
        
        // Handle conveners - might come as string or array from frontend
        let convenersArray = [];
        if (conveners) {
            if (typeof conveners === 'string') {
                // If it's a single string, try to parse as JSON or treat as single ID
                try {
                    convenersArray = JSON.parse(conveners);
                } catch (e) {
                    // If parsing fails, treat as single convener ID
                    convenersArray = [conveners];
                }
            } else if (Array.isArray(conveners)) {
                convenersArray = conveners;
            } else {
                convenersArray = [conveners];
            }
        }
        
        if (!convenersArray || convenersArray.length === 0) {
            errors.push('At least one convener is required');
        }

        // Validate convener IDs
        if (convenersArray.length > 0) {
            const invalidConveners = convenersArray.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidConveners.length > 0) {
                errors.push('Invalid convener IDs provided');
            }
        }

        // Date validation
        if (proposedDateFrom && proposedDateTo) {
            const startDate = new Date(`${proposedDateFrom}T${fromTime || '00:00'}`);
            const endDate = new Date(`${proposedDateTo}T${toTime || '23:59'}`);
            
            if (endDate <= startDate) {
                errors.push('End date must be after start date');
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Handle file uploads (poster)
        let uploadedPosters = [];
        if (req.files && req.files.length > 0) {
            console.log(`Uploading ${req.files.length} poster files to Google Drive...`);
            
            try {
                const uploadPromises = req.files.map(file => uploadToGoogleDrive(file, 'events'));
                uploadedPosters = await Promise.all(uploadPromises);
                console.log('Posters uploaded successfully:', uploadedPosters.length);
            } catch (uploadError) {
                console.log('Upload to Google Drive failed:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload poster files',
                    error: uploadError.message
                });
            }
        }

        // Create combined date-time objects
        const startDateTime = new Date(`${proposedDateFrom}T${fromTime || '00:00'}`);
        const endDateTime = new Date(`${proposedDateTo}T${toTime || '23:59'}`);

        // Map frontend data to Event schema
        const eventData = {
            name: eventName.trim(),
            startDate: startDateTime,
            endDate: endDateTime,
            location: venue.trim(),
            description: description.trim(),
            createdBy: req.user.id, // From auth middleware
            budget: Number(budget),
            organisedBy: organizedBy, // Note: matches schema field name
            Conveners: convenersArray[0], // Schema expects single ObjectId, taking first convener
            employees: convenersArray, // All conveners as employees
            poster: uploadedPosters,
            organizations: [organizedBy], // Add organizing org to organizations array
            industries: [], // Empty for now, can be added later
        };

        console.log('Creating event with data:', eventData);

        // Create the event
        const newEvent = new Event(eventData);
        const savedEvent = await newEvent.save();

        // Populate the response
        await savedEvent.populate([
            { path: 'createdBy', select: 'firstName lastName email' },
            { path: 'organisedBy', select: 'name description' },
            { path: 'Conveners', select: 'firstName lastName email' },
            { path: 'employees', select: 'firstName lastName email' },
            { path: 'organizations', select: 'name description' }
        ]);

        // Log audit trail
        req.audit('create', 'Event', savedEvent._id, `Event "${savedEvent.name}" created`);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: {
                id: savedEvent._id,
                name: savedEvent.name,
                startDate: savedEvent.startDate,
                endDate: savedEvent.endDate,
                location: savedEvent.location,
                description: savedEvent.description,
                budget: savedEvent.budget,
                createdBy: savedEvent.createdBy,
                organisedBy: savedEvent.organisedBy,
                conveners: savedEvent.Conveners,
                employees: savedEvent.employees,
                organizations: savedEvent.organizations,
                createdAt: savedEvent.createdAt
            }
        });

    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create event',
            error: error.message
        });
    }
});

router.get('/getOne/:id', auth(), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid event ID format'
            });
        }

        const event = await Event.findById(id)
            .populate('createdBy', 'firstName lastName email')
            .populate('organisedBy', '_id name')
            .populate('organizations', '_id name')
            .populate('industries', 'IndustryName')
            .populate('employees', 'firstName lastName email')
            .populate('Conveners', 'firstName lastName email');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

router.get('/getAll', auth(), async (req, res) => {
    try {
        const events = await Event.find()
            .populate('createdBy', 'firstName lastName email')
            .populate('organizations', 'name')
            .populate('industries', 'IndustryName')
            .populate('employees', 'firstName lastName email')
            .populate('Conveners', 'firstName lastName email');
        res.status(200).json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/update/:id', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid event ID format'
            });
        }

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Update fields
        Object.keys(updateData).forEach(key => {
            event[key] = updateData[key];
        });

        const savedEvent = await event.save();

        // Log audit trail
        req.audit('update', 'Event', savedEvent._id, `Event "${savedEvent.name}" updated`);

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            data: savedEvent
        });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update event',
            error: error.message
        });
    }
});

router.delete('/delete/:id', auth(["LPI","PPI"]), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid event ID format'
            });
        }

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

    await Event.deleteOne({ _id: id });

        // Log audit trail
        req.audit('delete', 'Event', event._id, `Event "${event.name}" deleted`);

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete event',
            error: error.message
        });
    }
});

module.exports = router;