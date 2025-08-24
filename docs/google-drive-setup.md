# Google Drive Integration Setup Guide

## Prerequisites
1. Google Cloud Console account
2. Google Drive API enabled
3. Service Account created with appropriate permissions

## Step-by-Step Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create Service Account
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in service account details:
   - Name: `curin-drive-service`
   - Description: `Service account for Curin file uploads`
4. Grant roles:
   - `Editor` (for full Drive access)
   - OR `Storage Admin` (for limited storage access)
5. Click "Done"

### 3. Generate Service Account Key
1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the JSON file
6. Rename it to `google-service-account.json`
7. Place it in `/config/` directory of your project

### 4. Create Google Drive Folders
1. Open [Google Drive](https://drive.google.com/)
2. Create folder structure:
   ```
   📁 Curin App Files
   ├── 📁 Tasks
   └── 📁 Remarks
   ```
3. Get folder IDs:
   - Right-click on folder > "Get link"
   - Copy the folder ID from URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### 5. Share Folders with Service Account
1. Right-click on each folder > "Share"
2. Add your service account email (found in the JSON key file)
3. Give "Editor" permissions
4. Click "Send"

### 6. Update Environment Variables
Add to your `.env` file:
```env
# Google Drive Configuration
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./config/google-service-account.json
GOOGLE_DRIVE_TASKS_FOLDER_ID=your_tasks_folder_id_here
GOOGLE_DRIVE_REMARKS_FOLDER_ID=your_remarks_folder_id_here
```

### 7. Security Best Practices
1. **Never commit** the `google-service-account.json` file to version control
2. Add to `.gitignore`:
   ```
   config/google-service-account.json
   .env
   ```
3. Use environment variables in production
4. Rotate service account keys regularly
5. Use principle of least privilege for folder permissions

## Directory Structure
```
curin/
├── config/
│   └── google-service-account.json  # ⚠️ Keep private!
├── middleware/
│   └── upload.js                    # Updated for Google Drive
├── Controllers/
│   └── files.js                     # Google Drive file operations
└── .env                             # Environment variables
```

## Usage Examples

### Upload File
```javascript
POST /api/files/upload
Content-Type: multipart/form-data

file: [your-file]
```

### Upload Multiple Files
```javascript
POST /api/files/upload-multiple
Content-Type: multipart/form-data

files: [file1, file2, file3]
```

### Get File Info
```javascript
GET /api/files/info/:fileId
```

### Download File
```javascript
GET /api/files/download/:fileId
```

### Delete File
```javascript
DELETE /api/files/delete/:fileId
```

## Testing
1. Start your server
2. Use Postman or curl to test file uploads
3. Check Google Drive folders for uploaded files
4. Verify file permissions and accessibility

## Troubleshooting
- **403 Forbidden**: Check service account permissions
- **404 Not Found**: Verify folder IDs in environment variables
- **Authentication Error**: Check service account JSON file path
- **File Size Error**: Increase size limits in upload middleware
