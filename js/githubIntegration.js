/**
 * GitHub Integration - Handles storing and syncing data with GitHub
 */

class GitHubIntegration {
    constructor(app) {
        this.app = app;
        this.baseUrl = 'https://api.github.com';
    }
    
    async uploadToGitHub(chunks, vectorDb) {
        try {
            const config = this.app.settingsManager.getGitHubConfig();
            
            if (!config.repo || !config.token) {
                console.log('GitHub not configured, skipping upload');
                return false;
            }
            
            console.log('Uploading data to GitHub...');
            
            // Prepare data for upload
            const dataToUpload = {
                chunks: chunks,
                vectorDb: vectorDb ? this.app.vectorDatabase.exportData() : null,
                lastUpdate: new Date().toISOString(),
                version: '1.0'
            };
            
            // Upload chunks file
            await this.uploadFile(
                config.repo,
                'data/semantic_chunks.json',
                JSON.stringify(chunks, null, 2),
                'Update semantic chunks data',
                config.token
            );
            
            // Upload vector database if available
            if (vectorDb) {
                await this.uploadFile(
                    config.repo,
                    'data/vector_db.json',
                    JSON.stringify(this.app.vectorDatabase.exportData(), null, 2),
                    'Update vector database',
                    config.token
                );
            }
            
            // Upload metadata
            const metadata = {
                lastUpdate: new Date().toISOString(),
                chunkCount: chunks.length,
                totalImages: chunks.reduce((sum, chunk) => sum + (chunk.images?.length || 0), 0),
                version: '1.0'
            };
            
            await this.uploadFile(
                config.repo,
                'data/metadata.json',
                JSON.stringify(metadata, null, 2),
                'Update metadata',
                config.token
            );
            
            console.log('Successfully uploaded data to GitHub');
            return true;
        } catch (error) {
            console.error('GitHub upload failed:', error);
            return false;
        }
    }
    
    async tryLoadFromGitHub() {
        try {
            const config = this.app.settingsManager.getGitHubConfig();
            
            if (!config.repo || !config.token) {
                console.log('GitHub not configured, skipping load');
                return false;
            }
            
            console.log('Trying to load data from GitHub...');
            
            // Load chunks
            const chunksData = await this.downloadFile(config.repo, 'data/semantic_chunks.json', config.token);
            const chunks = JSON.parse(chunksData);
            
            // Load vector database if available
            let vectorDbData = null;
            try {
                const vectorData = await this.downloadFile(config.repo, 'data/vector_db.json', config.token);
                vectorDbData = JSON.parse(vectorData);
            } catch (error) {
                console.log('Vector database not found on GitHub, will rebuild');
            }
            
            // Load metadata
            let metadata = null;
            try {
                const metadataData = await this.downloadFile(config.repo, 'data/metadata.json', config.token);
                metadata = JSON.parse(metadataData);
            } catch (error) {
                console.log('Metadata not found on GitHub');
            }
            
            // Update application state
            await this.app.vectorDatabase.loadFromStorage(chunks, vectorDbData);
            this.app.state.documentsLoaded = true;
            this.app.state.vectorDbReady = true;
            
            // Save to localStorage as cache
            localStorage.setItem('gti_chunks', JSON.stringify(chunks));
            if (vectorDbData) {
                localStorage.setItem('gti_vector_db', JSON.stringify(vectorDbData));
            }
            if (metadata) {
                localStorage.setItem('gti_last_update', metadata.lastUpdate);
            }
            
            console.log('Successfully loaded data from GitHub');
            this.app.showSuccess('Data loaded from GitHub repository');
            return true;
        } catch (error) {
            console.error('Failed to load from GitHub:', error);
            return false;
        }
    }
    
    async uploadFile(repo, path, content, message, token) {
        try {
            // First, try to get the current file to get its SHA (required for updates)
            let sha = null;
            try {
                const existingFile = await this.makeRequest(
                    `${this.baseUrl}/repos/${repo}/contents/${path}`,
                    'GET',
                    null,
                    token
                );
                sha = existingFile.sha;
            } catch (error) {
                // File doesn't exist, which is fine for new files
                console.log(`File ${path} doesn't exist, creating new file`);
            }
            
            // Upload the file
            const uploadData = {
                message: message,
                content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
                ...(sha && { sha }) // Include SHA if updating existing file
            };
            
            const result = await this.makeRequest(
                `${this.baseUrl}/repos/${repo}/contents/${path}`,
                'PUT',
                uploadData,
                token
            );
            
            console.log(`Successfully uploaded ${path} to GitHub`);
            return result;
        } catch (error) {
            console.error(`Failed to upload ${path} to GitHub:`, error);
            throw error;
        }
    }
    
