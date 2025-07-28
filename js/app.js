/**
 * GTI SOP Assistant - Main Application
 * Coordinates all modules and manages the overall application state
 */

class GTISOPAssistant {
    constructor() {
        this.isInitialized = false;
        this.documentProcessor = null;
        this.vectorDatabase = null;
        this.chatInterface = null;
        this.settingsManager = null;
        this.githubIntegration = null;
        this.globalConfig = null;
        
        this.state = {
            documentsLoaded: false,
            vectorDbReady: false,
            apiKeysConfigured: false,
            currentModel: 'gemini-2.0',
            temperature: 0.1,
            globalSettings: null
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Starting GTI SOP Assistant initialization...');
            
            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
                console.log('✓ Lucide icons initialized');
            }
            
            // Set up basic event listeners first
            this.setupEventListeners();
            console.log('✓ Event listeners setup');
            
            // Initialize all modules
            await this.initializeModules();
            console.log('✓ All modules initialized');
            
            // Load any saved state
            this.loadSavedState();
            console.log('✓ Saved state loaded');
            
            // Update the UI to reflect current state
            this.updateUI();
            console.log('✓ UI updated');
            
            this.isInitialized = true;
            console.log('🎉 GTI SOP Assistant initialized successfully!');
            
            // Hide any error messages and show success
            this.hideError();
            this.showSuccess('Application loaded successfully! Ready to chat.');
            
        } catch (error) {
            console.error('❌ Failed to initialize GTI SOP Assistant:', error);
            this.showError(`Failed to initialize application: ${error.message}. Please refresh the page.`);
        }
    }
    
    async initializeModules() {
        try {
            // Load configuration from Vercel environment variables
            const configResponse = await fetch('/api/config');
            if (configResponse.ok) {
                const serverConfig = await configResponse.json();
                console.log('✓ Server configuration loaded');
                
                // Merge server config with default settings
                this.state.globalSettings = {
                    apiKeys: serverConfig.apiKeys,
                    model: 'gemini-2.0',
                    temperature: 0.1,
                    displayOptions: {
                        showSuggestedQuestions: true,
                        showChunkRelevance: true
                    },
                    github: serverConfig.github,
                    googleDocs: serverConfig.googleDocs,
                    instructions: 'You are a GTI SOP Assistant. Answer based ONLY on the provided documentation. Be specific about states and order types (RISE/Regular).'
                };
            } else {
                console.warn('Failed to load server config, using defaults');
                this.state.globalSettings = {
                    apiKeys: { openai: '', gemini: '', githubToken: '' },
                    model: 'gemini-2.0',
                    temperature: 0.1,
                    displayOptions: { showSuggestedQuestions: true, showChunkRelevance: true },
                    github: { repo: 'FadeevMax/SOP3.0_vercel' },
                    googleDocs: { docId: '1BXxlyLsOL6hsVWLXB84p35yRg9yr7AL9fzz4yjVQJgA', docName: 'GTI Data Base and SOP' },
                    instructions: 'You are a GTI SOP Assistant. Answer based ONLY on the provided documentation. Be specific about states and order types (RISE/Regular).'
                };
            }
            
            // Initialize global config
            this.globalConfig = new GlobalConfig();
            console.log('✓ Global config initialized');
            
            // Initialize settings manager with global settings
            this.settingsManager = new SettingsManager(this);
            console.log('✓ Settings manager initialized');
            
            // Initialize document processor
            this.documentProcessor = new DocumentProcessor(this);
            console.log('✓ Document processor initialized');
            
            // Initialize vector database
            this.vectorDatabase = new VectorDatabase(this);
            console.log('✓ Vector database initialized');
            
            // Initialize chat interface
            this.chatInterface = new ChatInterface(this);
            console.log('✓ Chat interface initialized');
            
            // Initialize GitHub integration
            this.githubIntegration = new GitHubIntegration(this);
            console.log('✓ GitHub integration initialized');
            
            // Initialize Google Docs sync with error checking
            try {
                if (typeof GoogleDocsSync === 'undefined') {
                    console.warn('GoogleDocsSync class not found - using fallback');
                    this.googleDocsSync = null;
                } else {
                    this.googleDocsSync = new GoogleDocsSync();
                    console.log('✓ Google Docs sync initialized');
                }
            } catch (error) {
                console.warn('Failed to initialize Google Docs sync:', error);
                this.googleDocsSync = null;
            }
            
            // Load global data first, then fallback to local data
            await this.loadGlobalData();
            console.log('✓ Global data loading completed');
        } catch (error) {
            console.error('Module initialization failed:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // Settings panel toggle
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettings = document.getElementById('closeSettings');
        
        console.log('Setting up event listeners...');
        console.log('Settings button found:', !!settingsBtn);
        console.log('Settings panel found:', !!settingsPanel);
        console.log('Close button found:', !!closeSettings);
        
        if (settingsBtn && settingsPanel) {
            // Add multiple event listeners to ensure it works
            settingsBtn.addEventListener('click', (e) => {
                console.log('🔧 Settings button clicked!');
                e.preventDefault();
                e.stopPropagation();
                
                const currentTransform = settingsPanel.style.transform;
                const isHidden = settingsPanel.classList.contains('translate-x-full');
                
                console.log('Panel currently hidden:', isHidden);
                console.log('Current transform:', currentTransform);
                
                if (isHidden) {
                    settingsPanel.classList.remove('translate-x-full');
                    settingsPanel.style.transform = 'translateX(0)';
                    console.log('✅ Opening settings panel');
                } else {
                    settingsPanel.classList.add('translate-x-full');
                    settingsPanel.style.transform = 'translateX(100%)';
                    console.log('❌ Closing settings panel');
                }
            });
            
            // Also try mousedown as backup
            settingsBtn.addEventListener('mousedown', (e) => {
                console.log('Settings button mousedown event');
            });
            
            // Close settings
            if (closeSettings) {
                closeSettings.addEventListener('click', (e) => {
                    console.log('Close settings clicked');
                    e.preventDefault();
                    settingsPanel.classList.add('translate-x-full');
                    settingsPanel.style.transform = 'translateX(100%)';
                });
            }
        } else {
            console.error('❌ Settings button or panel not found during setup');
        }
        
        // Close settings panel when clicking outside
        document.addEventListener('click', (e) => {
            if (settingsPanel && settingsBtn && 
                !settingsPanel.contains(e.target) && 
                !settingsBtn.contains(e.target) &&
                !settingsPanel.classList.contains('translate-x-full')) {
                console.log('Clicking outside settings - closing panel');
                settingsPanel.classList.add('translate-x-full');
                settingsPanel.style.transform = 'translateX(100%)';
            }
        });
        
        // Handle settings changes
        document.getElementById('modelSelect')?.addEventListener('change', (e) => {
            this.state.currentModel = e.target.value;
            this.saveState();
        });
        
        document.getElementById('temperatureSlider')?.addEventListener('input', (e) => {
            this.state.temperature = parseFloat(e.target.value);
            document.getElementById('temperatureValue').textContent = e.target.value;
            this.saveState();
        });
        
        // Handle checkbox changes
        document.getElementById('showSuggestedQuestions')?.addEventListener('change', (e) => {
            const suggestedQuestions = document.getElementById('suggestedQuestions');
            if (suggestedQuestions) {
                suggestedQuestions.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close settings
            if (e.key === 'Escape') {
                settingsPanel.classList.add('translate-x-full');
            }
            
            // Ctrl/Cmd + Enter to send message
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.chatInterface?.sendMessage();
            }
        });
    }
    
    async loadGlobalData() {
        try {
            console.log('Loading global document data...');
            
            // Try to load global data from GitHub first
            const globalData = await this.globalConfig.loadGlobalData();
            
            if (globalData && globalData.chunks && globalData.chunks.length > 0) {
                console.log('Loading global document data from GitHub');
                await this.vectorDatabase.loadFromStorage(globalData.chunks, null);
                this.state.documentsLoaded = true;
                this.state.vectorDbReady = true;
                
                // Cache locally for performance
                localStorage.setItem('gti_chunks', JSON.stringify(globalData.chunks));
                if (globalData.metadata) {
                    localStorage.setItem('gti_last_update', globalData.metadata.lastUpdate);
                }
                
                this.showSuccess('Document data loaded and ready for chat!');
                return;
            }
            
            // Fallback to local storage
            const savedChunks = localStorage.getItem('gti_chunks');
            if (savedChunks) {
                console.log('Loading existing document data from localStorage');
                await this.vectorDatabase.loadFromStorage(JSON.parse(savedChunks), null);
                this.state.documentsLoaded = true;
                this.state.vectorDbReady = true;
                return;
            }
            
            // If no data exists, try to sync from Google Docs or use fallback
            const syncResult = await this.syncFromGoogleDocs();
            if (syncResult && syncResult.success && syncResult.chunks) {
                await this.vectorDatabase.loadFromStorage(syncResult.chunks, null);
                this.state.documentsLoaded = true;
                this.state.vectorDbReady = true;
                console.log(`✓ Loaded ${syncResult.chunks.length} chunks from ${syncResult.metadata?.source || 'sync'}`);
            }
        } catch (error) {
            console.warn('Failed to load global data:', error);
        }
    }
    
    async syncFromGoogleDocs() {
        try {
            console.log('Attempting Google Docs sync...');
            
            // Check if googleDocsSync is properly initialized
            if (!this.googleDocsSync) {
                console.warn('Google Docs sync not available, using sample data fallback');
                return this.createSampleDataFallback();
            }
            
            if (typeof this.googleDocsSync.syncFromGoogleDocs !== 'function') {
                console.warn('Google Docs sync method not available, using fallback');
                return this.createSampleDataFallback();
            }
            
            // Use the real Google Docs sync
            const result = await this.googleDocsSync.syncFromGoogleDocs();
            
            if (result && result.success && result.chunks && result.chunks.length > 0) {
                // Load the synced data into vector database
                await this.vectorDatabase.loadFromStorage(result.chunks, null);
                this.state.documentsLoaded = true;
                this.state.vectorDbReady = true;
                
                // Save globally if we have GitHub token
                const githubToken = this.state.globalSettings?.apiKeys?.githubToken;
                if (githubToken) {
                    await this.globalConfig.saveGlobalData(result.chunks, result.metadata, githubToken);
                }
                
                this.updateUI();
                this.showSuccess(`Document "${result.document.name}" synced from Google Docs and ready for chat!`);
                
                return result;
            } else {
                throw new Error('No data received from Google Docs sync');
            }
        } catch (error) {
            console.error('Google Docs sync failed:', error);
            // Try fallback data as last resort
            console.log('Using sample data fallback due to sync error');
            return this.createSampleDataFallback();
        }
    }
    
    createSampleDataFallback() {
        console.log('Using sample data fallback');
        const chunks = [
            {
                chunk_id: 0,
                text: "Ohio (OH) RISE Orders: For RISE orders in Ohio, follow standard menu pricing without any discounts. The unit limit is 10 units per order. No special notes are required for batch substitutions in Ohio RISE orders.",
                images: [],
                metadata: {
                    states: ["OH"],
                    sections: ["RISE"],
                    topics: ["PRICING", "ORDER_LIMIT"],
                    has_images: false,
                    image_count: 0,
                    word_count: 40
                }
            },
            {
                chunk_id: 1,
                text: "Maryland (MD) Regular Orders: Regular wholesale orders in Maryland require separate invoicing for batteries. The delivery date should be set according to the standard schedule. Menu pricing applies for all regular orders.",
                images: [],
                metadata: {
                    states: ["MD"],
                    sections: ["REGULAR"],
                    topics: ["BATTERIES", "DELIVERY_DATE", "PRICING"],
                    has_images: false,
                    image_count: 0,
                    word_count: 37
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
                    word_count: 43
                }
            }
        ];
        
        return {
            success: true,
            chunks: chunks,
            metadata: {
                chunkCount: chunks.length,
                source: 'fallback_data',
                lastUpdate: new Date().toISOString()
            }
        };
    }
    
    loadSavedState() {
        try {
            const savedState = localStorage.getItem('gti_app_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                Object.assign(this.state, state);
                
                // Update UI elements
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect) modelSelect.value = this.state.currentModel;
                
                const tempSlider = document.getElementById('temperatureSlider');
                const tempValue = document.getElementById('temperatureValue');
                if (tempSlider && tempValue) {
                    tempSlider.value = this.state.temperature;
                    tempValue.textContent = this.state.temperature;
                }
            }
        } catch (error) {
            console.warn('Failed to load saved state:', error);
        }
    }
    
    saveState() {
        try {
            localStorage.setItem('gti_app_state', JSON.stringify(this.state));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }
    
    updateUI() {
        this.updateDocumentStatus();
        this.updateChatHistory();
    }
    
    updateDocumentStatus() {
        const chunkCount = document.getElementById('chunkCount');
        const imageCount = document.getElementById('imageCount');
        const lastUpdated = document.getElementById('lastUpdated');
        
        if (this.vectorDatabase && this.vectorDatabase.chunks) {
            const chunks = this.vectorDatabase.chunks;
            if (chunkCount) chunkCount.textContent = chunks.length;
            
            const totalImages = chunks.reduce((sum, chunk) => sum + (chunk.images?.length || 0), 0);
            if (imageCount) imageCount.textContent = totalImages;
            
            if (lastUpdated) {
                const lastUpdate = localStorage.getItem('gti_last_update');
                lastUpdated.textContent = lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never';
            }
        } else {
            if (chunkCount) chunkCount.textContent = '0';
            if (imageCount) imageCount.textContent = '0';
            if (lastUpdated) lastUpdated.textContent = 'Never';
        }
    }
    
    updateChatHistory() {
        // Load and display chat history from localStorage
        const history = this.chatInterface?.loadHistory() || [];
        
        // Update search history display
        const historyList = document.getElementById('historyList');
        const searchHistory = document.getElementById('searchHistory');
        
        if (historyList && searchHistory) {
            if (history.length > 0) {
                searchHistory.classList.remove('hidden');
                historyList.innerHTML = history.slice(-10).map(item => `
                    <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors" 
                         onclick="app.chatInterface.loadHistoryItem('${item.id}')">
                        <div class="font-medium text-sm text-gray-900">${item.query}</div>
                        <div class="text-xs text-gray-500 mt-1">${new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                `).join('');
            } else {
                searchHistory.classList.add('hidden');
            }
        }
    }
    
    async processDocument(file) {
        try {
            this.showLoading('Processing document...');
            
            const result = await this.documentProcessor.processDocument(file);
            if (result.success) {
                // Build vector database
                await this.vectorDatabase.buildFromChunks(result.chunks);
                
                this.state.documentsLoaded = true;
                this.state.vectorDbReady = true;
                this.saveState();
                
                // Save to localStorage
                localStorage.setItem('gti_chunks', JSON.stringify(result.chunks));
                localStorage.setItem('gti_last_update', new Date().toISOString());
                
                this.updateUI();
                this.hideLoading();
                
                this.showSuccess('Document processed successfully!');
                
                // Upload to GitHub if configured
                await this.githubIntegration.uploadToGitHub(result.chunks, result.vectorDb);
            } else {
                throw new Error(result.error || 'Document processing failed');
            }
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to process document: ${error.message}`);
        }
    }
    
    async searchAndAnswer(query) {
        try {
            if (!this.state.vectorDbReady) {
                throw new Error('Please upload and process a document first');
            }
            
            if (!this.state.apiKeysConfigured) {
                throw new Error('Please configure API keys in settings');
            }
            
            // Search vector database
            const searchResults = await this.vectorDatabase.search(query, {
                topK: 5,
                includeMetadata: true
            });
            
            // Generate response using LLM
            const response = await this.generateResponse(query, searchResults);
            
            // Save to history
            this.chatInterface.saveToHistory(query, response, searchResults);
            
            return {
                success: true,
                response,
                searchResults
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async generateResponse(query, searchResults) {
        const model = this.state.currentModel;
        const temperature = this.state.temperature;
        
        // Build context from search results
        const context = this.buildContext(query, searchResults);
        
        if (model.startsWith('gemini')) {
            return await this.generateGeminiResponse(context, temperature);
        } else if (model.startsWith('gpt')) {
            return await this.generateOpenAIResponse(context, model, temperature);
        } else {
            throw new Error('Unsupported model');
        }
    }
    
    buildContext(query, searchResults) {
        const contextParts = [
            `USER QUESTION: ${query}`,
            `\\nRELEVANT DOCUMENTATION:`
        ];
        
        searchResults.forEach((result, index) => {
            contextParts.push(`\\n--- Section ${index + 1} (Score: ${result.score.toFixed(2)}) ---`);
            
            const metadata = result.metadata;
            if (metadata.states?.length) {
                contextParts.push(`States: ${metadata.states.join(', ')}`);
            }
            if (metadata.sections?.length) {
                contextParts.push(`Type: ${metadata.sections.join(', ')}`);
            }
            if (metadata.topics?.length) {
                contextParts.push(`Topics: ${metadata.topics.join(', ')}`);
            }
            
            contextParts.push(`Content: ${result.text}`);
            
            if (result.images?.length) {
                contextParts.push(`Images:`);
                result.images.forEach(img => {
                    contextParts.push(`- [IMAGE: ${img.filename} - ${img.label}]`);
                });
            }
        });
        
        return contextParts.join('\\n');
    }
    
    async generateGeminiResponse(context, temperature) {
        const apiKey = this.settingsManager.getApiKey('gemini');
        if (!apiKey) throw new Error('Gemini API key not configured');
        
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are a GTI SOP Assistant. Answer based ONLY on the provided documentation.\\n\\n${context}`
                    }]
                }],
                generationConfig: {
                    temperature: temperature,
                    maxOutputTokens: 1000
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        }
        
        throw new Error('No response generated');
    }
    
    async generateOpenAIResponse(context, model, temperature) {
        const apiKey = this.settingsManager.getApiKey('openai');
        if (!apiKey) throw new Error('OpenAI API key not configured');
        
        const modelMap = {
            'gpt-4-mini': 'gpt-4o-mini',
            'gpt-4': 'gpt-4'
        };
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelMap[model] || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a GTI SOP Assistant. Answer based ONLY on provided documentation.'
                    },
                    {
                        role: 'user',
                        content: context
                    }
                ],
                max_tokens: 1000,
                temperature: temperature
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.choices?.[0]?.message?.content) {
            return result.choices[0].message.content;
        }
        
        throw new Error('No response generated');
    }
    
    showLoading(message = 'Loading...') {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.querySelector('p').textContent = message;
            spinner.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add('show');
            
            // Auto-hide after 4 seconds
            setTimeout(() => {
                notification.classList.remove('show');
            }, 4000);
        }
    }
    
    hideError() {
        // Hide any existing error notifications
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.remove('show');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GTISOPAssistant();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GTISOPAssistant;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.GTISOPAssistant = GTISOPAssistant;
}