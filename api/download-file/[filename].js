// File download endpoint for DOCX files
const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
    const { filename } = req.query;
    
    if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Filename is required' });
    }
    
    // Security: only allow specific file types and sanitize filename
    const allowedExtensions = ['.docx', '.pdf', '.json'];
    const ext = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({ error: 'File type not allowed' });
    }
    
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join('/tmp', sanitizedFilename);
    
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Get file stats
        const stats = fs.statSync(filePath);
        
        // Set appropriate headers
        res.setHeader('Content-Type', getContentType(ext));
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        // Clean up file after a delay (optional)
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🧹 Cleaned up temporary file: ${sanitizedFilename}`);
                }
            } catch (cleanupError) {
                console.warn('Failed to cleanup temporary file:', cleanupError.message);
            }
        }, 60000); // Clean up after 1 minute
        
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
}

function getContentType(ext) {
    const mimeTypes = {
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.pdf': 'application/pdf',
        '.json': 'application/json'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}