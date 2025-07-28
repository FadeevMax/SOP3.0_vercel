/**
 * Document Processor - Handles DOCX file processing and chunking
 * Ported from the Python docx_chunking.py functionality
 */

class DocumentProcessor {
    constructor(app) {
        this.app = app;
        this.chunkSize = 800;
        this.maxChunkSize = 1200;
        this.overlapSize = 150;
    }
    
    async processDocument(file) {
        try {
            console.log('Processing document:', file.name);
            
            // Read the file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            
            // For now, we'll simulate the DOCX processing since we can't directly parse DOCX in browser
            // In a real implementation, you'd use a library like docx-preview or send to backend
            const result = await this.simulateDocxProcessing(arrayBuffer, file.name);
            
            return {
                success: true,
                chunks: result.chunks,
                images: result.images,
                vectorDb: result.vectorDb
            };
        } catch (error) {
            console.error('Document processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async simulateDocxProcessing(arrayBuffer, filename) {
        // For demo purposes, we'll create sample chunks based on the existing structure
        // In production, this would parse the actual DOCX file
        
        const sampleChunks = this.createSampleChunks();
        const sampleImages = this.createSampleImages();
        
        // Save processed data to localStorage
        localStorage.setItem('gti_processed_chunks', JSON.stringify(sampleChunks));
        localStorage.setItem('gti_processed_images', JSON.stringify(sampleImages));
        
        return {
            chunks: sampleChunks,
            images: sampleImages,
            vectorDb: null // Will be built by VectorDatabase class
        };
    }
    
    createSampleChunks() {
        // Sample chunks based on the GTI SOP structure
        return [
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
            },
            {
                chunk_id: 5,
                text: "New York (NY) Regular Orders: NY regular orders follow standard wholesale pricing. Delivery dates should be set based on the customer's requested schedule. No special batch substitution rules apply.",
                images: [],
                metadata: {
                    states: ["NY"],
                    sections: ["REGULAR"],
                    topics: ["PRICING", "DELIVERY_DATE"],
                    has_images: false,
                    image_count: 0,
                    word_count: 26
                }
            },
            {
                chunk_id: 6,
                text: "Nevada (NV) RISE Pricing: Nevada RISE orders must follow LT pricing structure. Menu prices do not apply for NV RISE orders. Battery products must be invoiced separately as per state requirements.",
                images: [
                    {
                        filename: "image_5.png",
                        label: "Image 5: Nevada RISE pricing structure",
                        path: "/images/image_5.png"
                    ]
                ],
                metadata: {
                    states: ["NV"],
                    sections: ["RISE"],
                    topics: ["PRICING", "BATTERIES"],
                    has_images: true,
                    image_count: 1,
                    word_count: 28
                }
            },
            {
                chunk_id: 7,
                text: "Massachusetts (MA) Order Processing: MA orders require standard processing procedures. Both RISE and regular orders follow the same basic workflow. No state-specific exceptions apply for Massachusetts.",
                images: [],
                metadata: {
                    states: ["MA"],
                    sections: ["REGULAR", "RISE"],
                    topics: [],
                    has_images: false,
                    image_count: 0,
                    word_count: 25
                }
            }
        ];
    }
    
    createSampleImages() {
        return [
            {
                filename: "image_1.png",
                label: "Image 1: Ohio RISE order form example",
                path: "/images/image_1.png",
                data: null // In real implementation, would contain image data
            },
            {
                filename: "image_2.png",
                label: "Image 2: Maryland regular order invoice format",
                path: "/images/image_2.png",
                data: null
            },
            {
                filename: "image_3.png",
                label: "Image 3: Illinois RISE order splitting example",
                path: "/images/image_3.png",
                data: null
            },
            {
                filename: "image_4.png",
                label: "Image 4: Separate battery invoice example",
                path: "/images/image_4.png",
                data: null
            },
            {
                filename: "image_5.png",
                label: "Image 5: Nevada RISE pricing structure",
                path: "/images/image_5.png",
                data: null
            }
        ];
    }
    
    // Method to process Google Docs content
    async processGoogleDocsContent(content) {
        try {
            // This would integrate with Google Docs API
            // For now, return the same sample data
            return this.createSampleChunks();
        } catch (error) {
            console.error('Google Docs processing error:', error);
            throw error;
        }
    }
    
    // Text cleaning utilities (ported from Python)
    cleanText(text) {
        // Normalize unicode characters
        let cleaned = text.normalize('NFKC');
        
        // Replace common unicode characters
        cleaned = cleaned.replace(/[""]/g, '"');
        cleaned = cleaned.replace(/['']/g, "'");
        cleaned = cleaned.replace(/[–—]/g, '-');
        
        // Clean up whitespace
        cleaned = cleaned.replace(/\\s+/g, ' ').trim();
        
        // Remove excessive punctuation
        cleaned = cleaned.replace(/\\.{2,}/g, '.');
        
        return cleaned;
    }
    
    // Extract state information from text
    extractStateInfo(text) {
        const statePatterns = {
            'OH': [/\\bohio\\b/i, /\\boh\\b/i],
            'MD': [/\\bmaryland\\b/i, /\\bmd\\b/i],
            'NJ': [/\\bnew\\s+jersey\\b/i, /\\bnj\\b/i],
            'IL': [/\\billinois\\b/i, /\\bil\\b/i],
            'NY': [/\\bnew\\s+york\\b/i, /\\bny\\b/i],
            'NV': [/\\bnevada\\b/i, /\\bnv\\b/i],
            'MA': [/\\bmassachusetts\\b/i, /\\bma\\b/i]
        };
        
        const detectedStates = [];
        for (const [state, patterns] of Object.entries(statePatterns)) {
            if (patterns.some(pattern => pattern.test(text))) {
                detectedStates.push(state);
            }
        }
        
        return detectedStates;
    }
    
    // Extract order type information
    extractOrderType(text) {
        const textLower = text.toLowerCase();
        
        if (textLower.includes('rise') || textLower.includes('internal')) {
            return ['RISE'];
        }
        
        if (textLower.includes('regular') || textLower.includes('wholesale')) {
            return ['REGULAR'];
        }
        
        return [];
    }
    
    // Extract topic information
    extractTopics(text) {
        const textLower = text.toLowerCase();
        const topics = [];
        
        const topicPatterns = {
            'PRICING': ['price', 'pricing', 'cost', 'discount', 'menu'],
            'BATTERIES': ['battery', 'batteries', 'separate', 'invoice'],
            'BATCH_SUB': ['batch', 'sub', 'substitution', 'fifo'],
            'DELIVERY_DATE': ['delivery', 'date', 'schedule'],
            'ORDER_LIMIT': ['limit', 'maximum', 'max', 'unit']
        };
        
        for (const [topic, keywords] of Object.entries(topicPatterns)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                topics.push(topic);
            }
        }
        
        return topics;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentProcessor;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.DocumentProcessor = DocumentProcessor;
}