    async downloadFile(repo, path, token) {
        try {
            const response = await this.makeRequest(
                `${this.baseUrl}/repos/${repo}/contents/${path}`,
                'GET',
                null,
                token
            );
            
            // Decode base64 content
            const content = decodeURIComponent(escape(atob(response.content)));
            return content;
        } catch (error) {
            console.error(`Failed to download ${path} from GitHub:`, error);
            throw error;
        }
    }
    
    async makeRequest(url, method, data, token) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GTI-SOP-Assistant'
        };
        
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        
        if (data) {
            headers['Content-Type'] = 'application/json';
        }
        
        const options = {
            method,
            headers,
            ...(data && { body: JSON.stringify(data) })
        };
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error (${response.status}): ${errorText}`);
        }
        
        return await response.json();
    }
    
    async testConnection() {
        try {
            const config = this.app.settingsManager.getGitHubConfig();
            
            if (!config.repo || !config.token) {
                throw new Error('GitHub repository and token must be configured');
            }
            
            // Test by getting repository information
            const repoInfo = await this.makeRequest(
                `${this.baseUrl}/repos/${config.repo}`,
                'GET',
                null,
                config.token
            );
            
            return {
                success: true,
                message: `Connected to ${repoInfo.full_name}`,
                details: {
                    name: repoInfo.name,
                    description: repoInfo.description,
                    private: repoInfo.private,
                    lastPush: repoInfo.pushed_at
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    async listDataFiles() {
        try {
            const config = this.app.settingsManager.getGitHubConfig();
            
            if (!config.repo || !config.token) {
                throw new Error('GitHub not configured');
            }
            
            // List files in the data directory
            const files = await this.makeRequest(
                `${this.baseUrl}/repos/${config.repo}/contents/data`,
                'GET',
                null,
                config.token
            );
            
            return files.map(file => ({
                name: file.name,
                size: file.size,
                lastModified: file.sha, // Using SHA as a version identifier
                downloadUrl: file.download_url
            }));
        } catch (error) {
            console.error('Failed to list GitHub files:', error);
            return [];
        }
    }
    
    async syncFromGitHub() {
        try {
            this.app.showLoading('Syncing from GitHub...');
            
            const success = await this.tryLoadFromGitHub();
            
            if (success) {
                this.app.updateUI();
                this.app.showSuccess('Successfully synced from GitHub');
            } else {
                this.app.showError('Failed to sync from GitHub');
            }
            
            this.app.hideLoading();
            return success;
        } catch (error) {
            this.app.hideLoading();
            this.app.showError(`GitHub sync failed: ${error.message}`);
            return false;
        }
    }
    
    async syncToGitHub() {
        try {
            if (!this.app.state.vectorDbReady) {
                throw new Error('No data to sync. Please process a document first.');
            }
            
            this.app.showLoading('Syncing to GitHub...');
            
            const chunks = this.app.vectorDatabase.chunks;
            const vectorDb = this.app.vectorDatabase.exportData();
            
            const success = await this.uploadToGitHub(chunks, vectorDb);
            
            if (success) {
                this.app.showSuccess('Successfully synced to GitHub');
            } else {
                this.app.showError('Failed to sync to GitHub');
            }
            
            this.app.hideLoading();
            return success;
        } catch (error) {
            this.app.hideLoading();
            this.app.showError(`GitHub sync failed: ${error.message}`);
            return false;
        }
    }
    
    // Create a backup of current data
    async createBackup() {
        try {
            const config = this.app.settingsManager.getGitHubConfig();
            
            if (!config.repo || !config.token) {
                throw new Error('GitHub not configured');
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `backups/backup-${timestamp}`;
            
            // Create backup directory structure
            const chunks = this.app.vectorDatabase.chunks || [];
            const vectorDb = this.app.vectorDatabase.exportData();
            
            const backupData = {
                timestamp: new Date().toISOString(),
                chunks: chunks,
                vectorDb: vectorDb,
                settings: this.app.settingsManager.settings,
                version: '1.0'
            };
            
            await this.uploadFile(
                config.repo,
                `${backupPath}/backup.json`,
                JSON.stringify(backupData, null, 2),
                `Create backup - ${timestamp}`,
                config.token
            );
            
            return {
                success: true,
                path: backupPath,
                timestamp: timestamp
            };
        } catch (error) {
            console.error('Backup creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubIntegration;
}