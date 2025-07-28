// Simple Google Docs DOCX download - bypasses OpenSSL authentication issues
// Based on the Python code: download_gdoc_as_docx function

const fs = require('fs');
const path = require('path');

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
        console.log('🔄 Starting Google Docs DOCX download...');
        
        const { documentId, documentName } = req.body;
        const docId = documentId || '1BXxlyLsOL6hsVWLXB84p35yRg9yr7AL9fzz4yjVQJgA';
        const docName = documentName || 'GTI Data Base and SOP';
        
        // Try direct Google Drive export URL (public documents)
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;
        
        console.log(`📥 Attempting direct download from: ${exportUrl}`);
        
        // Try to fetch directly without authentication
        const response = await fetch(exportUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GTI-SOP-Bot/1.0)'
            }
        });
        
        if (!response.ok) {
            console.log(`❌ Direct download failed: ${response.status} ${response.statusText}`);
            
            // Provide specific error messages and instructions
            let errorMessage = 'Failed to download document';
            let instructions = [];
            
            if (response.status === 401 || response.status === 403) {
                errorMessage = 'Document access denied - document is not publicly accessible';
                instructions = [
                    '1. Open your Google Doc: https://docs.google.com/document/d/' + docId,
                    '2. Click "Share" button in top right',
                    '3. Click "Anyone with the link"',
                    '4. Set permission to "Viewer"',
                    '5. Click "Done" and try sync again'
                ];
            } else if (response.status === 404) {
                errorMessage = 'Document not found';
                instructions = [
                    'Please check that the document ID is correct',
                    'Current ID: ' + docId
                ];
            }
            
            // If direct download fails, return the existing processed data as fallback
            const fallbackPath = path.join(process.cwd(), 'semantic_chunks.json');
            if (fs.existsSync(fallbackPath)) {
                console.log('📋 Using existing processed data as fallback');
                const existingData = fs.readFileSync(fallbackPath, 'utf8');
                const chunks = JSON.parse(existingData);
                
                return res.status(200).json({
                    success: true,
                    method: 'fallback_processed_data',
                    document: {
                        id: docId,
                        name: docName,
                        modifiedTime: new Date().toISOString(),
                        note: 'Using existing processed data - direct download failed'
                    },
                    chunks: chunks,
                    warning: {
                        message: errorMessage,
                        status: response.status,
                        instructions: instructions
                    },
                    metadata: {
                        source: 'existing_processed_data',
                        chunkCount: chunks.length,
                        note: 'To get fresh data, make the Google Doc publicly accessible'
                    }
                });
            }
            
            // If no fallback data, return error with instructions
            return res.status(response.status).json({
                error: errorMessage,
                status: response.status,
                instructions: instructions,
                documentUrl: `https://docs.google.com/document/d/${docId}`,
                suggestions: [
                    'Make the Google Doc publicly accessible (Anyone with the link can view)',
                    'Check that the document ID is correct',
                    'Ensure the document exists and is not deleted'
                ]
            });
        }
        
        // Get the DOCX content
        const docxBuffer = await response.arrayBuffer();
        const docxBase64 = Buffer.from(docxBuffer).toString('base64');
        
        console.log(`✅ Successfully downloaded DOCX: ${docxBuffer.byteLength} bytes`);
        
        // Save the DOCX file locally for download capability
        const docxFileName = `${docName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
        const docxPath = path.join('/tmp', docxFileName); // Vercel tmp directory
        
        try {
            fs.writeFileSync(docxPath, Buffer.from(docxBuffer));
            console.log(`💾 DOCX saved locally: ${docxPath}`);
        } catch (saveError) {
            console.warn('⚠️ Could not save DOCX locally:', saveError.message);
        }
        
        // Return the DOCX data for processing
        const response_data = {
            success: true,
            method: 'direct_download',
            document: {
                id: docId,
                name: docName,
                modifiedTime: new Date().toISOString(),
                size: docxBuffer.byteLength.toString(),
                downloadUrl: `/api/download-file/${docxFileName}`
            },
            docx: {
                data: docxBase64,
                filename: docxFileName,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: docxBuffer.byteLength
            },
            metadata: {
                source: 'google_docs_direct_download',
                downloadMethod: 'public_export_url',
                timestamp: new Date().toISOString()
            }
        };
        
        console.log(`🎉 DOCX download completed successfully`);
        res.status(200).json(response_data);
        
    } catch (error) {
        console.error('Google Docs DOCX download error:', error);
        
        // Enhanced error handling with specific messages
        let errorMessage = 'Failed to download DOCX from Google Docs';
        let statusCode = 500;
        
        if (error.message.includes('403')) {
            errorMessage = 'Document access denied. Please ensure the document is publicly accessible or shared properly.';
            statusCode = 403;
        } else if (error.message.includes('404')) {
            errorMessage = 'Document not found. Please check the document ID.';
            statusCode = 404;
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error accessing Google Docs. Please try again.';
            statusCode = 502;
        }
        
        res.status(statusCode).json({ 
            error: errorMessage,
            details: error.message,
            documentId: req.body.documentId,
            suggestions: [
                'Ensure the Google Doc is publicly accessible (Anyone with the link can view)',
                'Check that the document ID is correct',
                'Try again in a few moments'
            ]
        });
    }
}