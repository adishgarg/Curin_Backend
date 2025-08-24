const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const audit = require('../middleware/audit');
const { multiple, uploadToGoogleDrive } = require('../middleware/upload');
const mongoose = require('mongoose');

router.use(auth());
router.use(audit());

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
};

router.get('/getAll', async (req, res) => {
     try{
         const tasks = await Task.find()
             .populate('createdBy', 'name email role')
             .populate('assignedTo', 'name email role') 
             .populate('partnerOrganizations', 'name description industry')
             .populate('industriesInvolved', 'name description');
         
         // Transform data to match frontend expectations
         const transformedTasks = tasks.map(task => ({
             id: task._id,
             taskName: task.title,
             description: task.description,
             createdBy: {
                 id: task.createdBy._id,
                 name: task.createdBy.name,
                 email: task.createdBy.email,
                 role: task.createdBy.role
             },
             employeesAssigned: task.assignedTo.map(emp => ({
                 id: emp._id,
                 name: emp.name,
                 email: emp.email,
                 role: emp.role
             })),
             status: task.status.toLowerCase().replace(' ', '-'), // 'In Progress' -> 'in-progress'
             startDate: task.startDate,
             endDate: task.endDate,
             files: task.files,
             partnerOrganizations: [{
                 id: task.partnerOrganizations._id,
                 name: task.partnerOrganizations.name,
                 description: task.partnerOrganizations.description,
                 industry: task.partnerOrganizations.industry
             }],
             industriesInvolved: [{
                 id: task.industriesInvolved._id,
                 name: task.industriesInvolved.name,
                 description: task.industriesInvolved.description
             }],
             createdAt: task.createdAt,
             updatedAt: task.updatedAt
         }));

         res.status(200).json({
             success: true,
             data: transformedTasks
         });
     } catch (error) {
         console.error('Error fetching tasks:', error);
         res.status(500).json({
             success: false,
             message: 'Server Error'
         });
     }
 })

router.post('/create', multiple('files', 5), async (req, res) => {
     // Debug the raw request body
     console.log('Raw req.body:', req.body);
     console.log('req.body type:', typeof req.body);
     console.log('req.files:', req.files);
     
     // Handle JSON data sent as form fields (when files are included)
     let parsedData = {};
     
     // Try to parse if data is sent as a JSON string in a field called 'data'
     if (req.body.data && typeof req.body.data === 'string') {
         try {
             parsedData = JSON.parse(req.body.data);
         } catch (e) {
             console.log('Failed to parse JSON data:', e.message);
         }
     } else {
         // Use the body directly if it's already an object
         parsedData = req.body;
     }
     
     console.log('Parsed data:', parsedData);
     
     // Map frontend request to backend schema
     const {
         taskName,
         description,
         createdBy,
         employeesAssigned,
         status,
         startDate,
         endDate,
         partnerOrganizations,
         industriesInvolved
     } = parsedData;

     // Extract IDs from frontend objects
     const title = taskName;
     const createdById = createdBy?.id;
     const assignedToIds = employeesAssigned?.map(emp => emp.id) || [];
     const partnerOrgId = partnerOrganizations?.[0]?.id;
     const industryId = industriesInvolved?.[0]?.id;

     // Map status from frontend to backend enum
     const statusMap = {
         'active': 'In Progress',
         'pending': 'In Progress',
         'in-progress': 'In Progress',
         'completed': 'Completed',
         'cancelled': 'Cancelled'
     };
     const mappedStatus = statusMap[status?.toLowerCase()] || 'In Progress';

     // Debug logging
     console.log('Validation debug:', {
         title,
         description,
         createdById,
         assignedToIds,
         partnerOrgId,
         industryId,
         startDate,
         endDate
     });

     // Input validation
     const errors = [];
     
     if (!title || title.trim().length === 0) {
         errors.push('Task name is required');
     }
     
     if (!description || description.trim().length === 0) {
         errors.push('Description is required');
     }
     
     if (!createdById) {
         errors.push('Created by employee is required');
     } else if (!isValidObjectId(createdById)) {
         console.log('Invalid createdById:', createdById);
         errors.push('Created by employee ID must be valid');
     }
     
     if (!assignedToIds || assignedToIds.length === 0) {
         errors.push('At least one assigned employee is required');
     } else {
         const invalidIds = assignedToIds.filter(id => !isValidObjectId(id));
         if (invalidIds.length > 0) {
             console.log('Invalid assignedToIds:', invalidIds);
             errors.push('All assigned employee IDs must be valid');
         }
     }
     
     if (!partnerOrgId) {
         errors.push('Partner organization is required');
     } else if (!isValidObjectId(partnerOrgId)) {
         console.log('Invalid partnerOrgId:', partnerOrgId);
         errors.push('Partner organization ID must be valid');
     }
     
     if (!industryId) {
         errors.push('Industry is required');
     } else if (!isValidObjectId(industryId)) {
         console.log('Invalid industryId:', industryId);
         errors.push('Industry ID must be valid');
     }

     if (!startDate || !endDate) {
         errors.push('Start date and end date are required');
     } else {
         const start = new Date(startDate);
         const end = new Date(endDate);
         if (start >= end) {
             errors.push('End date must be after start date');
         }
     }

     if (errors.length > 0) {
         return res.status(400).json({
             success: false,
             message: 'Validation failed',
             errors: errors
         });
     }

     try {
         // Handle file uploads to Google Drive
         let uploadedFiles = [];
         if (req.files && req.files.length > 0) {
             console.log(`Uploading ${req.files.length} files to Google Drive...`);
             const uploadPromises = req.files.map(file => uploadToGoogleDrive(file, 'tasks'));
             uploadedFiles = await Promise.all(uploadPromises);
         }

         const newTask = new Task({
             title,
             description,
             createdBy: createdById,
             assignedTo: assignedToIds,
             status: mappedStatus,
             startDate: new Date(startDate),
             endDate: new Date(endDate),
             files: uploadedFiles,
             partnerOrganizations: partnerOrgId,
             industriesInvolved: industryId
         });

         const savedTask = await newTask.save();

         if (req.audit) {
           await req.audit({
             action: 'create',
             resourceType: 'Task',
             resourceId: savedTask._id,
             changes: [{ field: 'title', oldValue: null, newValue: title }],
             remarks: 'Task created via API'
           });
         }

         res.status(201).json({
             success: true,
             data: savedTask
         });
     } catch (error) {
         console.error('Error creating task:', error);
         
         // Handle mongoose validation errors
         if (error.name === 'ValidationError') {
             const validationErrors = Object.values(error.errors).map(err => err.message);
             return res.status(400).json({
                 success: false,
                 message: 'Validation failed',
                 errors: validationErrors
             });
         }
         
         res.status(500).json({
             success: false,
             message: 'Server Error'
         });
     }
});

