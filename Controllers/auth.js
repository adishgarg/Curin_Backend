const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/google/callback'
);

// Route to initiate Google OAuth
router.get('/google', (req, res) => {
  // Check if environment variables are set
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your-client-id-here') {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.'
    });
  }

  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });
    
    console.log('Visit this URL to authorize the application:');
    console.log(authUrl);
    
    res.json({
      success: true,
      message: 'Visit the provided URL to authorize Google Drive access',
      authUrl: authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL',
      error: error.message
    });
  }
});

// Route to handle OAuth callback - DISPLAY THE ACTUAL TOKEN
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code not provided'
    });
  }

  try {
    console.log('Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    // ===== DISPLAY THE ACTUAL REFRESH TOKEN =====
    console.log('\n' + '='.repeat(80));
    console.log('🔑 COPY THIS REFRESH TOKEN TO YOUR .env FILE:');
    console.log('='.repeat(80));
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('='.repeat(80));
    console.log('⬆️ Copy the line above to your .env file and restart the server');
    console.log('='.repeat(80) + '\n');
    
    oauth2Client.setCredentials(tokens);

    res.send(`
      <html>
        <body>
          <h2>Authorization Successful!</h2>
          <p>The application has been authorized successfully.</p>
          <p><strong>IMPORTANT:</strong> Check your server console for the refresh token.</p>
          <p>Copy the GOOGLE_REFRESH_TOKEN line to your .env file and restart your server.</p>
          <script>
            // Auto-close this window after 5 seconds
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authorization failed',
      error: 'Please try the authorization process again'
    });
  }
});

// Route to test Google Drive access
router.get('/test-drive', async (req, res) => {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Google refresh token not configured. Please authorize first.'
      });
    }

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Test by listing files
    const response = await drive.files.list({
      pageSize: 5,
      fields: 'nextPageToken, files(id, name)',
    });
    
    res.json({
      success: true,
      message: 'Google Drive access working!',
      files: response.data.files
    });
  } catch (error) {
    console.error('Error testing Google Drive access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access Google Drive',
      error: error.message
    });
  }
});

module.exports = router;
