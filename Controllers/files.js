const express = require('express');
const router = express.Router();
const { single, multiple, driveService, uploadToGoogleDrive } = require('../middleware/upload');
const auth = require('../middleware/auth');

// Apply authentication to all file routes
router.use(auth());

// Upload single file to Google Drive
router.post('/upload', single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to Google Drive
    const fileInfo = await uploadToGoogleDrive(req.file, 'tasks');

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully to Google Drive',
      data: fileInfo
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

// Upload multiple files to Google Drive
router.post('/upload-multiple', multiple('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Upload all files to Google Drive
    const uploadPromises = req.files.map(file => uploadToGoogleDrive(file, 'tasks'));
    const filesInfo = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      message: `${req.files.length} files uploaded successfully to Google Drive`,
      data: filesInfo
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

// Upload file for remarks
router.post('/upload-remark', single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to Google Drive in remarks folder
    const fileInfo = await uploadToGoogleDrive(req.file, 'remarks');

    res.status(200).json({
      success: true,
      message: 'Remark file uploaded successfully to Google Drive',
      data: fileInfo
    });
  } catch (error) {
    console.error('Remark file upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Remark file upload failed',
      error: error.message
    });
  }
});

// Get file info from Google Drive
router.get('/info/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileInfo = await driveService.getFileInfo(fileId);

    res.status(200).json({
      success: true,
      data: {
        id: fileInfo.id,
        name: fileInfo.name,
        mimeType: fileInfo.mimeType,
        size: parseInt(fileInfo.size) || 0,
        createdTime: fileInfo.createdTime,
        modifiedTime: fileInfo.modifiedTime,
        viewUrl: fileInfo.webViewLink,
        downloadUrl: fileInfo.webContentLink
      }
    });
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not get file info',
      error: error.message
    });
  }
});

// Delete file from Google Drive
router.delete('/delete/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    await driveService.deleteFile(fileId);
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully from Google Drive'
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({
      success: false,
      message: 'File deletion failed',
      error: error.message
    });
  }
});

// Download file from Google Drive (proxy download)
router.get('/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Get file info first
    const fileInfo = await driveService.getFileInfo(fileId);
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`);
    res.setHeader('Content-Type', fileInfo.mimeType);
    
    // Get file stream from Google Drive
    const fileStream = await driveService.downloadFile(fileId);
    
    // Stream the file to response
    res.send(fileStream);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: 'File download failed',
      error: error.message
    });
  }
});

// Get direct Google Drive view URL (for viewing in browser)
router.get('/view/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileInfo = await driveService.getFileInfo(fileId);
    
    res.redirect(fileInfo.webViewLink);
  } catch (error) {
    console.error('File view error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not get file view URL',
      error: error.message
    });
  }
});

// Create folder in Google Drive
router.post('/create-folder', async (req, res) => {
  try {
    const { folderName, parentFolderId } = req.body;
    
    if (!folderName) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    const folder = await driveService.createFolder(folderName, parentFolderId);
    
    res.status(200).json({
      success: true,
      message: 'Folder created successfully',
      data: folder
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Folder creation failed',
      error: error.message
    });
  }
});

module.exports = router;
