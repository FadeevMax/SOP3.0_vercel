/**
 * Advanced Vector Database - Port of Python advanced_vector_db.py
 * Multi-index search system for optimal performance with LLM models
 */

class AdvancedVectorDatabase {
    constructor() {
        this.semanticIndex = new Map(); // Semantic embeddings
        this.keywordIndex = new Map();  // TF-IDF style keyword index
        this.metadataIndex = new Map(); // Metadata filters
        this.imageIndex = new Map();    // Image-text associations
        this.chunks = [];               // Store all chunks
        this.initialized = false;
        
        // Search configuration
        this.searchConfig = {
            maxResults: 10,
            semanticWeight: 0.4,
            keywordWeight: 0.3,
            metadataWeight: 0.3,
            imageBoost: 0.1
        };
    }
    
    /**
     * Initialize the vector database with processed chunks
     * @param {Array} chunks - Processed semantic chunks
     */
    async initialize(chunks) {
        console.log(`🔄 Initializing vector database with ${chunks.length} chunks...`);
        
        this.chunks = chunks;
        
        // Build semantic index
        await this.buildSemanticIndex(chunks);
        
        // Build keyword index
        await this.buildKeywordIndex(chunks);
        
        // Build metadata index
        await this.buildMetadataIndex(chunks);
        
        // Build image index
        await this.buildImageIndex(chunks);
        
        this.initialized = true;
        console.log(`✅ Vector database initialized successfully`);
        
        return {
            chunkCount: chunks.length,
            semanticVectors: this.semanticIndex.size,
            keywordTerms: this.getTotalKeywordTerms(),
            metadataFilters: this.getMetadataStats(),
            imagesIndexed: this.imageIndex.size
        };
    }
    
    /**
     * Build semantic index with simple text embeddings
     */
    async buildSemanticIndex(chunks) {
        for (const chunk of chunks) {
            const vector = this.createTextEmbedding(chunk.text);
            this.semanticIndex.set(chunk.chunk_id, {
                id: chunk.chunk_id,
                vector: vector,
                text: chunk.text,
                textLength: chunk.text.length
            });
        }
    }
    
    /**
     * Build keyword index (TF-IDF style)
     */
    async buildKeywordIndex(chunks) {
        const documentFreq = new Map(); // How many documents contain each term
        const termFreq = new Map();     // Term frequencies per document
        
        // First pass: calculate term frequencies
        for (const chunk of chunks) {
            const terms = this.extractTerms(chunk.text);
            const chunkTermFreq = new Map();
            
            for (const term of terms) {
                chunkTermFreq.set(term, (chunkTermFreq.get(term) || 0) + 1);
                if (!documentFreq.has(term)) {
                    documentFreq.set(term, new Set());
                }
                documentFreq.get(term).add(chunk.chunk_id);
            }
            
            termFreq.set(chunk.chunk_id, chunkTermFreq);
        }
        
        // Second pass: calculate TF-IDF scores
        const totalDocs = chunks.length;
        
        for (const chunk of chunks) {
            const chunkTerms = termFreq.get(chunk.chunk_id);
            const tfidfVector = new Map();
            
            for (const [term, tf] of chunkTerms) {
                const df = documentFreq.get(term).size;
                const idf = Math.log(totalDocs / df);
                const tfidf = tf * idf;
                tfidfVector.set(term, tfidf);
            }
            
            this.keywordIndex.set(chunk.chunk_id, {
                id: chunk.chunk_id,
                vector: tfidfVector,
                topTerms: this.getTopTerms(tfidfVector, 20)
            });
        }
    }
    
    /**
     * Build metadata index for filtering
     */
    async buildMetadataIndex(chunks) {
        const stateIndex = new Map();
        const sectionIndex = new Map();
        const topicIndex = new Map();
        const imageIndex = new Map();
        
        for (const chunk of chunks) {
            const meta = chunk.metadata;
            
            // Index by states
            if (meta.states) {
                for (const state of meta.states) {
                    if (!stateIndex.has(state)) stateIndex.set(state, []);
                    stateIndex.get(state).push(chunk.chunk_id);
                }
            }
            
            // Index by sections
            if (meta.sections) {
                for (const section of meta.sections) {
                    if (!sectionIndex.has(section)) sectionIndex.set(section, []);
                    sectionIndex.get(section).push(chunk.chunk_id);
                }
            }
            
            // Index by topics
            if (meta.topics) {
                for (const topic of meta.topics) {
                    if (!topicIndex.has(topic)) topicIndex.set(topic, []);
                    topicIndex.get(topic).push(chunk.chunk_id);
                }
            }
            
            // Index by image presence
            const hasImages = meta.has_images || (chunk.images && chunk.images.length > 0);
            if (!imageIndex.has(hasImages)) imageIndex.set(hasImages, []);
            imageIndex.get(hasImages).push(chunk.chunk_id);
        }
        
        this.metadataIndex = {
            states: stateIndex,
            sections: sectionIndex,
            topics: topicIndex,
            hasImages: imageIndex
        };
    }
    
