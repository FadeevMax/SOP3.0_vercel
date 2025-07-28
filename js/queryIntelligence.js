/**
 * Query Intelligence System - Port of Python ImprovedQueryIntelligence.py
 * Extracts structured information from user queries for better search results
 */

class QueryIntelligence {
    constructor() {
        // State abbreviations mapping
        this.stateMappings = {
            'ohio': 'OH', 'oh': 'OH',
            'maryland': 'MD', 'md': 'MD', 
            'new jersey': 'NJ', 'nj': 'NJ', 'jersey': 'NJ',
            'illinois': 'IL', 'il': 'IL',
            'new york': 'NY', 'ny': 'NY',
            'nevada': 'NV', 'nv': 'NV',
            'massachusetts': 'MA', 'ma': 'MA', 'mass': 'MA',
            'california': 'CA', 'ca': 'CA',
            'texas': 'TX', 'tx': 'TX',
            'florida': 'FL', 'fl': 'FL',
            'pennsylvania': 'PA', 'pa': 'PA'
        };
        
        // Order type patterns
        this.orderTypePatterns = {
            'RISE': [
                /\brise\b/i, /\binternal\b/i, /\brise\s+order/i,
                /\binternal\s+order/i, /\bfor\s+rise\b/i
            ],
            'REGULAR': [
                /\bregular\b/i, /\bwholesale\b/i, /\bregular\s+order/i,
                /\bnormal\s+order/i, /\bnon[\s-]?rise\b/i
            ]
        };
        
        // Topic extraction patterns
        this.topicPatterns = {
            'PRICING': [/price/i, /pricing/i, /cost/i, /discount/i, /menu\s+price/i, /LT\s+price/i],
            'BATTERIES': [/batter/i, /separate\s+invoice/i],
            'BATCH_SUB': [/batch/i, /split/i, /batch\s+sub/i, /substitut/i, /fifo/i],
            'DELIVERY_DATE': [/delivery/i, /date/i, /schedule/i],
            'INVOICES': [/invoice/i, /draft/i, /billing/i],
            'CASE_SIZE': [/case/i, /size/i, /units/i, /loose/i],
            'ORDER_LIMIT': [/limit/i, /maximum/i, /max\s+unit/i, /min/i, /minimum/i],
            'LESS_AVAILABLE': [/less\s+available/i, /partial/i, /not\s+enough/i],
            'SAMPLES': [/sample/i, /test/i, /\$0\.01/i],
            'COMPLIANCE': [/compliance/i, /prop.*65/i, /regulation/i, /warning/i]
        };
        
        // Question type patterns
        this.questionPatterns = {
            'PROCEDURAL': [/how/i, /what steps/i, /process/i, /procedure/i],
            'POLICY': [/do we/i, /should we/i, /can we/i, /policy/i, /rule/i],
            'LOCATION': [/where/i, /which/i, /location/i],
            'DEFINITION': [/what is/i, /what are/i, /define/i, /meaning/i],
            'COMPARISON': [/difference/i, /compare/i, /versus/i, /vs/i]
        };
    }
    
    /**
     * Extract structured information from user query
     * @param {string} query - User's search query
     * @returns {Object} Structured query information
     */
    enhanceQuery(query) {
        const queryLower = query.toLowerCase();
        
        // Extract state
        const detectedState = this.extractState(queryLower);
        
        // Extract order type
        const detectedOrderType = this.extractOrderType(queryLower);
        
        // Extract topics
        const detectedTopics = this.extractTopics(queryLower);
        
        // Detect question type
        const questionType = this.detectQuestionType(queryLower);
        
        // Check if images are required
        const requiresImage = this.requiresImage(queryLower);
        
        // Check if procedural
        const isProcedural = this.isProcedural(queryLower);
        
        // Extract keywords for search
        const keywords = this.extractKeywords(query);
        
        return {
            state: detectedState,
            orderType: detectedOrderType,
            topics: detectedTopics,
            questionType: questionType,
            requiresImage: requiresImage,
            isProcedural: isProcedural,
            keywords: keywords,
            originalQuery: query,
            confidence: this.calculateConfidence(detectedState, detectedOrderType, detectedTopics)
        };
    }
    
