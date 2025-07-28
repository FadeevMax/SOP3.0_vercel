/**
 * Global Configuration Manager - Handles site-wide settings using GitHub as backend
 */

class GlobalConfig {
    constructor() {
        this.githubRepo = 'FadeevMax/SOP3.0_vercel'; // Your repository
        this.configPath = 'config/global-settings.json';
        this.dataPath = 'data';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.defaultGitHubToken = null; // Will be loaded from environment or user input
    }
    
    async loadGlobalSettings() {
        try {
            console.log('Loading global settings from GitHub...');
            
            // Try to load global settings from GitHub
            const response = await this.fetchWithRetry(
                `https://api.github.com/repos/${this.githubRepo}/contents/${this.configPath}`
            );
            
            if (response.ok) {
                const data = await response.json();
                const content = decodeURIComponent(escape(atob(data.content)));
                const settings = JSON.parse(content);
                
                console.log('Global settings loaded:', settings);
                return settings;
            } else {
                console.log('No global settings found, using defaults');
                return this.getDefaultSettings();
            }
        } catch (error) {
            console.warn('Failed to load global settings:', error);
            return this.getDefaultSettings();
        }
    }
    
    async saveGlobalSettings(settings, githubToken) {
        try {
            if (!githubToken) {
                console.warn('No GitHub token provided, cannot save global settings');
                return false;
            }
            
            console.log('Saving global settings to GitHub...');
            
            // Get current file SHA if it exists
            let sha = null;
            try {
                const existingResponse = await fetch(
                    `https://api.github.com/repos/${this.githubRepo}/contents/${this.configPath}`,
                    {
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (existingResponse.ok) {
                    const existingData = await existingResponse.json();
                    sha = existingData.sha;
                }
            } catch (error) {
                // File doesn't exist, which is fine
            }
            
            // Upload new settings
            const uploadData = {
                message: `Update global settings - ${new Date().toISOString()}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(settings, null, 2)))),
                ...(sha && { sha })
            };
            
            const response = await fetch(
                `https://api.github.com/repos/${this.githubRepo}/contents/${this.configPath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(uploadData)
                }
            );
            
            if (response.ok) {
                console.log('Global settings saved successfully');
                return true;
            } else {
                console.error('Failed to save global settings:', await response.text());
                return false;
            }
        } catch (error) {
            console.error('Error saving global settings:', error);
            return false;
        }
    }
    
    async loadGlobalData() {
        try {
            console.log('Loading global document data from GitHub...');
            
            // Load chunks
            const chunksResponse = await this.fetchWithRetry(
                `https://api.github.com/repos/${this.githubRepo}/contents/${this.dataPath}/semantic_chunks.json`
            );
            
            if (!chunksResponse.ok) {
                console.log('No global document data found');
                return null;
            }
            
            const chunksData = await chunksResponse.json();
            const chunks = JSON.parse(decodeURIComponent(escape(atob(chunksData.content))));
            
            // Load metadata
            let metadata = null;
            try {
                const metadataResponse = await this.fetchWithRetry(
                    `https://api.github.com/repos/${this.githubRepo}/contents/${this.dataPath}/metadata.json`
                );
                
                if (metadataResponse.ok) {
                    const metadataData = await metadataResponse.json();
                    metadata = JSON.parse(decodeURIComponent(escape(atob(metadataData.content))));
                }
            } catch (error) {
                console.log('No metadata found');
            }
            
            console.log(`Loaded ${chunks.length} chunks from global data`);
            return { chunks, metadata };
        } catch (error) {
            console.error('Failed to load global data:', error);
            return null;
        }
    }
    
    async saveGlobalData(chunks, metadata, githubToken) {
        try {
            if (!githubToken) {
                console.warn('No GitHub token provided, cannot save global data');
                return false;
            }
            
            console.log('Saving global document data to GitHub...');
            
            // Save chunks
            await this.uploadFileToGitHub(
                `${this.dataPath}/semantic_chunks.json`,
                JSON.stringify(chunks, null, 2),
                'Update global document chunks',
                githubToken
            );
            
            // Save metadata
            const metadataToSave = {
                lastUpdate: new Date().toISOString(),
                chunkCount: chunks.length,
                totalImages: chunks.reduce((sum, chunk) => sum + (chunk.images?.length || 0), 0),
                version: '1.0',
                ...metadata
            };
            
            await this.uploadFileToGitHub(
                `${this.dataPath}/metadata.json`,
                JSON.stringify(metadataToSave, null, 2),
                'Update global metadata',
                githubToken
            );
            
            console.log('Global data saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save global data:', error);
            return false;
        }
    }
    
    async uploadFileToGitHub(path, content, message, githubToken) {
        // Get current file SHA if it exists
        let sha = null;
        try {
            const existingResponse = await fetch(
                `https://api.github.com/repos/${this.githubRepo}/contents/${path}`,
                {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (existingResponse.ok) {
                const existingData = await existingResponse.json();
                sha = existingData.sha;
            }
        } catch (error) {
            // File doesn't exist
        }
        
        // Upload file
        const uploadData = {
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            ...(sha && { sha })
        };
        
        const response = await fetch(
            `https://api.github.com/repos/${this.githubRepo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(uploadData)
            }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to upload ${path}: ${await response.text()}`);
        }
        
        return await response.json();
    }
    
    async fetchWithRetry(url, options = {}, attempt = 1) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            if (attempt < this.retryAttempts) {
                console.log(`Retry attempt ${attempt + 1} for ${url}`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }
    
    getDefaultSettings() {
        return {
            apiKeys: {
                openai: '',
                gemini: '', // Will be configured via environment variables
                githubToken: '' // Will be configured via environment variables
            },
            model: 'gemini-2.0',
            temperature: 0.1,
            displayOptions: {
                showSuggestedQuestions: true,
                showChunkRelevance: true
            },
            github: {
                repo: 'FadeevMax/SOP3.0_vercel',
                token: '' // Will be configured via environment variables
            },
            googleDocs: {
                docId: '1BXxlyLsOL6hsVWLXB84p35yRg9yr7AL9fzz4yjVQJgA',
                docName: 'GTI Data Base and SOP',
                enabled: true,
                autoSync: true,
                syncInterval: 300000 // 5 minutes
            },
            instructions: 'You are a GTI SOP Assistant. Answer based ONLY on the provided documentation. Be specific about states and order types (RISE/Regular).',
            lastUpdate: new Date().toISOString()
        };
    }
    
    async syncFromGoogleDocs() {
        try {
            console.log('Syncing from Google Docs...');
            
            // This would integrate with Google Docs API
            // For now, we'll simulate the sync and return the existing chunks
            
            // In a real implementation, you would:
            // 1. Connect to Google Docs API
            // 2. Download the latest DOCX content
            // 3. Process it into chunks
            // 4. Save to GitHub
            
            const globalData = await this.loadGlobalData();
            if (globalData) {
                return globalData;
            }
            
            // If no global data exists, create sample data
            return this.createSampleData();
        } catch (error) {
            console.error('Google Docs sync failed:', error);
            throw error;
        }
    }
    
    createSampleData() {
        // Sample chunks based on the existing GTI SOP structure
        const chunks = [
            {
                chunk_id: 0,
                text: "Ohio (OH) RISE Orders: For RISE orders in Ohio, follow standard menu pricing without any discounts. The unit limit is 10 units per order. No special notes are required for batch substitutions in Ohio RISE orders.",
                images: [
                    {
                        filename: "image_1.png",
                        label: "Image 1: Ohio RISE order form example",
                        path: "/images/image_1.png"
                    }
                ],
                metadata: {
                    states: ["OH"],
                    sections: ["RISE"],
                    topics: ["PRICING", "ORDER_LIMIT"],
                    has_images: true,
                    image_count: 1,
                    word_count: 35
                }
            },
            {
                chunk_id: 1,
                text: "Maryland (MD) Regular Orders: Regular wholesale orders in Maryland require separate invoicing for batteries. The delivery date should be set according to the standard schedule. Menu pricing applies for all regular orders.",
                images: [
                    {
                        filename: "image_2.png",
                        label: "Image 2: Maryland regular order invoice format",
                        path: "/images/image_2.png"
                    }
                ],
                metadata: {
                    states: ["MD"],
                    sections: ["REGULAR"],
                    topics: ["BATTERIES", "DELIVERY_DATE", "PRICING"],
                    has_images: true,
                    image_count: 1,
                    word_count: 32
                }
            },
            {
                chunk_id: 2,
                text: "New Jersey (NJ) Batch Substitution Rules: For NJ orders, FIFO (First In, First Out) principle applies for batch substitutions. When a requested batch is not available, substitute with the earliest available batch. Document all substitutions in the order notes.",
                images: [],
                metadata: {
                    states: ["NJ"],
                    sections: ["REGULAR", "RISE"],
                    topics: ["BATCH_SUB"],
                    has_images: false,
                    image_count: 0,
                    word_count: 38
                }
            },
            {
                chunk_id: 3,
                text: "Illinois (IL) RISE Order Limits: Illinois RISE orders have a maximum unit limit of 15 units per order. Orders exceeding this limit must be split into multiple orders. Each split order should reference the original order number.",
                images: [
                    {
                        filename: "image_3.png",
                        label: "Image 3: Illinois RISE order splitting example",
                        path: "/images/image_3.png"
                    }
                ],
                metadata: {
                    states: ["IL"],
                    sections: ["RISE"],
                    topics: ["ORDER_LIMIT"],
                    has_images: true,
                    image_count: 1,
                    word_count: 33
                }
            },
            {
                chunk_id: 4,
                text: "General Battery Invoice Requirements: The following states require batteries to be invoiced separately: Maryland (MD), New Jersey (NJ), and Nevada (NV). Create separate line items for battery products in these states.",
                images: [
                    {
                        filename: "image_4.png",
                        label: "Image 4: Separate battery invoice example",
                        path: "/images/image_4.png"
                    }
                ],
                metadata: {
                    states: ["MD", "NJ", "NV"],
                    sections: ["REGULAR", "RISE"],
                    topics: ["BATTERIES"],
                    has_images: true,
                    image_count: 1,
                    word_count: 30
                }
            }
        ];
        
        const metadata = {
            lastUpdate: new Date().toISOString(),
            chunkCount: chunks.length,
            totalImages: chunks.reduce((sum, chunk) => sum + (chunk.images?.length || 0), 0),
            version: '1.0',
            source: 'sample_data'
        };
        
        return { chunks, metadata };
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalConfig;
}