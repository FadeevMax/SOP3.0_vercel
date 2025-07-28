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
        document.getElementById('syncGoogleDoc')?.addEventListener('click', () => {
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
            this.app.showLoading('Syncing from Google Docs...');
            await this.app.syncFromGoogleDocs();
            this.app.hideLoading();
        } catch (error) {
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
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}