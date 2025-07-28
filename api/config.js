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
        // Build Google Service Account from individual env vars (cleaner approach)
        let googleServiceAccount = null;
        if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
            googleServiceAccount = {
                type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || 'service_account',
                project_id: process.env.GOOGLE_PROJECT_ID,
                private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                private_key: process.env.GOOGLE_PRIVATE_KEY,
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                client_id: process.env.GOOGLE_CLIENT_ID,
                auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
                token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL)}`,
                universe_domain: 'googleapis.com'
            };
            console.log('✅ Built service account from individual env vars');
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
            // Fallback to JSON parsing if individual vars not available
            try {
                const cleanedJson = process.env.GOOGLE_SERVICE_ACCOUNT
                    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
                    .trim();
                googleServiceAccount = JSON.parse(cleanedJson);
                console.log('✅ Parsed service account from JSON');
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