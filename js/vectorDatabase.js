/**
 * Vector Database - Handles vector search and similarity matching
 * Ported from the Python advanced_vector_db.py functionality
 */

class VectorDatabase {
    constructor(app) {
        this.app = app;
        this.chunks = [];
        this.embeddings = [];
        this.metadata = [];
        this.isReady = false;
        
        // Initialize TF-IDF for keyword search as fallback
        this.keywordSearch = new KeywordSearch();
    }
    
    async buildFromChunks(chunks) {
        try {
            console.log('Building vector database from chunks:', chunks.length);
            
            this.chunks = chunks;
            this.metadata = chunks.map(chunk => chunk.metadata);
            
            // Generate embeddings for each chunk
            // Since we can't use sentence-transformers in browser, we'll use a simpler approach
            this.embeddings = await this.generateSimpleEmbeddings(chunks);
            
            // Build keyword search index
            this.keywordSearch.buildIndex(chunks);
            
            this.isReady = true;
            console.log('Vector database built successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to build vector database:', error);
            throw error;
        }
    }
    
    async generateSimpleEmbeddings(chunks) {
        // Simple TF-IDF based embeddings as fallback
        // In production, you'd use a proper embedding service or model
        
        const embeddings = [];
        const vocabulary = this.buildVocabulary(chunks);
        
        for (const chunk of chunks) {
            const embedding = this.generateTFIDFVector(chunk.text, vocabulary);
            embeddings.push(embedding);
        }
        
        return embeddings;
    }
    
