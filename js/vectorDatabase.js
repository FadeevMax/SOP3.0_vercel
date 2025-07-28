/**
 * Advanced Vector Database - JavaScript implementation matching advanced_vector_db.py
 * Implements multiple indexing strategies for optimal performance with cheap LLM models
 */

class AdvancedVectorDatabase {
    constructor(app) {
        this.app = app;
        
        // Multiple indices for different search strategies - matching Python implementation
        this.semanticIndex = null;     // Main semantic search
        this.metadataIndex = null;     // Metadata-based search
        this.keywordIndex = null;      // TF-IDF keyword search
        this.imageIndex = null;        // Image-specific search
        
        // Data storage
        this.chunks = [];
        this.metadataStore = {};
        
        // Caches for performance
        this.embeddingCache = new Map();
        this.searchCache = new Map();
        
        // Configuration
        this.isReady = false;
        
        // Query intelligence - matching Python ImprovedQueryIntelligence
        this.queryIntelligence = new ImprovedQueryIntelligence();
    }
    
    async buildFromChunks(chunks, outputDir = "vector_db") {
        console.log("Building advanced vector database...");
        
        // Store chunks
        this.chunks = chunks;
        
        // 1. Build semantic embeddings with context enhancement
        console.log("Creating semantic embeddings...");
        const semanticEmbeddings = await this.createEnhancedEmbeddings(chunks);
        
        // 2. Build metadata embeddings
        console.log("Creating metadata embeddings...");
        const metadataEmbeddings = this.createMetadataEmbeddings(chunks);
        
        // 3. Build keyword index
        console.log("Creating keyword index...");
        const keywordFeatures = this.createKeywordFeatures(chunks);
        
        // 4. Build specialized indices
        console.log("Building specialized indices...");
        this.buildSemanticIndex(semanticEmbeddings);
        this.buildMetadataIndex(metadataEmbeddings);
        this.buildKeywordIndex(keywordFeatures);
        this.buildImageIndex(chunks);
        
        // 5. Create metadata store
        this.createMetadataStore(chunks);
        
        this.isReady = true;
        console.log(`✅ Advanced vector database built with ${chunks.length} chunks`);
        
        // Print statistics - matching Python
        this.printBuildStatistics(chunks, semanticEmbeddings);
    }
    
    async createEnhancedEmbeddings(chunks) {
        // Simulate sentence transformer embeddings with enhanced context
        const embeddings = [];
        
        for (const chunk of chunks) {
            // Create enhanced text with context - matching Python implementation
            let enhancedText = chunk.text;
            
            // Add state context
            if (chunk.metadata.states && chunk.metadata.states.length > 0) {
                enhancedText = `State: ${chunk.metadata.states.join(', ')}. ${enhancedText}`;
            }
            
            // Add section context
            if (chunk.metadata.sections && chunk.metadata.sections.length > 0) {
                enhancedText = `Section: ${chunk.metadata.sections.join(', ')}. ${enhancedText}`;
            }
            
            // Add topic context
            if (chunk.metadata.topics && chunk.metadata.topics.length > 0) {
                enhancedText = `Topics: ${chunk.metadata.topics.join(', ')}. ${enhancedText}`;
            }
            
            // Create simple embedding (in production, use real sentence transformers)
            const embedding = this.createSimpleEmbedding(enhancedText);
            embeddings.push(embedding);
        }
        
        return embeddings;
    }
    