    /**
     * Extract state from query
     */
    extractState(queryLower) {
        // Check direct state mappings
        for (const [text, abbr] of Object.entries(this.stateMappings)) {
            if (queryLower.includes(text)) {
                return abbr;
            }
        }
        
        // Check for state abbreviations
        const statePattern = /\b([A-Z]{2})\b/g;
        const matches = queryLower.toUpperCase().match(statePattern);
        if (matches) {
            const validStates = ['OH', 'MD', 'NJ', 'IL', 'NY', 'NV', 'MA', 'CA', 'TX', 'FL', 'PA'];
            for (const match of matches) {
                if (validStates.includes(match)) {
                    return match;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Extract order type from query
     */
    extractOrderType(queryLower) {
        for (const [orderType, patterns] of Object.entries(this.orderTypePatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(queryLower)) {
                    return orderType;
                }
            }
        }
        return null;
    }
    
    /**
     * Extract topics from query
     */
    extractTopics(queryLower) {
        const detectedTopics = [];
        
        for (const [topic, patterns] of Object.entries(this.topicPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(queryLower)) {
                    detectedTopics.push(topic);
                    break; // Only add topic once
                }
            }
        }
        
        return detectedTopics;
    }
    
    /**
     * Detect question type
     */
    detectQuestionType(queryLower) {
        for (const [type, patterns] of Object.entries(this.questionPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(queryLower)) {
                    return type;
                }
            }
        }
        return 'GENERAL';
    }
    
    /**
     * Check if query requires images
     */
    requiresImage(queryLower) {
        const imageKeywords = [
            'image', 'picture', 'visual', 'show', 'see', 'example', 
            'form', 'template', 'screenshot', 'diagram'
        ];
        
        return imageKeywords.some(keyword => queryLower.includes(keyword));
    }
    
    /**
     * Check if query is procedural
     */
    isProcedural(queryLower) {
        const proceduralKeywords = [
            'how', 'steps', 'process', 'procedure', 'workflow', 
            'guide', 'tutorial', 'instructions'
        ];
        
        return proceduralKeywords.some(keyword => queryLower.includes(keyword));
    }
    
    /**
     * Extract important keywords from query
     */
    extractKeywords(query) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'what', 'when', 'where', 'who', 'why', 'how', 'which'
        ]);
        
        return query.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10); // Top 10 keywords
    }
    
    /**
     * Calculate confidence score for the query parsing
     */
    calculateConfidence(state, orderType, topics) {
        let confidence = 0.5; // Base confidence
        
        if (state) confidence += 0.2;
        if (orderType) confidence += 0.2;
        if (topics && topics.length > 0) confidence += 0.1 * Math.min(topics.length, 3);
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Generate search filters based on enhanced query
     */
    generateSearchFilters(enhancedQuery) {
        const filters = {};
        
        if (enhancedQuery.state) {
            filters.states = [enhancedQuery.state];
        }
        
        if (enhancedQuery.orderType) {
            filters.sections = [enhancedQuery.orderType];
        }
        
        if (enhancedQuery.topics && enhancedQuery.topics.length > 0) {
            filters.topics = enhancedQuery.topics;
        }
        
        if (enhancedQuery.requiresImage) {
            filters.hasImages = true;
        }
        
        return filters;
    }
    
    /**
     * Generate a natural language summary of what was understood
     */
    generateQuerySummary(enhancedQuery) {
        const parts = [];
        
        if (enhancedQuery.state) {
            parts.push(`Looking for ${enhancedQuery.state} state information`);
        }
        
        if (enhancedQuery.orderType) {
            parts.push(`focusing on ${enhancedQuery.orderType.toLowerCase()} orders`);
        }
        
        if (enhancedQuery.topics && enhancedQuery.topics.length > 0) {
            const topicsStr = enhancedQuery.topics.map(t => t.toLowerCase().replace('_', ' ')).join(', ');
            parts.push(`related to ${topicsStr}`);
        }
        
        if (enhancedQuery.requiresImage) {
            parts.push('including visual examples');
        }
        
        if (parts.length === 0) {
            return `Searching for general information about "${enhancedQuery.originalQuery}"`;
        }
        
        return parts.join(', ') + '.';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QueryIntelligence;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.QueryIntelligence = QueryIntelligence;
}