    buildVocabulary(chunks) {
        const wordCounts = new Map();
        const docCount = chunks.length;
        
        // Count word frequencies across all documents
        chunks.forEach(chunk => {
            const words = this.tokenize(chunk.text);
            const uniqueWords = new Set(words);
            
            uniqueWords.forEach(word => {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
        });
        
        // Filter vocabulary (remove very rare or very common words)
        const vocabulary = [];
        wordCounts.forEach((count, word) => {
            const df = count / docCount;
            if (df > 0.01 && df < 0.9 && word.length > 2) {
                vocabulary.push(word);
            }
        });
        
        return vocabulary.slice(0, 1000); // Limit vocabulary size
    }
    
    generateTFIDFVector(text, vocabulary) {
        const words = this.tokenize(text);
        const wordCounts = new Map();
        
        // Count word frequencies in this document
        words.forEach(word => {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        });
        
        // Generate TF-IDF vector
        const vector = vocabulary.map(word => {
            const tf = wordCounts.get(word) || 0;
            const idf = Math.log(this.chunks.length / (this.getDocumentFrequency(word) + 1));
            return tf * idf;
        });
        
        // Normalize vector
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
    }
    
    getDocumentFrequency(word) {
        return this.chunks.filter(chunk => 
            this.tokenize(chunk.text).includes(word)
        ).length;
    }
    
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\\s]/g, ' ')
            .split(/\\s+/)
            .filter(word => word.length > 2);
    }
    
    async search(query, options = {}) {
        if (!this.isReady) {
            throw new Error('Vector database not ready. Please process a document first.');
        }
        
        const {
            topK = 5,
            includeMetadata = true,
            stateFilter = null,
            sectionFilter = null,
            requireImages = false
        } = options;
        
        console.log('Searching for:', query, 'with options:', options);
        
        // Extract query components
        const queryComponents = this.extractQueryComponents(query);
        
        // Perform hybrid search (semantic + keyword + metadata)
        const semanticResults = await this.semanticSearch(query, topK * 2);
        const keywordResults = this.keywordSearch.search(query, topK * 2);
        const metadataResults = this.metadataSearch(queryComponents, topK * 2);
        
        // Combine and rank results
        const combinedResults = this.combineSearchResults(
            semanticResults,
            keywordResults,
            metadataResults,
            queryComponents
        );
        
        // Apply filters
        let filteredResults = combinedResults;
        
        if (stateFilter) {
            filteredResults = filteredResults.filter(result => 
                result.metadata.states?.includes(stateFilter)
            );
        }
        
        if (sectionFilter) {
            filteredResults = filteredResults.filter(result =>
                result.metadata.sections?.includes(sectionFilter)
            );
        }
        
        if (requireImages) {
            filteredResults = filteredResults.filter(result =>
                result.metadata.has_images
            );
        }
        
        // Return top results
        const topResults = filteredResults.slice(0, topK);
        
        // Add search metadata if requested
        if (includeMetadata) {
            topResults.forEach(result => {
                result.searchMetadata = {
                    queryComponents,
                    searchTypes: this.identifySearchTypes(result, query)
                };
            });
        }
        
        console.log('Search results:', topResults.length);
        return topResults;
    }
    
    async semanticSearch(query, topK) {
        // Generate query embedding
        const queryVector = this.generateTFIDFVector(query, this.buildVocabulary([{text: query}]));
        
        // Calculate similarities
        const similarities = this.embeddings.map((embedding, index) => ({
            index,
            score: this.cosineSimilarity(queryVector, embedding),
            chunk: this.chunks[index],
            metadata: this.metadata[index],
            text: this.chunks[index].text,
            images: this.chunks[index].images || []
        }));
        
        // Sort by similarity and return top results
        return similarities
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
    
    metadataSearch(queryComponents, topK) {
        const results = [];
        
        this.chunks.forEach((chunk, index) => {
            let score = 0;
            const metadata = chunk.metadata;
            
            // State matching
            if (queryComponents.state && metadata.states?.includes(queryComponents.state)) {
                score += 0.5;
            }
            
            // Order type matching  
            if (queryComponents.orderType && metadata.sections?.includes(queryComponents.orderType)) {
                score += 0.3;
            }
            
            // Topic matching
            if (queryComponents.topics?.length) {
                const topicMatches = queryComponents.topics.filter(topic => 
                    metadata.topics?.includes(topic)
                ).length;
                score += topicMatches * 0.2;
            }
            
            if (score > 0) {
                results.push({
                    index,
                    score,
                    chunk,
                    metadata,
                    text: chunk.text,
                    images: chunk.images || []
                });
            }
        });
        
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
    
    combineSearchResults(semanticResults, keywordResults, metadataResults, queryComponents) {
        const resultMap = new Map();
        
        // Add semantic results
        semanticResults.forEach(result => {
            const key = result.index;
            if (!resultMap.has(key)) {
                resultMap.set(key, { ...result, searchTypes: [] });
            }
            resultMap.get(key).searchTypes.push('semantic');
        });
        
        // Add keyword results
        keywordResults.forEach(result => {
            const key = result.index;
            if (resultMap.has(key)) {
                const existing = resultMap.get(key);
                existing.score = Math.max(existing.score, result.score * 0.8);
                existing.searchTypes.push('keyword');
            } else {
                resultMap.set(key, { 
                    ...result, 
                    score: result.score * 0.8,
                    searchTypes: ['keyword']
                });
            }
        });
        
        // Add metadata results
        metadataResults.forEach(result => {
            const key = result.index;
            if (resultMap.has(key)) {
                const existing = resultMap.get(key);
                existing.score += result.score * 0.6;
                existing.searchTypes.push('metadata');
            } else {
                resultMap.set(key, { 
                    ...result, 
                    score: result.score * 0.6,
                    searchTypes: ['metadata']
                });
            }
        });
        
        // Convert to array and sort
        return Array.from(resultMap.values())
            .sort((a, b) => b.score - a.score);
    }
    
    extractQueryComponents(query) {
        const queryLower = query.toLowerCase();
        
        // State extraction
        const statePatterns = {
            'OH': ['ohio', 'oh'],
            'MD': ['maryland', 'md'],
            'NJ': ['new jersey', 'nj', 'jersey'],
            'IL': ['illinois', 'il'],
            'NY': ['new york', 'ny'],
            'NV': ['nevada', 'nv'],
            'MA': ['massachusetts', 'ma']
        };
        
        let detectedState = null;
        for (const [state, patterns] of Object.entries(statePatterns)) {
            if (patterns.some(pattern => queryLower.includes(pattern))) {
                detectedState = state;
                break;
            }
        }
        
        // Order type extraction
        let orderType = null;
        if (queryLower.includes('rise') || queryLower.includes('internal')) {
            orderType = 'RISE';
        } else if (queryLower.includes('regular') || queryLower.includes('wholesale')) {
            orderType = 'REGULAR';
        }
        
        // Topic extraction
        const topicPatterns = {
            'PRICING': ['price', 'pricing', 'cost', 'discount', 'menu'],
            'BATTERIES': ['battery', 'batteries', 'separate', 'invoice'],
            'BATCH_SUB': ['batch', 'sub', 'substitution', 'fifo'],
            'DELIVERY_DATE': ['delivery', 'date', 'schedule'],
            'ORDER_LIMIT': ['limit', 'maximum', 'max', 'unit']
        };
        
        const detectedTopics = [];
        for (const [topic, patterns] of Object.entries(topicPatterns)) {
            if (patterns.some(pattern => queryLower.includes(pattern))) {
                detectedTopics.push(topic);
            }
        }
        
        return {
            state: detectedState,
            orderType,
            topics: detectedTopics,
            requiresImages: queryLower.includes('image') || queryLower.includes('show') || queryLower.includes('example')
        };
    }
    
    identifySearchTypes(result, query) {
        const types = result.searchTypes || [];
        
        // Add specific search type identifiers
        if (result.metadata.has_images && query.toLowerCase().includes('image')) {
            types.push('image');
        }
        
        if (result.metadata.states?.length) {
            types.push('state-specific');
        }
        
        return types;
    }
    
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        
        if (normA === 0 || normB === 0) return 0;
        
        return dotProduct / (normA * normB);
    }
    
    async loadFromStorage(chunks, vectorDbData) {
        try {
            this.chunks = chunks;
            this.metadata = chunks.map(chunk => chunk.metadata);
            
            if (vectorDbData && vectorDbData.embeddings) {
                this.embeddings = vectorDbData.embeddings;
            } else {
                // Rebuild embeddings
                this.embeddings = await this.generateSimpleEmbeddings(chunks);
            }
            
            this.keywordSearch.buildIndex(chunks);
            this.isReady = true;
            
            console.log('Vector database loaded from storage');
            return true;
        } catch (error) {
            console.error('Failed to load vector database from storage:', error);
            return false;
        }
    }
    
    exportData() {
        return {
            chunks: this.chunks,
            embeddings: this.embeddings,
            metadata: this.metadata,
            isReady: this.isReady
        };
    }
}

