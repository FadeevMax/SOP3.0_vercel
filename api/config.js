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
    
    // Return configuration (only non-sensitive parts)
    const config = {
        GITHUB_REPO: process.env.GITHUB_REPO || 'FadeevMax/SOP3.0_vercel',
        
        // Don't expose API keys directly - they'll be handled client-side
        // These are just flags to indicate if keys are configured
        HAS_OPENAI_KEY: !!process.env.OPENAI_API_KEY,
        HAS_GEMINI_KEY: !!process.env.GEMINI_API_KEY,
        HAS_GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
        
        // App configuration
        APP_VERSION: '1.0.0',
        ENVIRONMENT: process.env.NODE_ENV || 'production'
    };
    
    res.status(200).json(config);
}