    /**
     * Build image index for image-aware search
     */
    async buildImageIndex(chunks) {
        for (const chunk of chunks) {
            if (chunk.images && chunk.images.length > 0) {
                const imageInfo = {
                    chunkId: chunk.chunk_id,
                    images: chunk.images,
                    imageCount: chunk.images.length,
                    imageKeywords: this.extractImageKeywords(chunk.images)
                };
                this.imageIndex.set(chunk.chunk_id, imageInfo);
            }
        }
    }
    
    /**
     * Perform intelligent search with multiple ranking strategies
     * @param {string} query - Search query
     * @param {Object} filters - Search filters from query intelligence
     * @param {Object} options - Search options
     */
    async search(query, filters = {}, options = {}) {
        if (!this.initialized) {
            throw new Error('Vector database not initialized');
        }
        
        console.log(`🔍 Searching for: "${query}" with filters:`, filters);
        
        // Get candidate chunks based on filters
        let candidateIds = this.applyCandidateFilters(filters);
        
        // If no candidates from filters, use all chunks
        if (candidateIds.length === 0) {
            candidateIds = this.chunks.map(c => c.chunk_id);
        }
        
        // Score all candidate chunks
        const scoredResults = [];
        
        for (const chunkId of candidateIds) {
            const chunk = this.chunks.find(c => c.chunk_id === chunkId);
            if (!chunk) continue;
            
            const scores = {
                semantic: this.calculateSemanticScore(query, chunkId),
                keyword: this.calculateKeywordScore(query, chunkId),
                metadata: this.calculateMetadataScore(filters, chunk),
                image: this.calculateImageScore(query, chunkId)
            };
            
            const totalScore = 
                scores.semantic * this.searchConfig.semanticWeight +
                scores.keyword * this.searchConfig.keywordWeight +
                scores.metadata * this.searchConfig.metadataWeight +
                scores.image * this.searchConfig.imageBoost;
            
            scoredResults.push({
                chunk: chunk,
                score: totalScore,
                scores: scores,
                explanation: this.generateScoreExplanation(scores, filters)
            });
        }
        
        // Sort by score and return top results
        const maxResults = options.maxResults || this.searchConfig.maxResults;
        const results = scoredResults
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
        
        console.log(`✅ Found ${results.length} results`);
        
        return {
            results: results,
            query: query,
            filters: filters,
            totalCandidates: candidateIds.length,
            searchTime: Date.now()
        };
    }
    
    /**
     * Apply candidate filters to reduce search space
     */
    applyCandidateFilters(filters) {
        let candidates = null;
        
        // Apply state filter
        if (filters.states && filters.states.length > 0) {
            const stateCandidates = new Set();
            for (const state of filters.states) {
                const stateChunks = this.metadataIndex.states.get(state) || [];
                stateChunks.forEach(id => stateCandidates.add(id));
            }
            candidates = candidates ? 
                new Set([...candidates].filter(id => stateCandidates.has(id))) :
                stateCandidates;
        }
        
        // Apply section filter
        if (filters.sections && filters.sections.length > 0) {
            const sectionCandidates = new Set();
            for (const section of filters.sections) {
                const sectionChunks = this.metadataIndex.sections.get(section) || [];
                sectionChunks.forEach(id => sectionCandidates.add(id));
            }
            candidates = candidates ?
                new Set([...candidates].filter(id => sectionCandidates.has(id))) :
                sectionCandidates;
        }
        
        // Apply topic filter
        if (filters.topics && filters.topics.length > 0) {
            const topicCandidates = new Set();
            for (const topic of filters.topics) {
                const topicChunks = this.metadataIndex.topics.get(topic) || [];
                topicChunks.forEach(id => topicCandidates.add(id));
            }
            candidates = candidates ?
                new Set([...candidates].filter(id => topicCandidates.has(id))) :
                topicCandidates;
        }
        
        // Apply image filter
        if (filters.hasImages) {
            const imageChunks = this.metadataIndex.hasImages.get(true) || [];
            const imageCandidates = new Set(imageChunks);
            candidates = candidates ?
                new Set([...candidates].filter(id => imageCandidates.has(id))) :
                imageCandidates;
        }
        
        return candidates ? [...candidates] : [];
    }
    
    /**
     * Calculate semantic similarity score
     */
    calculateSemanticScore(query, chunkId) {
        const queryVector = this.createTextEmbedding(query);
        const chunkData = this.semanticIndex.get(chunkId);
        
        if (!chunkData) return 0;
        
        return this.cosineSimilarity(queryVector, chunkData.vector);
    }
    
    /**
     * Calculate keyword relevance score
     */
    calculateKeywordScore(query, chunkId) {
        const queryTerms = this.extractTerms(query);
        const chunkData = this.keywordIndex.get(chunkId);
        
        if (!chunkData || queryTerms.length === 0) return 0;
        
        let score = 0;
        let totalQueryTerms = queryTerms.length;
        
        for (const term of queryTerms) {
            const tfidf = chunkData.vector.get(term) || 0;
            score += tfidf;
        }
        
        return score / totalQueryTerms;
    }
    
