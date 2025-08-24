const express = require('express');
const router = express.Router();
const { single, multiple, driveService, uploadToGoogleDrive } = require('../middleware/upload');
const auth = require('../middleware/auth');

// Apply authentication to all file routes
router.use(auth());

// List files in Google Drive (for debugging/organization)
router.get('/list-drive-files', async (req, res) => {
  try {
    const response = await driveService.drive.files.list({
      q: "trashed=false",
      fields: 'files(id,name,mimeType,size,createdTime,parents,webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 50
    });

    const files = response.data.files;
    const organized = {
      curin_files: files.filter(f => f.name.includes('Curin') || f.name.includes('timestamp')),
      folders: files.filter(f => f.mimeType === 'application/vnd.google-apps.folder'),
      other_files: files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder' && 
                                   !f.name.includes('Curin') && !f.name.includes('timestamp'))
    };

    res.json({
      success: true,
      message: 'Drive files retrieved',
      data: organized,
      total: files.length
    });
  } catch (error) {
    console.error('Error listing drive files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list drive files',
      error: error.message
    });
  }
});

// Organize existing files into folders
router.post('/organize-drive', async (req, res) => {
  try {
    // Find files that look like they're from our app
    const response = await driveService.drive.files.list({
      q: "trashed=false and (name contains 'Screenshot' or name contains 'timestamp' or name contains '.png' or name contains '.jpg' or name contains '.pdf')",
      fields: 'files(id,name,mimeType,parents)',
    });

    const filesToOrganize = response.data.files.filter(f => 
      f.mimeType !== 'application/vnd.google-apps.folder' && 
      (!f.parents || f.parents.length === 0 || f.parents.includes('root'))
    );

    if (filesToOrganize.length === 0) {
      return res.json({
        success: true,
        message: 'No files found to organize',
        moved: 0
      });
    }

    // Create folders if they don't exist
    let mainFolder = await driveService.findFolder('Curin Files');
    if (!mainFolder) {
      mainFolder = await driveService.createFolder('Curin Files');
    }

    let taskFolder = await driveService.findFolder('Task Files', mainFolder.id);
    if (!taskFolder) {
      taskFolder = await driveService.createFolder('Task Files', mainFolder.id);
    }

    // Move files to the task folder
    let movedCount = 0;
    for (const file of filesToOrganize) {
      try {
        await driveService.drive.files.update({
          fileId: file.id,
          addParents: taskFolder.id,
          removeParents: file.parents ? file.parents.join(',') : 'root'
        });
        movedCount++;
      } catch (moveError) {
        console.error(`Failed to move file ${file.name}:`, moveError.message);
      }
    }

    res.json({
      success: true,
      message: `Organized ${movedCount} files into Curin Files/Task Files`,
      moved: movedCount,
      total_found: filesToOrganize.length
    });
  } catch (error) {
    console.error('Error organizing drive:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to organize drive files',
      error: error.message
    });
  }
});

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
