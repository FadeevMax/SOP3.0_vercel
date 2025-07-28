/**
 * Settings Manager - Handles application settings and configuration
 */

class SettingsManager {
    constructor(app) {
        this.app = app;
        
        // Use global settings if available, otherwise use defaults
        this.settings = app.state.globalSettings || {
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
                serviceAccount: null,
                docId: '1BXxlyLsOL6hsVWLXB84p35yRg9yr7AL9fzz4yjVQJgA',
                docName: 'GTI Data Base and SOP',
                enabled: true,
                autoSync: true
            },
            instructions: 'You are a GTI SOP Assistant. Answer based ONLY on the provided documentation. Be specific about states and order types (RISE/Regular).'
        };
        
        this.loadSettings();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // API Keys
        document.getElementById('openaiKey')?.addEventListener('input', (e) => {
            this.settings.apiKeys.openai = e.target.value;
            this.saveSettings();
            this.updateApiKeyStatus();
        });
        
        document.getElementById('geminiKey')?.addEventListener('input', (e) => {
            this.settings.apiKeys.gemini = e.target.value;
            this.saveSettings();
            this.updateApiKeyStatus();
        });
        
        // Model selection
        document.getElementById('modelSelect')?.addEventListener('change', (e) => {
            this.settings.model = e.target.value;
            this.saveSettings();
        });
        
        // Temperature
        document.getElementById('temperatureSlider')?.addEventListener('input', (e) => {
            this.settings.temperature = parseFloat(e.target.value);
            document.getElementById('temperatureValue').textContent = e.target.value;
            this.saveSettings();
        });
        
        // Display options
        document.getElementById('showSuggestedQuestions')?.addEventListener('change', (e) => {
            this.settings.displayOptions.showSuggestedQuestions = e.target.checked;
            this.saveSettings();
            this.updateDisplayOptions();
        });
        
        document.getElementById('showChunkRelevance')?.addEventListener('change', (e) => {
            this.settings.displayOptions.showChunkRelevance = e.target.checked;
            this.saveSettings();
        });
        
        // Document upload
        document.getElementById('uploadDocBtn')?.addEventListener('click', () => {
            document.getElementById('docxUpload')?.click();
        });
        
