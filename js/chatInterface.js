/**
 * Chat Interface - Handles the chat UI and conversation management
 */

class ChatInterface {
    constructor(app) {
        this.app = app;
        this.messages = [];
        this.isProcessing = false;
        
        this.setupEventListeners();
        this.loadHistory();
    }
    
    setupEventListeners() {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        
        // Send message on button click
        sendBtn?.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Handle suggested questions
        document.querySelectorAll('.suggested-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.textContent.trim();
                chatInput.value = question;
                this.sendMessage();
            });
        });
        
        // Auto-resize chat input
        chatInput?.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        });
    }
    
    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        const query = chatInput?.value.trim();
        
        if (!query || this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        this.updateSendButton(true);
        
        try {
            // Add user message to chat
            this.addMessage('user', query);
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            // Hide suggested questions after first message
            this.hideSuggestedQuestions();
            
            // Show typing indicator
            const typingId = this.showTypingIndicator();
            
            // Get response from app
            const result = await this.app.searchAndAnswer(query);
            
            // Remove typing indicator
            this.removeTypingIndicator(typingId);
            
            if (result.success) {
                // Add assistant response
                this.addMessage('assistant', result.response, result.searchResults);
                
                // Save to history
                this.saveToHistory(query, result.response, result.searchResults);
            } else {
                // Add error message
                this.addMessage('assistant', `❌ ${result.error}`);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.addMessage('assistant', '❌ Sorry, I encountered an error processing your request.');
        } finally {
            this.isProcessing = false;
            this.updateSendButton(false);
        }
    }
    
    addMessage(role, content, searchResults = null) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-enter flex items-start space-x-3 ${role === 'user' ? 'justify-end' : ''}`;
        
        if (role === 'user') {
            messageDiv.innerHTML = `
                <div class="message-bubble user-bubble bg-primary text-white rounded-2xl px-4 py-3 max-w-md">
                    <p class="text-sm">${this.escapeHtml(content)}</p>
                </div>
                <div class="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <i data-lucide="user" class="w-4 h-4 text-white"></i>
                </div>
            `;
        } else {
            const processedContent = this.processResponse(content);
            const searchResultsHtml = searchResults ? this.renderSearchResults(searchResults) : '';
            
            messageDiv.innerHTML = `
                <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                    <i data-lucide="bot" class="w-4 h-4 text-white"></i>
                </div>
                <div class="flex-1">
                    <div class="message-bubble bot-bubble bg-gray-50 rounded-2xl px-4 py-3 max-w-2xl">
                        <div class="prose prose-sm max-w-none">
                            ${processedContent}
                        </div>
                    </div>
                    ${searchResultsHtml}
                </div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        
        // Initialize Lucide icons for new elements
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Save message to memory
        this.messages.push({
            id: Date.now().toString(),
            role,
            content,
            timestamp: new Date().toISOString(),
            searchResults: searchResults || null
        });
    }
    
    processResponse(content) {
        // Convert markdown-like formatting to HTML
        let processed = content
            // Bold text
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
            // Italic text
            .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\\s\\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm">$1</code>')
            // Line breaks
            .replace(/\\n/g, '<br>')
            // Bullet points
            .replace(/^[-*+]\\s+(.+)$/gm, '<li>$1</li>')
            // Wrap list items
            .replace(/(<li>.*<\\/li>)/s, '<ul class="list-disc list-inside space-y-1">$1</ul>');
        
        // Process image references
        processed = this.processImageReferences(processed);
        
        return processed;
    }
    
    processImageReferences(content) {
        // Pattern for image references: [IMAGE: filename - label] - matching Python implementation
        const imagePattern = /\[IMAGE:\s*([^\]]+?)\s*-\s*([^\]]+?)\]/g;
        
        return content.replace(imagePattern, (match, filename, label) => {
            // Create image display matching Python Streamlit implementation
            const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            return `
                <div class="image-container" style="
                    border: 2px solid #374151;
                    border-radius: 12px;
                    padding: 16px;
                    margin: 16px 0;
                    text-align: center;
                    background: #1f2937;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                ">
                    <div class="image-wrapper" style="position: relative; margin-bottom: 12px;">
                        <img 
                            id="${imageId}" 
                            src="/images/${this.escapeHtml(filename)}" 
                            alt="${this.escapeHtml(label)}"
                            style="
                                max-width: 100%;
                                height: auto;
                                border-radius: 8px;
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                                display: none;
                            "
                            onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                        />
                        <div class="image-placeholder" style="
                            width: 100%;
                            height: 200px;
                            background: linear-gradient(135deg, #374151, #4b5563);
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 48px;
                            color: #9ca3af;
                        ">
                            🖼️
                        </div>
                    </div>
                    <div class="image-caption" style="
                        font-size: 14px;
                        color: #d1d5db;
                        font-weight: 500;
                        margin-bottom: 4px;
                    ">
                        ${this.escapeHtml(label)}
                    </div>
                    <div class="image-filename" style="
                        font-size: 12px;
                        color: #9ca3af;
                        font-style: italic;
                    ">
                        ${this.escapeHtml(filename)}
                    </div>
                </div>
            `;
        });
    }
    
    renderSearchResults(searchResults) {
        if (!searchResults || searchResults.length === 0) {
            return '';
        }
        
        const showChunkRelevance = document.getElementById('showChunkRelevance')?.checked;
        if (!showChunkRelevance) {
            return '';
        }
        
        const resultsHtml = searchResults.slice(0, 3).map((result, index) => {
            const metadata = result.metadata || {};
            const searchTypes = result.searchTypes || [];
            
            // Create metadata tags
            const tags = [];
            if (metadata.states) tags.push(...metadata.states.map(s => `<span class="metadata-tag">${s}</span>`));
            if (metadata.sections) tags.push(...metadata.sections.map(s => `<span class="metadata-tag">${s}</span>`));
            if (metadata.topics) tags.push(...metadata.topics.slice(0, 2).map(t => `<span class="metadata-tag">${t}</span>`));
            if (metadata.has_images) tags.push(`<span class="metadata-tag">📸 ${metadata.image_count} images</span>`);
            
            return `
                <div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-blue-900">Match ${index + 1}</span>
                        <span class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Score: ${result.score.toFixed(2)}
                        </span>
                    </div>
                    
                    ${tags.length > 0 ? `<div class="mb-2">${tags.join('')}</div>` : ''}
                    
                    <p class="text-sm text-gray-700 mb-2">
                        ${this.escapeHtml(result.text.substring(0, 150))}...
                    </p>
                    
                    ${searchTypes.length > 0 ? `
                        <div class="text-xs text-blue-600">
                            Found via: ${searchTypes.join(', ')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        return `
            <div class="mt-4">
                <details class="cursor-pointer">
                    <summary class="text-sm font-medium text-gray-600 hover:text-gray-800 flex items-center space-x-2">
                        <i data-lucide="search" class="w-4 h-4"></i>
                        <span>Search Details (${searchResults.length} matches)</span>
                    </summary>
                    <div class="mt-2 space-y-2">
                        ${resultsHtml}
                    </div>
                </details>
            </div>
        `;
    }
    
    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return null;
        
        const typingDiv = document.createElement('div');
        const typingId = `typing-${Date.now()}`;
        typingDiv.id = typingId;
        typingDiv.className = 'flex items-start space-x-3';
        
        typingDiv.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                <i data-lucide="bot" class="w-4 h-4 text-white"></i>
            </div>
            <div class="bg-gray-50 rounded-2xl px-4 py-3">
                <div class="typing-indicator"></div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        this.scrollToBottom();
        
        return typingId;
    }
    
    removeTypingIndicator(typingId) {
        if (typingId) {
            const typingDiv = document.getElementById(typingId);
            if (typingDiv) {
                typingDiv.remove();
            }
        }
    }
    
    hideSuggestedQuestions() {
        const suggestedQuestions = document.getElementById('suggestedQuestions');
        if (suggestedQuestions && this.messages.filter(m => m.role === 'user').length === 1) {
            suggestedQuestions.style.display = 'none';
        }
    }
    
    updateSendButton(disabled) {
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.disabled = disabled;
            if (disabled) {
                sendBtn.innerHTML = '<div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>';
            } else {
                sendBtn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i>';
                // Re-initialize Lucide icons
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }
    }
    
    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    clearChat() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            // Keep the welcome message
            const welcomeMessage = chatMessages.firstElementChild?.cloneNode(true);
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
        }
        
        this.messages = [];
        this.saveHistory();
        
        // Show suggested questions again
        const suggestedQuestions = document.getElementById('suggestedQuestions');
        if (suggestedQuestions) {
            suggestedQuestions.style.display = 'block';
        }
    }
    
    saveToHistory(query, response, searchResults) {
        const historyItem = {
            id: Date.now().toString(),
            query,
            response,
            searchResults,
            timestamp: new Date().toISOString()
        };
        
        // Load existing history
        let history = this.loadHistory();
        
        // Add new item
        history.push(historyItem);
        
        // Keep only last 50 items
        if (history.length > 50) {
            history = history.slice(-50);
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('gti_chat_history', JSON.stringify(history));
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
        
        // Update UI
        this.app.updateChatHistory();
    }
    
    loadHistory() {
        try {
            const history = localStorage.getItem('gti_chat_history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.warn('Failed to load chat history:', error);
            return [];
        }
    }
    
    loadHistoryItem(itemId) {
        const history = this.loadHistory();
        const item = history.find(h => h.id === itemId);
        
        if (item) {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.value = item.query;
                chatInput.focus();
            }
        }
    }
    
    saveHistory() {
        try {
            localStorage.setItem('gti_chat_history', JSON.stringify(this.messages));
        } catch (error) {
            console.warn('Failed to save history:', error);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatInterface;
}