// Get a single task by ID
router.get('/get/:id', async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }
    
    try {
        const task = await Task.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .populate('partnerOrganizations', 'name description industry')
            .populate('industriesInvolved', 'name description');
            
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Transform to frontend format
        const transformedTask = {
            id: task._id,
            taskName: task.title,
            description: task.description,
            createdBy: {
                id: task.createdBy._id,
                name: task.createdBy.name,
                email: task.createdBy.email,
                role: task.createdBy.role
            },
            employeesAssigned: task.assignedTo.map(emp => ({
                id: emp._id,
                name: emp.name,
                email: emp.email,
                role: emp.role
            })),
            status: task.status.toLowerCase().replace(' ', '-'),
            startDate: task.startDate,
            endDate: task.endDate,
            files: task.files,
            partnerOrganizations: [{
                id: task.partnerOrganizations._id,
                name: task.partnerOrganizations.name,
                description: task.partnerOrganizations.description,
                industry: task.partnerOrganizations.industry
            }],
            industriesInvolved: [{
                id: task.industriesInvolved._id,
                name: task.industriesInvolved.name,
                description: task.industriesInvolved.description
            }],
            remarks: task.remarks,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        };

        res.status(200).json({ success: true, data: transformedTask });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Update a task by ID
router.put('/update/:id', multiple('files', 5), async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }
    
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Map frontend request to backend schema (similar to create route)
        const {
            taskName,
            description,
            employeesAssigned,
            status,
            startDate,
            endDate,
            files,
            partnerOrganizations,
            industriesInvolved,
            remarks: newRemarkText
        } = req.body;

        const updates = {};
        const changes = [];

        // Map frontend fields to backend schema
        if (taskName !== undefined) updates.title = taskName;
        if (description !== undefined) updates.description = description;
        if (employeesAssigned !== undefined) {
            const assignedToIds = employeesAssigned?.map(emp => emp.id) || [];
            // Validate ObjectIds
            const invalidIds = assignedToIds.filter(id => !isValidObjectId(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'All assigned employee IDs must be valid' 
                });
            }
            updates.assignedTo = assignedToIds;
        }
        if (status !== undefined) {
            // Map status from frontend to backend enum
            const statusMap = {
                'active': 'In Progress',
                'pending': 'In Progress',
                'in-progress': 'In Progress',
                'completed': 'Completed',
                'cancelled': 'Cancelled'
            };
            updates.status = statusMap[status?.toLowerCase()] || 'In Progress';
        }
        if (startDate !== undefined) updates.startDate = new Date(startDate);
        if (endDate !== undefined) updates.endDate = new Date(endDate);
        
        // Handle file uploads to Google Drive
        if (req.files && req.files.length > 0) {
            console.log(`Uploading ${req.files.length} new files to Google Drive...`);
            const uploadPromises = req.files.map(file => uploadToGoogleDrive(file, 'tasks'));
            const newUploadedFiles = await Promise.all(uploadPromises);
            
            // Append new files to existing files
            updates.files = [...(task.files || []), ...newUploadedFiles];
        }
        if (partnerOrganizations !== undefined) {
            const partnerOrgId = partnerOrganizations?.[0]?.id;
            if (partnerOrgId && !isValidObjectId(partnerOrgId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Partner organization ID must be valid' 
                });
            }
            updates.partnerOrganizations = partnerOrgId;
        }
        if (industriesInvolved !== undefined) {
            const industryId = industriesInvolved?.[0]?.id;
            if (industryId && !isValidObjectId(industryId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Industry ID must be valid' 
                });
            }
            updates.industriesInvolved = industryId;
        }

        // Validate date range if both dates are provided
        if (updates.startDate && updates.endDate && updates.startDate >= updates.endDate) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }

        // Track changes for audit
        Object.keys(updates).forEach(field => {
            const oldVal = task[field];
            const newVal = updates[field];
            const oldStr = (oldVal === undefined || oldVal === null) ? '' : oldVal.toString();
            const newStr = (newVal === undefined || newVal === null) ? '' : newVal.toString();

            if (oldStr !== newStr) {
                changes.push({
                    field,
                    oldValue: oldVal,
                    newValue: newVal
                });
                task[field] = updates[field];
            }
        });

        // Handle remarks - add new remark if provided
        if (newRemarkText && newRemarkText.trim()) {
            // Handle remark file uploads if any files are marked for remarks
            let remarkFiles = [];
            // Note: In a more sophisticated implementation, you could have separate file fields
            // for now, we'll use a flag or convention to identify remark files
            
            const newRemark = {
                text: newRemarkText.trim(),
                createdAt: new Date(),
                files: remarkFiles
            };
            
            task.remarks.push(newRemark);
            changes.push({
                field: 'remarks',
                oldValue: null,
                newValue: `Added remark: ${newRemarkText}`
            });
        }

        const updatedTask = await task.save();

        if (req.audit && changes.length > 0) {
          await req.audit({
            action: 'update',
            resourceType: 'Task',
            resourceId: updatedTask._id,
            changes,
            remarks: newRemarkText || 'Task updated'
          });
        }

        res.status(200).json({ success: true, data: updatedTask });
    } catch (error) {
        console.error('Error updating task:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Delete a task by ID
router.delete('/delete/:id', async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }
    
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        if (req.audit) {
          await req.audit({
            action: 'delete',
            resourceType: 'Task',
            resourceId: task._id,
            remarks: 'Task deleted via API',
            metadata: { deletedDocument: { title: task.title } }
          });
        }

        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Add remark with files to a task
router.post('/:id/remarks', multiple('files', 3), async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }
    
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const { text } = req.body;
        
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Remark text is required' 
            });
        }

        // Handle file uploads for the remark
        let remarkFiles = [];
        if (req.files && req.files.length > 0) {
            console.log(`Uploading ${req.files.length} remark files to Google Drive...`);
            const uploadPromises = req.files.map(file => uploadToGoogleDrive(file, 'remarks'));
            remarkFiles = await Promise.all(uploadPromises);
        }

        // Add the new remark
        const newRemark = {
            text: text.trim(),
            createdAt: new Date(),
            files: remarkFiles
        };
        
        task.remarks.push(newRemark);
        const updatedTask = await task.save();

        // Audit the remark addition
        if (req.audit) {
            await req.audit({
                action: 'update',
                resourceType: 'Task',
                resourceId: updatedTask._id,
                changes: [{
                    field: 'remarks',
                    oldValue: null,
                    newValue: `Added remark: ${text.trim()}`
                }],
                remarks: `Remark added with ${remarkFiles.length} files`
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Remark added successfully',
            data: {
                remark: newRemark,
                task: updatedTask
            }
        });
    } catch (error) {
        console.error('Error adding remark:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.get('/assignedToMe', async (req, res) => {
    const userId = req.user?.id;
    if (!userId || !isValidObjectId(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID in token' });
    }

    try {
        const tasks = await Task.find({ assignedTo: userId })
            .populate('createdBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .populate('partnerOrganizations', 'name description industry')
            .populate('industriesInvolved', 'name description');

        const transformedTasks = tasks.map(task => ({
            id: task._id,
            taskName: task.title,
            description: task.description,
            createdBy: {
                id: task.createdBy._id,
                name: task.createdBy.name,
                email: task.createdBy.email,
                role: task.createdBy.role
            },
            employeesAssigned: task.assignedTo.map(emp => ({
                id: emp._id,
                name: emp.name,
                email: emp.email,
                role: emp.role
            })),
            status: task.status.toLowerCase().replace(' ', '-'),
            startDate: task.startDate,
            endDate: task.endDate,
            files: task.files,
            partnerOrganizations: [{
                id: task.partnerOrganizations._id,
                name: task.partnerOrganizations.name,
                description: task.partnerOrganizations.description,
                industry: task.partnerOrganizations.industry
            }],
            industriesInvolved: [{
                id: task.industriesInvolved._id,
                name: task.industriesInvolved.name,
                description: task.industriesInvolved.description
            }],
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));

        res.status(200).json({
            success: true,
            data: transformedTasks
        });
    } catch (error) {
        console.error('Error fetching assigned tasks:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;