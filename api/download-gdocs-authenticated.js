// Authenticated Google Docs DOCX download using service account
// Based on the Python code: download_gdoc_as_docx function with proper authentication

const { google } = require('googleapis');

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        console.log('🔄 Starting authenticated Google Docs DOCX download...');
        
        const { documentId, documentName } = req.body;
        const docId = documentId || '1BXxlyLsOL6hsVWLXB84p35yRg9yr7AL9fzz4yjVQJgA';
        const docName = documentName || 'GTI Data Base and SOP';
        
        // Build service account from individual environment variables
        let serviceAccountKey;
        
        if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
            // Use individual env vars (this should work now)
            serviceAccountKey = {
                type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || 'service_account',
                project_id: process.env.GOOGLE_PROJECT_ID,
                private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                client_id: process.env.GOOGLE_CLIENT_ID,
                auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
                token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL)}`,
                universe_domain: 'googleapis.com'
            };
            console.log('✅ Built service account from individual env vars');
        } else {
            throw new Error('Google service account credentials not configured');
        }
        
        console.log('🔐 Authenticating with Google API...');
        
        // Create JWT auth (simpler than OAuth2 for service accounts)
        const jwtClient = new google.auth.JWT(
            serviceAccountKey.client_email,
            null, // key file (we're passing the key directly)
            serviceAccountKey.private_key,
            ['https://www.googleapis.com/auth/drive.readonly'], // scope
            null // subject (for domain delegation, not needed here)
        );
        
        // Authorize the client
        await jwtClient.authorize();
        console.log('✅ Authentication successful');
        
        // Create Drive API instance
        const drive = google.drive({ version: 'v3', auth: jwtClient });
        
        console.log(`📥 Downloading DOCX for document: ${docId}`);
        
        // Export the document as DOCX (like Python code)
        const response = await drive.files.export({
            fileId: docId,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        if (!response.data) {
            throw new Error('No data received from Google Drive export');
        }
        
        console.log(`✅ Successfully downloaded DOCX: ${response.data.length} bytes`);
        
        // Convert to base64 for transmission
        const docxBuffer = Buffer.from(response.data);
        const docxBase64 = docxBuffer.toString('base64');
        
        // Get document metadata
        const fileInfo = await drive.files.get({
            fileId: docId,
            fields: 'name,modifiedTime,size,version'
        });
        
        // Save the DOCX file locally for download capability
        const fs = require('fs');
        const path = require('path');
        const docxFileName = `${docName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
        const docxPath = path.join('/tmp', docxFileName);
        
        try {
            fs.writeFileSync(docxPath, docxBuffer);
            console.log(`💾 DOCX saved locally: ${docxPath}`);
        } catch (saveError) {
            console.warn('⚠️ Could not save DOCX locally:', saveError.message);
        }
        
        const responseData = {
            success: true,
            method: 'authenticated_download',
            document: {
                id: docId,
                name: fileInfo.data.name || docName,
                modifiedTime: fileInfo.data.modifiedTime || new Date().toISOString(),
                size: fileInfo.data.size,
                version: fileInfo.data.version,
                downloadUrl: `/api/download-file/${docxFileName}`
            },
            docx: {
                data: docxBase64,
                filename: docxFileName,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: docxBuffer.length
            },
            metadata: {
                source: 'google_docs_authenticated',
                downloadMethod: 'service_account_jwt',
                timestamp: new Date().toISOString(),
                authEmail: serviceAccountKey.client_email
            }
        };
        
        console.log(`🎉 Authenticated DOCX download completed successfully`);
        res.status(200).json(responseData);
        
    } catch (error) {
        console.error('Authenticated Google Docs download error:', error);
        
        // Enhanced error handling
        let errorMessage = 'Failed to download DOCX from Google Docs';
        let statusCode = 500;
        let suggestions = [];
        
        if (error.message.includes('invalid_grant') || error.message.includes('JWT')) {
            errorMessage = 'Authentication failed - service account credentials may be invalid';
            statusCode = 401;
            suggestions = [
                'Check that GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are correctly set',
                'Verify the service account has access to the document',
                'Ensure the private key format is correct (with proper \\n newlines)'
            ];
        } else if (error.message.includes('403')) {
            errorMessage = 'Access denied - service account does not have permission to access this document';
            statusCode = 403;
            suggestions = [
                'Share the Google Doc with the service account email: ' + process.env.GOOGLE_CLIENT_EMAIL,
                'Ensure the service account has "Viewer" or "Editor" permissions',
                'Check that the document ID is correct'
            ];
        } else if (error.message.includes('404')) {
            errorMessage = 'Document not found';
            statusCode = 404;
            suggestions = [
                'Verify the document ID is correct: ' + req.body.documentId,
                'Check that the document exists and is not deleted'
            ];
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.message,
            documentId: req.body.documentId,
            serviceAccountEmail: process.env.GOOGLE_CLIENT_EMAIL,
            suggestions: suggestions
        });
    }
}