        document.getElementById('docxUpload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                this.handleDocumentUpload(file);
            } else {
                this.app.showError('Please select a valid DOCX file');
            }
        });
        
        // Google Docs sync
        const syncBtn = document.getElementById('syncGoogleDoc');
        console.log('Google Docs sync button found:', !!syncBtn);
        syncBtn?.addEventListener('click', (e) => {
            console.log('🔄 Google Docs sync button clicked!');
            console.log('Sync button element:', syncBtn);
            e.preventDefault();
            e.stopPropagation();
            this.handleGoogleDocsSync();
        });
        
        // Load global data
        document.getElementById('loadGlobalData')?.addEventListener('click', () => {
            this.handleLoadGlobalData();
        });
        
        // Google Docs configuration
        document.getElementById('googleDocsId')?.addEventListener('input', (e) => {
            const docId = this.app.googleDocsSync.getDocumentIdFromUrl(e.target.value) || e.target.value;
            this.app.googleDocsSync.setDocumentId(docId);
            this.settings.googleDocs.docId = docId;
            this.saveSettings();
        });
        
        // GitHub integration
        document.getElementById('githubRepo')?.addEventListener('input', (e) => {
            this.settings.github.repo = e.target.value;
            this.saveSettings();
        });
        
        document.getElementById('githubToken')?.addEventListener('input', (e) => {
            this.settings.github.token = e.target.value;
            this.saveSettings();
        });

        // System instructions
        document.getElementById('systemInstructions')?.addEventListener('input', (e) => {
            this.settings.instructions = e.target.value;
            this.saveSettings();
        });

        // Data management buttons
        document.getElementById('viewJsonBtn')?.addEventListener('click', () => {
            this.viewJsonData();
        });

        document.getElementById('viewVectorDbBtn')?.addEventListener('click', () => {
            this.viewVectorDatabase();
        });

        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportAllData();
        });

        document.getElementById('clearDataBtn')?.addEventListener('click', () => {
            this.clearAllData();
        });
    }
    
    async handleDocumentUpload(file) {
        try {
            this.app.showLoading('Processing document...');
            await this.app.processDocument(file);
            this.app.hideLoading();
            this.app.showSuccess('Document processed successfully!');
        } catch (error) {
            this.app.hideLoading();
            this.app.showError(`Failed to process document: ${error.message}`);
        }
    }
    
    async handleGoogleDocsSync() {
        try {
            console.log('🔄 Starting Google Docs sync process...');
            this.app.showLoading('Syncing from Google Docs...');
            this.app.showNotification('Starting Google Docs sync...', 'info');
            
            const result = await this.app.syncFromGoogleDocs();
            console.log('Google Docs sync result:', result);
            
            this.app.hideLoading();
            
            if (result && result.success) {
                this.app.showSuccess('Google Docs sync completed successfully!');
            } else {
                this.app.showError('Google Docs sync completed but no new data was found');
            }
        } catch (error) {
            console.error('Google Docs sync error:', error);
            this.app.hideLoading();
            this.app.showError(`Google Docs sync failed: ${error.message}`);
        }
    }
    
    async handleLoadGlobalData() {
        try {
            this.app.showLoading('Loading global data...');
            await this.app.loadGlobalData();
            this.app.hideLoading();
        } catch (error) {
            this.app.hideLoading();
            this.app.showError(`Failed to load global data: ${error.message}`);
        }
    }
    
    async simulateGoogleDocsSync() {
        // Simulate Google Docs sync by using sample data
        return new Promise((resolve) => {
            setTimeout(() => {
                // Create sample chunks as if downloaded from Google Docs
                const chunks = this.app.documentProcessor.createSampleChunks();
                this.app.vectorDatabase.buildFromChunks(chunks);
                this.app.state.documentsLoaded = true;
                this.app.state.vectorDbReady = true;
                this.app.updateUI();
                resolve();
            }, 2000);
        });
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('gti_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
                this.applySettings();
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            // Save locally first
            localStorage.setItem('gti_settings', JSON.stringify(this.settings));
            
            // Save globally if GitHub token is available
            const githubToken = this.settings.apiKeys?.githubToken || this.settings.github?.token;
            if (githubToken && this.app.globalConfig) {
                await this.app.globalConfig.saveGlobalSettings(this.settings, githubToken);
                console.log('Settings saved globally');
            }
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    applySettings() {
        // Apply API keys
        const openaiInput = document.getElementById('openaiKey');
        const geminiInput = document.getElementById('geminiKey');
        
        if (openaiInput) openaiInput.value = this.settings.apiKeys.openai;
        if (geminiInput) geminiInput.value = this.settings.apiKeys.gemini;
        
        // Apply model selection
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) modelSelect.value = this.settings.model;
        
        // Apply temperature
        const tempSlider = document.getElementById('temperatureSlider');
        const tempValue = document.getElementById('temperatureValue');
        if (tempSlider) tempSlider.value = this.settings.temperature;
        if (tempValue) tempValue.textContent = this.settings.temperature;
        
        // Apply display options
        const showSuggested = document.getElementById('showSuggestedQuestions');
        const showChunks = document.getElementById('showChunkRelevance');
        
        if (showSuggested) showSuggested.checked = this.settings.displayOptions.showSuggestedQuestions;
        if (showChunks) showChunks.checked = this.settings.displayOptions.showChunkRelevance;
        
        // Apply GitHub settings
        const githubRepo = document.getElementById('githubRepo');
        const githubToken = document.getElementById('githubToken');
        
        if (githubRepo) githubRepo.value = this.settings.github.repo;
        if (githubToken) githubToken.value = this.settings.github.token;

        // Apply system instructions
        const systemInstructions = document.getElementById('systemInstructions');
        if (systemInstructions) {
            systemInstructions.value = this.settings.instructions || 'You are a GTI SOP Assistant. Answer based ONLY on the provided documentation. Be specific about states and order types (RISE/Regular).';
        }
        
        // Update display
        this.updateDisplayOptions();
        this.updateApiKeyStatus();
    }
    
    updateDisplayOptions() {
        const suggestedQuestions = document.getElementById('suggestedQuestions');
        if (suggestedQuestions) {
            suggestedQuestions.style.display = this.settings.displayOptions.showSuggestedQuestions ? 'block' : 'none';
        }
    }
    
    updateApiKeyStatus() {
        const hasOpenAI = this.settings.apiKeys.openai.length > 0;
        const hasGemini = this.settings.apiKeys.gemini.length > 0;
        
        this.app.state.apiKeysConfigured = hasOpenAI || hasGemini;
        
        // Update model dropdown based on available keys
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            const options = modelSelect.querySelectorAll('option');
            options.forEach(option => {
                const value = option.value;
                if (value.startsWith('gpt') && !hasOpenAI) {
                    option.disabled = true;
                    option.textContent += ' (API key required)';
                } else if (value.startsWith('gemini') && !hasGemini) {
                    option.disabled = true;
                    option.textContent += ' (API key required)';
                } else {
                    option.disabled = false;
                    option.textContent = option.textContent.replace(' (API key required)', '');
                }
            });
        }
    }
    
    getApiKey(provider) {
        if (provider === 'openai') {
            return this.settings.apiKeys.openai;
        } else if (provider === 'gemini') {
            return this.settings.apiKeys.gemini;
        }
        return null;
    }
    
    getCurrentModel() {
        return this.settings.model;
    }
    
    getTemperature() {
        return this.settings.temperature;
    }
    
    getGitHubConfig() {
        return {
            repo: this.settings.github.repo,
            token: this.settings.github.token
        };
    }
    
    // Export settings for backup
    exportSettings() {
        const exportData = {
            ...this.settings,
            // Don't export sensitive data
            apiKeys: {
                openai: this.settings.apiKeys.openai ? '[CONFIGURED]' : '',
                gemini: this.settings.apiKeys.gemini ? '[CONFIGURED]' : ''
            },
            github: {
                repo: this.settings.github.repo,
                token: this.settings.github.token ? '[CONFIGURED]' : ''
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `gti-sop-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    // Import settings from file
    importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target.result);
                    
                    // Merge with current settings (excluding sensitive data)
                    this.settings = {
                        ...this.settings,
                        model: importedSettings.model || this.settings.model,
                        temperature: importedSettings.temperature || this.settings.temperature,
                        displayOptions: { ...this.settings.displayOptions, ...importedSettings.displayOptions },
                        github: {
                            ...this.settings.github,
                            repo: importedSettings.github?.repo || this.settings.github.repo
                        }
                    };
                    
                    this.saveSettings();
                    this.applySettings();
                    
                    resolve();
                } catch (error) {
                    reject(new Error('Invalid settings file format'));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read settings file'));
            reader.readAsText(file);
        });
    }
    
    // Reset settings to defaults
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            localStorage.removeItem('gti_settings');
            
            this.settings = {
                apiKeys: { openai: '', gemini: '' },
                model: 'gemini-2.0',
                temperature: 0.1,
                displayOptions: {
                    showSuggestedQuestions: true,
                    showChunkRelevance: true
                },
                github: { repo: '', token: '' },
                googleDocs: { serviceAccount: null, docId: '' }
            };
            
            this.applySettings();
            this.app.showSuccess('Settings reset to defaults');
        }
    }

    // Data management methods
    viewJsonData() {
        try {
            const chunks = localStorage.getItem('gti_chunks') || '[]';
            const parsedChunks = JSON.parse(chunks);
            
            const jsonWindow = window.open('', '_blank');
            jsonWindow.document.write(`
                <html>
                    <head>
                        <title>GTI SOP - JSON Data</title>
                        <style>
                            body { font-family: monospace; padding: 20px; background: #1f2937; color: #ffffff; }
                            pre { white-space: pre-wrap; word-wrap: break-word; }
                            .stats { background: #374151; padding: 10px; margin-bottom: 20px; border-radius: 8px; }
                        </style>
                    </head>
                    <body>
                        <div class="stats">
                            <h2>📊 Data Statistics</h2>
                            <p>Total Chunks: ${parsedChunks.length}</p>
                            <p>Total Images: ${parsedChunks.reduce((sum, chunk) => sum + (chunk.images?.length || 0), 0)}</p>
                            <p>Last Updated: ${localStorage.getItem('gti_last_update') || 'Never'}</p>
                        </div>
                        <h2>📄 JSON Data</h2>
                        <pre>${JSON.stringify(parsedChunks, null, 2)}</pre>
                    </body>
                </html>
            `);
        } catch (error) {
            this.app.showError('Failed to view JSON data: ' + error.message);
        }
    }

    viewVectorDatabase() {
        try {
            if (!this.app.vectorDatabase || !this.app.vectorDatabase.chunks) {
                this.app.showError('Vector database not initialized');
                return;
            }

            const stats = this.app.vectorDatabase.getStats();
            const chunks = this.app.vectorDatabase.chunks;
            
            const dbWindow = window.open('', '_blank');
            dbWindow.document.write(`
                <html>
                    <head>
                        <title>GTI SOP - Vector Database</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; background: #1f2937; color: #ffffff; }
                            .stats { background: #374151; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
                            .chunk { background: #374151; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
                            .metadata { background: #4b5563; padding: 10px; border-radius: 6px; margin-top: 10px; }
                            .tag { background: #60a5fa; color: white; padding: 2px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <div class="stats">
                            <h2>🗄️ Vector Database Statistics</h2>
                            <p>Total Chunks: ${stats.totalChunks}</p>
                            <p>Vocabulary Size: ${stats.vocabularySize}</p>
                            <p>Image Chunks: ${stats.imageChunks}</p>
                            <p>Status: ${stats.isReady ? '✅ Ready' : '❌ Not Ready'}</p>
                        </div>
                        <h2>📚 Chunks</h2>
                        ${chunks.map((chunk, index) => `
                            <div class="chunk">
                                <h3>Chunk ${index + 1} (ID: ${chunk.chunk_id})</h3>
                                <p>${chunk.text}</p>
                                <div class="metadata">
                                    <strong>Metadata:</strong><br>
                                    ${chunk.metadata.states ? chunk.metadata.states.map(s => `<span class="tag">${s}</span>`).join('') : ''}
                                    ${chunk.metadata.sections ? chunk.metadata.sections.map(s => `<span class="tag">${s}</span>`).join('') : ''}
                                    ${chunk.metadata.topics ? chunk.metadata.topics.map(t => `<span class="tag">${t}</span>`).join('') : ''}
                                    <br>Images: ${chunk.images?.length || 0} | Words: ${chunk.metadata.word_count || 0}
                                </div>
                            </div>
                        `).join('')}
                    </body>
                </html>
            `);
        } catch (error) {
            this.app.showError('Failed to view vector database: ' + error.message);
        }
    }

    exportAllData() {
        try {
            const exportData = {
                chunks: JSON.parse(localStorage.getItem('gti_chunks') || '[]'),
                settings: this.settings,
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    lastUpdate: localStorage.getItem('gti_last_update')
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `gti-sop-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            this.app.showSuccess('Data exported successfully');
        } catch (error) {
            this.app.showError('Failed to export data: ' + error.message);
        }
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This will remove chunks, vector database, and chat history. This cannot be undone.')) {
            try {
                // Clear localStorage
                localStorage.removeItem('gti_chunks');
                localStorage.removeItem('gti_last_update');
                localStorage.removeItem('gti_chat_history');
                localStorage.removeItem('gti_processed_chunks');
                localStorage.removeItem('gti_processed_images');
                
                // Reset application state
                this.app.state.documentsLoaded = false;
                this.app.state.vectorDbReady = false;
                
                // Clear vector database
                if (this.app.vectorDatabase) {
                    this.app.vectorDatabase.chunks = [];
                    this.app.vectorDatabase.isReady = false;
                }
                
                // Clear chat interface
                if (this.app.chatInterface) {
                    this.app.chatInterface.clearChat();
                }
                
                // Update UI
                this.app.updateUI();
                
                this.app.showSuccess('All data cleared successfully');
            } catch (error) {
                this.app.showError('Failed to clear data: ' + error.message);
            }
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}