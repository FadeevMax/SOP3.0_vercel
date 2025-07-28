// Download processed DOCX and chunks from GitHub repository
// This bypasses all Google authentication issues by using your GitHub repo

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
        console.log('🔄 Downloading from GitHub repository...');
        
        const githubRepo = 'FadeevMax/SOP3.0_vercel';
        const githubToken = process.env.GITHUB_TOKEN;
        
        if (!githubToken) {
            throw new Error('GitHub token not configured');
        }
        
        // Download the DOCX file from GitHub
        console.log('📥 Step 1: Downloading DOCX from GitHub...');
        const docxResponse = await fetch(`https://api.github.com/repos/${githubRepo}/contents/Live_GTI_SOP.docx`, {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3.raw',
                'User-Agent': 'GTI-SOP-Assistant/1.0'
            }
        });
        
        if (!docxResponse.ok) {
            throw new Error(`GitHub DOCX download failed: ${docxResponse.status}`);
        }
        
        const docxBuffer = await docxResponse.arrayBuffer();
        const docxBase64 = Buffer.from(docxBuffer).toString('base64');
        
        console.log(`✅ DOCX downloaded: ${docxBuffer.byteLength} bytes`);
        
        // Download the processed chunks from GitHub
        console.log('📥 Step 2: Downloading processed chunks from GitHub...');
        let chunks = [];
        
        try {
            const chunksResponse = await fetch(`https://api.github.com/repos/${githubRepo}/contents/enriched_chunks.json`, {
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3.raw',
                    'User-Agent': 'GTI-SOP-Assistant/1.0'
                }
            });
            
            if (chunksResponse.ok) {
                const chunksData = await chunksResponse.text();
                chunks = JSON.parse(chunksData);
                console.log(`✅ Processed chunks downloaded: ${chunks.length} chunks`);
            }
        } catch (chunksError) {
            console.warn('⚠️ Could not download processed chunks, will use DOCX processing');
        }
        
        // Download image map from GitHub
        console.log('📥 Step 3: Downloading image map from GitHub...');
        let imageMap = {};
        
        try {
            const mapResponse = await fetch(`https://api.github.com/repos/${githubRepo}/contents/map.json`, {
                headers: {
                    'Authorization': `Bearer ${githubToken}`,
                    'Accept': 'application/vnd.github.v3.raw',
                    'User-Agent': 'GTI-SOP-Assistant/1.0'
                }
            });
            
            if (mapResponse.ok) {
                const mapData = await mapResponse.text();
                imageMap = JSON.parse(mapData);
                console.log(`✅ Image map downloaded: ${Object.keys(imageMap).length} images`);
            }
        } catch (mapError) {
            console.warn('⚠️ Could not download image map');
        }
        
        // Save the DOCX file locally for download capability
        const docxFileName = `GTI_SOP_from_GitHub_${Date.now()}.docx`;
        const docxPath = path.join('/tmp', docxFileName);
        
        try {
            fs.writeFileSync(docxPath, Buffer.from(docxBuffer));
            console.log(`💾 DOCX saved locally: ${docxPath}`);
        } catch (saveError) {
            console.warn('⚠️ Could not save DOCX locally:', saveError.message);
        }
        
        // If we have processed chunks, use them; otherwise, we'll need to process the DOCX
        if (chunks.length > 0) {
            // Use the pre-processed chunks
            const responseData = {
                success: true,
                method: 'github_download_processed',
                document: {
                    id: 'github-repo-docx',
                    name: 'GTI Data Base and SOP (from GitHub)',
                    modifiedTime: new Date().toISOString(),
                    size: docxBuffer.byteLength.toString(),
                    downloadUrl: `/api/download-file/${docxFileName}`
                },
                chunks: chunks,
                imageMap: imageMap,
                docx: {
                    data: docxBase64,
                    filename: docxFileName,
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    size: docxBuffer.byteLength
                },
                metadata: {
                    source: 'github_repository',
                    downloadMethod: 'github_api',
                    timestamp: new Date().toISOString(),
                    chunkCount: chunks.length,
                    imageCount: Object.keys(imageMap).length,
                    note: 'Downloaded from GitHub repository, bypasses Google authentication'
                }
            };
            
            console.log(`🎉 GitHub download completed: ${chunks.length} chunks, ${Object.keys(imageMap).length} images`);
            res.status(200).json(responseData);
            
        } else {
            // No processed chunks available, return DOCX for processing
            const responseData = {
                success: true,
                method: 'github_download_docx_only',
                document: {
                    id: 'github-repo-docx',
                    name: 'GTI Data Base and SOP (from GitHub)',
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
                    source: 'github_repository',
                    downloadMethod: 'github_api',
                    timestamp: new Date().toISOString(),
                    note: 'DOCX downloaded from GitHub, needs processing'
                }
            };
            
            console.log(`🎉 GitHub DOCX download completed, ready for processing`);
            res.status(200).json(responseData);
        }
        
    } catch (error) {
        console.error('GitHub download error:', error);
        
        // Fallback to local processed data
        try {
            const fallbackPath = path.join(process.cwd(), 'semantic_chunks.json');
            if (fs.existsSync(fallbackPath)) {
                console.log('📋 Using local processed data as final fallback');
                const existingData = fs.readFileSync(fallbackPath, 'utf8');
                const chunks = JSON.parse(existingData);
                
                return res.status(200).json({
                    success: true,
                    method: 'local_fallback',
                    document: {
                        id: 'local-processed',
                        name: 'GTI Data Base and SOP (local)',
                        modifiedTime: new Date().toISOString(),
                        note: 'GitHub download failed - using local data'
                    },
                    chunks: chunks,
                    warning: {
                        message: 'GitHub download failed',
                        originalError: error.message,
                        note: 'Using local processed chunks as final fallback'
                    },
                    metadata: {
                        source: 'local_processed_data',
                        chunkCount: chunks.length
                    }
                });
            }
        } catch (fallbackError) {
            console.error('Local fallback also failed:', fallbackError);
        }
        
        res.status(500).json({ 
            error: 'GitHub download failed and no fallback available',
            details: error.message,
            suggestions: [
                'Check that GITHUB_TOKEN is properly configured',
                'Verify the repository exists and is accessible',
                'Ensure Live_GTI_SOP.docx exists in the repository'
            ]
        });
    }
}