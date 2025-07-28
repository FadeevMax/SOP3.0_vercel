// Vercel serverless function to sync from Google Docs
const { GoogleAuth } = require('google-auth-library');
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
        const { documentId, credentials } = req.body;
        
        if (!documentId) {
            return res.status(400).json({ error: 'Document ID is required' });
        }
        
        // Use provided credentials or environment variables
        let serviceAccountKey;
        
        if (credentials) {
            serviceAccountKey = credentials;
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        } else {
            return res.status(400).json({ error: 'Google service account credentials not configured' });
        }
        
        console.log('Initializing Google Auth...');
        
        // Initialize Google Auth with service account
        const auth = new GoogleAuth({
            credentials: serviceAccountKey,
            scopes: [
                'https://www.googleapis.com/auth/documents.readonly',
                'https://www.googleapis.com/auth/drive.readonly'
            ]
        });
        
        const authClient = await auth.getClient();
        const docs = google.docs({ version: 'v1', auth: authClient });
        const drive = google.drive({ version: 'v3', auth: authClient });
        
        console.log('Fetching document content...');
        
        // First, get the document content to check if it exists and has content
        const docResponse = await docs.documents.get({
            documentId: documentId
        });
        
        if (!docResponse.data) {
            return res.status(404).json({ error: 'Document not found or no access' });
        }
        
        console.log('Exporting document as DOCX...');
        
        // Export the document as DOCX
        const exportResponse = await drive.files.export({
            fileId: documentId,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        if (!exportResponse.data) {
            return res.status(500).json({ error: 'Failed to export document' });
        }
        
        console.log('Document exported successfully');
        
        // Convert the response data to base64 for transmission
        const docxBuffer = Buffer.from(exportResponse.data);
        const docxBase64 = docxBuffer.toString('base64');
        
        // Get document metadata
        const fileInfo = await drive.files.get({
            fileId: documentId,
            fields: 'name,modifiedTime,size,version'
        });
        
        const response = {
            success: true,
            document: {
                id: documentId,
                name: fileInfo.data.name,
                modifiedTime: fileInfo.data.modifiedTime,
                size: fileInfo.data.size,
                version: fileInfo.data.version
            },
            docx: {
                data: docxBase64,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: docxBuffer.length
            }
        };
        
        console.log(`Successfully exported document: ${fileInfo.data.name} (${docxBuffer.length} bytes)`);
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('Google Docs sync error:', error);
        
        let errorMessage = 'Failed to sync from Google Docs';
        let statusCode = 500;
        
        if (error.code === 403) {
            errorMessage = 'Access denied. Check service account permissions and document sharing.';
            statusCode = 403;
        } else if (error.code === 404) {
            errorMessage = 'Document not found. Check document ID and access permissions.';
            statusCode = 404;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}