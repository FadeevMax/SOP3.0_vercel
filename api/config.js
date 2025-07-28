// Vercel serverless function to provide configuration
export default function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        // Parse Google Service Account JSON safely
        let googleServiceAccount = null;
        if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            try {
                // Clean up potential control characters and whitespace issues
                const cleanedJson = process.env.GOOGLE_SERVICE_ACCOUNT
                    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                    .trim();
                googleServiceAccount = JSON.parse(cleanedJson);
            } catch (parseError) {
                console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT:', parseError.message);
                googleServiceAccount = null;
            }
        }
        
        // Return configuration with API keys for client use
        const config = {
            apiKeys: {
                openai: process.env.OPENAI_API_KEY || '',
                gemini: process.env.GEMINI_API_KEY || '',
                githubToken: process.env.GITHUB_TOKEN || ''
            },
            googleServiceAccount: googleServiceAccount,
            github: {
                repo: 'FadeevMax/SOP3.0_vercel'
            },
            googleDocs: {
                docId: '1BXxlyLsOL6hsVWLXB84p35yRg9yr7AL9fzz4yjVQJgA',
                docName: 'GTI Data Base and SOP'
            },
            app: {
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'production'
            }
        };
        
        // Set no-cache headers
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.status(200).json(config);
    } catch (error) {
        console.error('Config API error:', error);
        res.status(500).json({ 
            error: 'Failed to load configuration',
            details: error.message 
        });
    }
}