    /**
     * Calculate metadata relevance score
     */
    calculateMetadataScore(filters, chunk) {
        let score = 0;
        let maxScore = 0;
        
        const meta = chunk.metadata;
        
        // State match
        if (filters.states && filters.states.length > 0) {
            maxScore += 1;
            if (meta.states && meta.states.some(s => filters.states.includes(s))) {
                score += 1;
            }
        }
        
        // Section match
        if (filters.sections && filters.sections.length > 0) {
            maxScore += 1;
            if (meta.sections && meta.sections.some(s => filters.sections.includes(s))) {
                score += 1;
            }
        }
        
        // Topic match
        if (filters.topics && filters.topics.length > 0) {
            maxScore += 1;
            if (meta.topics && meta.topics.some(t => filters.topics.includes(t))) {
                score += 1;
            }
        }
        
        return maxScore > 0 ? score / maxScore : 0.5;
    }
    
    /**
     * Calculate image relevance score
     */
    calculateImageScore(query, chunkId) {
        const imageData = this.imageIndex.get(chunkId);
        if (!imageData) return 0;
        
        const queryLower = query.toLowerCase();
        const imageKeywords = imageData.imageKeywords;
        
        let matches = 0;
        for (const keyword of imageKeywords) {
            if (queryLower.includes(keyword.toLowerCase())) {
                matches++;
            }
        }
        
        return matches > 0 ? matches / imageKeywords.length : 0;
    }
    
    /**
     * Create simple text embedding (bag of words with weights)
     */
    createTextEmbedding(text) {
        const terms = this.extractTerms(text);
        const embedding = new Map();
        
        for (const term of terms) {
            embedding.set(term, (embedding.get(term) || 0) + 1);
        }
        
        // Normalize
        const norm = Math.sqrt([...embedding.values()].reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (const [term, count] of embedding) {
                embedding.set(term, count / norm);
            }
        }
        
        return embedding;
    }
    
    /**
     * Extract terms from text for indexing
     */
    extractTerms(text) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);
        
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
    }
    
    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(vec1, vec2) {
        const commonTerms = new Set([...vec1.keys()].filter(k => vec2.has(k)));
        
        if (commonTerms.size === 0) return 0;
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (const term of commonTerms) {
            const val1 = vec1.get(term) || 0;
            const val2 = vec2.get(term) || 0;
            dotProduct += val1 * val2;
        }
        
        for (const val of vec1.values()) {
            norm1 += val * val;
        }
        
        for (const val of vec2.values()) {
            norm2 += val * val;
        }
        
        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);
        
        return (norm1 > 0 && norm2 > 0) ? dotProduct / (norm1 * norm2) : 0;
    }
    
    /**
     * Get top terms from TF-IDF vector
     */
    getTopTerms(tfidfVector, count = 10) {
        return [...tfidfVector.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([term]) => term);
    }
    
    /**
     * Extract keywords from image metadata
     */
    extractImageKeywords(images) {
        const keywords = [];
        for (const image of images) {
            if (image.label) {
                keywords.push(...this.extractTerms(image.label));
            }
            if (image.filename) {
                keywords.push(...this.extractTerms(image.filename.replace(/\.[^/.]+$/, "")));
            }
        }
        return [...new Set(keywords)]; // Remove duplicates
    }
    
    /**
     * Generate explanation for search scores
     */
    generateScoreExplanation(scores, filters) {
        const explanations = [];
        
        if (scores.semantic > 0.3) {
            explanations.push(`High semantic similarity (${(scores.semantic * 100).toFixed(1)}%)`);
        }
        
        if (scores.keyword > 0.3) {
            explanations.push(`Strong keyword match (${(scores.keyword * 100).toFixed(1)}%)`);
        }
        
        if (scores.metadata > 0.7) {
            explanations.push(`Perfect metadata match`);
        }
        
        if (scores.image > 0) {
            explanations.push(`Contains relevant images`);
        }
        
        return explanations.join(', ') || 'General relevance';
    }
    
    /**
     * Get statistics about the database
     */
    getStats() {
        return {
            totalChunks: this.chunks.length,
            semanticVectors: this.semanticIndex.size,
            keywordTerms: this.getTotalKeywordTerms(),
            metadata: this.getMetadataStats(),
            imagesIndexed: this.imageIndex.size,
            initialized: this.initialized
        };
    }
    
    getTotalKeywordTerms() {
        const allTerms = new Set();
        for (const [, data] of this.keywordIndex) {
            for (const term of data.vector.keys()) {
                allTerms.add(term);
            }
        }
        return allTerms.size;
    }
    
    getMetadataStats() {
        return {
            states: this.metadataIndex.states?.size || 0,
            sections: this.metadataIndex.sections?.size || 0,
            topics: this.metadataIndex.topics?.size || 0,
            chunksWithImages: this.metadataIndex.hasImages?.get(true)?.length || 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedVectorDatabase;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.AdvancedVectorDatabase = AdvancedVectorDatabase;
}