    createSimpleEmbedding(text, dim = 384) {
        // Simple hash-based embedding for demonstration
        // In production, this would use sentence-transformers
        const words = text.toLowerCase().split(/\s+/);
        const embedding = new Array(dim).fill(0);
        
        words.forEach((word, i) => {
            let hash = 0;
            for (let j = 0; j < word.length; j++) {
                hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
            }
            const index = Math.abs(hash) % dim;
            embedding[index] += 1 / Math.sqrt(words.length);
        });
        
        // Normalize
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= norm;
            }
        }
        
        return embedding;
    }
    
    createMetadataEmbeddings(chunks) {
        // Create embeddings based on metadata - matching Python implementation
        const metadataEmbeddings = [];
        
        for (const chunk of chunks) {
            const metadata = chunk.metadata;
            const metadataText = [
                ...(metadata.states || []),
                ...(metadata.sections || []),
                ...(metadata.topics || []),
                metadata.has_images ? 'has_images' : 'no_images'
            ].join(' ');
            
            const embedding = this.createSimpleEmbedding(metadataText, 128);
            metadataEmbeddings.push(embedding);
        }
        
        return metadataEmbeddings;
    }
    
    createKeywordFeatures(chunks) {
        // TF-IDF implementation matching Python sklearn
        const documents = chunks.map(chunk => chunk.text.toLowerCase());
        const vocabulary = new Map();
        const wordCounts = [];
        
        // Build vocabulary
        documents.forEach(doc => {
            const words = this.tokenize(doc);
            const wordCount = new Map();
            
            words.forEach(word => {
                wordCount.set(word, (wordCount.get(word) || 0) + 1);
                if (!vocabulary.has(word)) {
                    vocabulary.set(word, vocabulary.size);
                }
            });
            
            wordCounts.push(wordCount);
        });
        
        // Limit vocabulary size (matching Python max_features=1000)
        const sortedWords = Array.from(vocabulary.entries())
            .sort((a, b) => {
                // Sort by document frequency
                const freqA = documents.filter(doc => this.tokenize(doc).includes(a[0])).length;
                const freqB = documents.filter(doc => this.tokenize(doc).includes(b[0])).length;
                return freqB - freqA;
            })
            .slice(0, 1000);
        
        const finalVocabulary = new Map(sortedWords.map(([word], index) => [word, index]));
        
        // Create TF-IDF vectors
        const tfidfVectors = [];
        for (let docIndex = 0; docIndex < documents.length; docIndex++) {
            const vector = new Array(finalVocabulary.size).fill(0);
            const wordCount = wordCounts[docIndex];
            
            for (const [word, vocabIndex] of finalVocabulary.entries()) {
                const tf = wordCount.get(word) || 0;
                if (tf > 0) {
                    const df = documents.filter(doc => this.tokenize(doc).includes(word)).length;
                    const idf = Math.log(documents.length / df);
                    vector[vocabIndex] = tf * idf;
                }
            }
            
            tfidfVectors.push(vector);
        }
        
        return { vectors: tfidfVectors, vocabulary: finalVocabulary };
    }
    
    buildSemanticIndex(embeddings) {
        // Store embeddings for cosine similarity search
        this.semanticIndex = embeddings;
    }
    
    buildMetadataIndex(embeddings) {
        // Store metadata embeddings
        this.metadataIndex = embeddings;
    }
    
    buildKeywordIndex(keywordFeatures) {
        // Store TF-IDF vectors and vocabulary
        this.keywordIndex = keywordFeatures;
    }
    
    buildImageIndex(chunks) {
        // Create index of chunks with images
        this.imageIndex = chunks
            .map((chunk, index) => ({ chunk, index, hasImages: chunk.metadata.has_images }))
            .filter(item => item.hasImages);
    }
    
    createMetadataStore(chunks) {
        // Enhanced metadata structure matching Python ChunkMetadata
        chunks.forEach((chunk, index) => {
            const metadata = chunk.metadata;
            this.metadataStore[index] = {
                chunkId: chunk.chunk_id,
                states: metadata.states || [],
                sections: metadata.sections || [],
                topics: metadata.topics || [],
                hasImages: metadata.has_images || false,
                imageCount: metadata.image_count || 0,
                wordCount: metadata.word_count || 0,
                keywords: this.extractKeywords(chunk.text),
                semanticFingerprint: this.createSemanticFingerprint(chunk.text),
                textPreview: chunk.text.substring(0, 200)
            };
        });
    }
    
    extractKeywords(text) {
        // Extract important keywords from text
        const words = this.tokenize(text);
        const wordFreq = new Map();
        
        words.forEach(word => {
            if (word.length > 3) { // Skip short words
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        });
        
        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
    
    createSemanticFingerprint(text) {
        // Create a simple hash fingerprint
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }
    
    async search(query, filters = null, limit = 5) {
        if (!this.isReady) {
            console.warn('Vector database not ready');
            return [];
        }
        
        console.log('🔍 Advanced search for:', query);
        
        // Enhanced query processing - matching Python implementation
        const enhancedQuery = this.queryIntelligence.enhanceQuery(query);
        console.log('Enhanced query filters:', enhancedQuery);
        
        // Multi-strategy search
        const semanticResults = await this.semanticSearch(query, limit * 2);
        const keywordResults = this.keywordSearch(query, limit * 2);
        const metadataResults = this.metadataSearch(enhancedQuery, limit * 2);
        
        // Hybrid fusion - matching Python implementation
        const fusedResults = this.hybridSearch(semanticResults, keywordResults, metadataResults, query);
        
        // Apply filters if provided
        let filteredResults = fusedResults;
        if (filters || enhancedQuery.state || enhancedQuery.orderType || enhancedQuery.topics.length > 0) {
            const combinedFilters = {
                ...filters,
                state: enhancedQuery.state,
                orderType: enhancedQuery.orderType,
                topics: enhancedQuery.topics
            };
            filteredResults = this.applyAdvancedFilters(fusedResults, combinedFilters);
        }
        
        // Return top results
        const results = filteredResults.slice(0, limit);
        console.log(`📊 Found ${results.length} relevant chunks with hybrid search`);
        
        return results;
    }
    
    async semanticSearch(query, limit) {
        const queryEmbedding = this.createSimpleEmbedding(query);
        const similarities = [];
        
        for (let i = 0; i < this.semanticIndex.length; i++) {
            const similarity = this.cosineSimilarity(queryEmbedding, this.semanticIndex[i]);
            similarities.push({
                chunkIndex: i,
                chunk: this.chunks[i],
                similarity: similarity,
                score: similarity,
                source: 'semantic'
            });
        }
        
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    
    keywordSearch(query, limit) {
        if (!this.keywordIndex) return [];
        
        const queryVector = this.createQueryTFIDF(query, this.keywordIndex.vocabulary);
        const similarities = [];
        
        for (let i = 0; i < this.keywordIndex.vectors.length; i++) {
            const similarity = this.cosineSimilarity(queryVector, this.keywordIndex.vectors[i]);
            similarities.push({
                chunkIndex: i,
                chunk: this.chunks[i],
                similarity: similarity,
                score: similarity,
                source: 'keyword'
            });
        }
        
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    
    metadataSearch(enhancedQuery, limit) {
        const results = [];
        
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            const metadata = chunk.metadata;
            let score = 0;
            
            // State matching
            if (enhancedQuery.state && metadata.states && metadata.states.includes(enhancedQuery.state)) {
                score += 1.0;
            }
            
            // Order type matching
            if (enhancedQuery.orderType && metadata.sections && metadata.sections.includes(enhancedQuery.orderType)) {
                score += 0.8;
            }
            
            // Topic matching
            if (enhancedQuery.topics && enhancedQuery.topics.length > 0 && metadata.topics) {
                const topicMatches = enhancedQuery.topics.filter(topic => metadata.topics.includes(topic)).length;
                score += (topicMatches / enhancedQuery.topics.length) * 0.6;
            }
            
            if (score > 0) {
                results.push({
                    chunkIndex: i,
                    chunk: chunk,
                    similarity: score,
                    score: score,
                    source: 'metadata'
                });
            }
        }
        
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    
    hybridSearch(semanticResults, keywordResults, metadataResults, query) {
        // Reciprocal Rank Fusion - matching Python implementation
        const resultMap = new Map();
        
        // Add semantic results
        semanticResults.forEach((result, rank) => {
            const key = result.chunkIndex;
            if (!resultMap.has(key)) {
                resultMap.set(key, {
                    chunkIndex: result.chunkIndex,
                    chunk: result.chunk,
                    scores: { semantic: 0, keyword: 0, metadata: 0 },
                    ranks: { semantic: Infinity, keyword: Infinity, metadata: Infinity }
                });
            }
            const item = resultMap.get(key);
            item.scores.semantic = result.similarity;
            item.ranks.semantic = rank + 1;
        });
        
        // Add keyword results
        keywordResults.forEach((result, rank) => {
            const key = result.chunkIndex;
            if (!resultMap.has(key)) {
                resultMap.set(key, {
                    chunkIndex: result.chunkIndex,
                    chunk: result.chunk,
                    scores: { semantic: 0, keyword: 0, metadata: 0 },
                    ranks: { semantic: Infinity, keyword: Infinity, metadata: Infinity }
                });
            }
            const item = resultMap.get(key);
            item.scores.keyword = result.similarity;
            item.ranks.keyword = rank + 1;
        });
        
        // Add metadata results
        metadataResults.forEach((result, rank) => {
            const key = result.chunkIndex;
            if (!resultMap.has(key)) {
                resultMap.set(key, {
                    chunkIndex: result.chunkIndex,
                    chunk: result.chunk,
                    scores: { semantic: 0, keyword: 0, metadata: 0 },
                    ranks: { semantic: Infinity, keyword: Infinity, metadata: Infinity }
                });
            }
            const item = resultMap.get(key);
            item.scores.metadata = result.similarity;
            item.ranks.metadata = rank + 1;
        });
        
        // Calculate RRF scores
        const k = 60; // RRF parameter
        const results = Array.from(resultMap.values()).map(item => {
            const rrfScore = 
                1 / (k + item.ranks.semantic) +
                1 / (k + item.ranks.keyword) +
                1 / (k + item.ranks.metadata);
            
            return {
                chunk: item.chunk,
                similarity: rrfScore,
                relevance_score: Math.round(rrfScore * 100) / 100,
                scores: item.scores,
                ranks: item.ranks
            };
        });
        
        return results.sort((a, b) => b.similarity - a.similarity);
    }
    
    applyAdvancedFilters(results, filters) {
        return results.filter(result => {
            const metadata = result.chunk.metadata || {};
            
            // State filter
            if (filters.state && metadata.states) {
                if (!metadata.states.includes(filters.state)) {
                    return false;
                }
            }
            
            // Order type filter
            if (filters.orderType && metadata.sections) {
                if (!metadata.sections.includes(filters.orderType)) {
                    return false;
                }
            }
            
            // Topic filter
            if (filters.topics && filters.topics.length > 0 && metadata.topics) {
                if (!filters.topics.some(topic => metadata.topics.includes(topic))) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    createQueryTFIDF(query, vocabulary) {
        const queryWords = this.tokenize(query);
        const vector = new Array(vocabulary.size).fill(0);
        
        queryWords.forEach(word => {
            if (vocabulary.has(word)) {
                const index = vocabulary.get(word);
                vector[index] += 1;
            }
        });
        
        return vector;
    }
    
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }
    
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        if (normA === 0 || normB === 0) {
            return 0;
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    printBuildStatistics(chunks, embeddings) {
        console.log('📊 Vector Database Statistics:');
        console.log(`  Total chunks: ${chunks.length}`);
        console.log(`  Semantic embeddings: ${embeddings.length}`);
        console.log(`  Keyword vocabulary size: ${this.keywordIndex?.vocabulary.size || 0}`);
        console.log(`  Chunks with images: ${this.imageIndex?.length || 0}`);
        
        // State distribution
        const stateCount = {};
        chunks.forEach(chunk => {
            (chunk.metadata.states || []).forEach(state => {
                stateCount[state] = (stateCount[state] || 0) + 1;
            });
        });
        console.log('  State distribution:', stateCount);
    }
    
    async loadFromStorage(chunks, metadata) {
        console.log('Loading advanced vector database from storage...');
        await this.buildFromChunks(chunks);
        console.log('Advanced vector database loaded successfully');
    }
    
    getStats() {
        return {
            totalChunks: this.chunks.length,
            vocabularySize: this.keywordIndex?.vocabulary.size || 0,
            imageChunks: this.imageIndex?.length || 0,
            isReady: this.isReady
        };
    }
}

// Improved Query Intelligence - matching Python implementation
class ImprovedQueryIntelligence {
    constructor() {
        this.statePattern = /\b([A-Z]{2})\b/g;
        this.orderTypeKeywords = {
            "RISE": ["rise", "internal"],
            "REGULAR": ["regular", "wholesale"]
        };
        this.topicKeywords = {
            "PRICING": ["price", "pricing", "discount", "menu"],
            "BATTERIES": ["battery", "batteries", "invoice", "separate"],
            "ORDER_LIMITS": ["limit", "unit", "max", "split", "minimum", "maximum"],
            "BATCH_SUB": ["batch", "sub", "fifo", "substitution", "replace"],
            "DELIVERY": ["delivery", "schedule", "date"],
            "NOTES": ["note", "comment", "required", "mention"],
            "FORMS": ["form", "example", "template"],
            "IMAGES": ["image", "visual", "see", "picture", "show"]
        };
        
        this.US_STATE_ABBREVIATIONS = new Set([
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
            'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
            'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
            'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
            'WI', 'WY'
        ]);
    }
    
    enhanceQuery(query) {
        const queryLower = query.toLowerCase();
        
        // State extraction
        const states = [...query.matchAll(this.statePattern)].map(match => match[1]);
        const state = states.find(s => this.US_STATE_ABBREVIATIONS.has(s)) || null;
        
        // Order type
        let orderType = null;
        for (const [key, synonyms] of Object.entries(this.orderTypeKeywords)) {
            if (synonyms.some(word => queryLower.includes(word))) {
                orderType = key;
                break;
            }
        }
        
        // Topics
        const detectedTopics = [];
        for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
            if (keywords.some(word => queryLower.includes(word))) {
                detectedTopics.push(topic);
            }
        }
        
        return {
            state: state,
            orderType: orderType,
            topics: detectedTopics
        };
    }
}

// Use the Advanced Vector Database as the main VectorDatabase class
class VectorDatabase extends AdvancedVectorDatabase {}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VectorDatabase;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.VectorDatabase = VectorDatabase;
    window.AdvancedVectorDatabase = AdvancedVectorDatabase;
    window.ImprovedQueryIntelligence = ImprovedQueryIntelligence;
}