/**
 * Keyword Search - Simple text-based search as fallback
 */
class KeywordSearch {
    constructor() {
        this.index = new Map();
        this.chunks = [];
    }
    
    buildIndex(chunks) {
        this.chunks = chunks;
        this.index.clear();
        
        chunks.forEach((chunk, chunkIndex) => {
            const words = this.tokenize(chunk.text);
            
            words.forEach(word => {
                if (!this.index.has(word)) {
                    this.index.set(word, []);
                }
                this.index.get(word).push({
                    chunkIndex,
                    frequency: words.filter(w => w === word).length
                });
            });
        });
    }
    
    search(query, topK = 5) {
        const queryWords = this.tokenize(query);
        const scores = new Map();
        
        queryWords.forEach(word => {
            const postings = this.index.get(word) || [];
            
            postings.forEach(posting => {
                const currentScore = scores.get(posting.chunkIndex) || 0;
                scores.set(posting.chunkIndex, currentScore + posting.frequency);
            });
        });
        
        // Convert to array and sort
        const results = Array.from(scores.entries())
            .map(([index, score]) => ({
                index: parseInt(index),
                score: score / queryWords.length, // Normalize by query length
                chunk: this.chunks[index],
                metadata: this.chunks[index].metadata,
                text: this.chunks[index].text,
                images: this.chunks[index].images || []
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        
        return results;
    }
    
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\\s]/g, ' ')
            .split(/\\s+/)
            .filter(word => word.length > 2);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VectorDatabase, KeywordSearch };
}