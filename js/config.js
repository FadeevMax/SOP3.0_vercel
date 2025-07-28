/**
 * Configuration Loader - Handles environment variables and configuration
 */

class Config {
    constructor() {
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        // In a browser environment, we can't directly access environment variables
        // Instead, we'll use a configuration that can be set during build/deployment
        
        // These would be injected during build process or loaded from a config endpoint
        const config = {
            // Default values - will be overridden by environment variables in Vercel
            GITHUB_TOKEN: '',
            OPENAI_API_KEY: '',
            GEMINI_API_KEY: '',
            GITHUB_REPO: 'FadeevMax/SOP3.0_vercel',
            
            // These can be set via build-time injection or runtime configuration
            ...window.ENV_CONFIG || {}
        };
        
        return config;
    }
    
    get(key) {
        return this.config[key] || '';
    }
    
    // Helper methods for common config values
    getGitHubToken() {
        return this.get('GITHUB_TOKEN');
    }
    
    getOpenAIKey() {
        return this.get('OPENAI_API_KEY');
    }
    
    getGeminiKey() {
        return this.get('GEMINI_API_KEY');
    }
    
    getGitHubRepo() {
        return this.get('GITHUB_REPO');
    }
}

// Create global config instance
window.appConfig = new Config();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}