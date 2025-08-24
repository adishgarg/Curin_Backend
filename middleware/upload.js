const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

// Google Drive configuration with OAuth
class GoogleDriveService {
  constructor() {
    console.log('Initializing GoogleDriveService...');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set');
    console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? 'Set' : 'Not set');
    
    // OAuth2 credentials from Google Cloud Console
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    );

    // Set refresh token (you'll need to obtain this)
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
      console.log('Refresh token set successfully');
    } else {
      console.error('No refresh token found in environment variables');
      throw new Error('Google refresh token not configured');
    }

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // Method to get authorization URL
  getAuthUrl() {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });
    return authUrl;
  }

  // Method to exchange authorization code for tokens
  async getTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async uploadFile(fileBuffer, fileName, mimeType, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: fileName,
        parents: parentFolderId ? [parentFolderId] : undefined,
      };

      const media = {
        mimeType: mimeType,
        body: Readable.from(fileBuffer),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,mimeType,size,createdTime,webViewLink,webContentLink',
      });

      // Make file publicly accessible (optional)
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      return true;
    } catch (error) {
      console.error('Google Drive delete error:', error);
      throw error;
    }
  }

  async getFileInfo(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink',
      });
      return response.data;
    } catch (error) {
      console.error('Google Drive get file info error:', error);
      throw error;
    }
  }

  async downloadFile(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return response.data;
    } catch (error) {
      console.error('Google Drive download error:', error);
      throw error;
    }
  }

  // Folder management methods
  async findFolder(folderName, parentId = null) {
    try {
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id,name)',
      });

      return response.data.files.length > 0 ? response.data.files[0] : null;
    } catch (error) {
      console.error('Error finding folder:', error);
      return null;
    }
  }

  async createFolder(folderName, parentId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id,name',
      });

      console.log(`Created folder: ${folderName} (ID: ${response.data.id})`);
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined,
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id,name',
      });

      return response.data;
    } catch (error) {
      console.error('Google Drive create folder error:', error);
      throw error;
    }
  }
}

// Initialize Google Drive service
const driveService = new GoogleDriveService();

// Configure multer to use memory storage (files will be uploaded to Google Drive)
const storage = multer.memoryStorage();

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // More comprehensive MIME type checking
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip', 'application/x-rar-compressed',
    'video/mp4', 'video/quicktime', 'video/x-msvideo'
  ];
  
  const mimetype = allowedMimes.includes(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, documents, archives, and videos are allowed'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (Google Drive allows larger files)
  },
  fileFilter: fileFilter
});

// Helper function to upload to Google Drive
const uploadToGoogleDrive = async (file, folderType = 'tasks') => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const fileName = `${timestamp}-${randomSuffix}-${file.originalname}`;
    
    // Create or get folder for organization
    const driveService = new GoogleDriveService();
    let parentFolderId = null;
    
    // Create/find the main "Curin Files" folder
    const mainFolderName = 'Curin Files';
    const subFolderName = folderType === 'tasks' ? 'Task Files' : 'Remark Files';
    
    try {
      // Find or create main folder
      let mainFolder = await driveService.findFolder(mainFolderName);
      if (!mainFolder) {
        mainFolder = await driveService.createFolder(mainFolderName);
        console.log(`Created main folder: ${mainFolderName}`);
      }
      
      // Find or create subfolder
      let subFolder = await driveService.findFolder(subFolderName, mainFolder.id);
      if (!subFolder) {
        subFolder = await driveService.createFolder(subFolderName, mainFolder.id);
        console.log(`Created subfolder: ${subFolderName}`);
      }
      
      parentFolderId = subFolder.id;
    } catch (folderError) {
      console.log('Could not create/find folders, uploading to root:', folderError.message);
    }
    
    // Upload to Google Drive
    const driveFile = await driveService.uploadFile(
      file.buffer,
      fileName,
      file.mimetype,
      parentFolderId
    );

    return {
      fileId: driveFile.id,
      filename: fileName,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: parseInt(driveFile.size) || file.size,
      url: driveFile.webViewLink,
      downloadUrl: driveFile.webContentLink,
      uploadedAt: new Date(driveFile.createdTime)
    };
  } catch (error) {
    console.error('Upload to Google Drive failed:', error);
    throw error;
  }
};

module.exports = {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),
  
  // Multiple files upload
  multiple: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),
  
  // Mixed fields upload
  fields: (fields) => upload.fields(fields),
  
  // Google Drive service
  driveService,
  
  // Helper function to upload to Google Drive
  uploadToGoogleDrive
};
