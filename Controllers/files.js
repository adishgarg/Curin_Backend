const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

// Apply authentication to all file routes
router.use(auth());

// Upload single file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/api/files/download/${req.file.filename}`,
      uploadedAt: new Date()
    };

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: fileInfo
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Upload multiple files
router.post('/upload-multiple', upload.multiple('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const filesInfo = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/api/files/download/${file.filename}`,
      uploadedAt: new Date()
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} files uploaded successfully`,
      data: filesInfo
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Download/serve file
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Check in both tasks and remarks folders
    let filePath = path.join(__dirname, '../uploads/tasks/', filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../uploads/remarks/', filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Set appropriate headers
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: 'File download failed'
    });
  }
});

// Delete file
router.delete('/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Check in both tasks and remarks folders
    let filePath = path.join(__dirname, '../uploads/tasks/', filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../uploads/remarks/', filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      message: 'File deletion failed'
    });
  }
});

// Get file info
router.get('/info/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Check in both tasks and remarks folders
    let filePath = path.join(__dirname, '../uploads/tasks/', filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../uploads/remarks/', filename);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const stat = fs.statSync(filePath);
    const fileInfo = {
      filename: filename,
      size: stat.size,
      createdAt: stat.birthtime,
      modifiedAt: stat.mtime,
      url: `/api/files/download/${filename}`
    };

    res.status(200).json({
      success: true,
      data: fileInfo
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not get file info'
    });
  }
});

module.exports = router;
