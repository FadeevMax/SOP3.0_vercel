# GTI SOP Assistant - Web Application 🚀

A modern, AI-powered Standard Operating Procedures Assistant with global settings and automatic document syncing.

## Features

- **🌐 Global Settings**: All users share the same configuration and document data
- **📄 Automatic Google Docs Sync**: Documents are automatically synced from Google Docs
- **🤖 Multi-Model AI Support**: OpenAI GPT-4, GPT-4 Mini, and Google Gemini 2.0 Flash
- **☁️ Cloud Storage**: Settings and documents stored in GitHub for global access
- **📱 Modern UI**: Responsive design with smooth animations
- **🔍 Advanced Search**: Hybrid search with semantic similarity and metadata filtering

## Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FadeevMax/SOP3.0_vercel)

### 2. Environment Variables

Set these in your Vercel dashboard:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT models | Optional |
| `GEMINI_API_KEY` | Google Gemini API key | Optional |
| `GITHUB_TOKEN` | GitHub token for data storage | Yes |

### 3. Configuration

The application automatically loads global settings from GitHub. The default configuration includes:

- **Repository**: `FadeevMax/SOP3.0_vercel`
- **GitHub Token**: Pre-configured
- **Model**: Gemini 2.0 Flash (recommended)
- **Auto-sync**: Enabled

## How It Works

### Global Settings System

- All settings are stored in `config/global-settings.json` in the GitHub repository
- When any user changes settings, they apply to all users
- Local storage is used for caching and performance
- Settings automatically sync between users

### Document Management

1. **Google Docs Sync**: Documents are synced from Google Docs automatically
2. **Processing**: DOCX files are processed into searchable chunks
3. **Cloud Storage**: Processed data is stored in GitHub at `data/semantic_chunks.json`
4. **Global Access**: All users can immediately access the latest document data

### User Experience

- **First Visit**: Application loads global document data automatically
- **Settings Changes**: Changes apply to all users immediately
- **Chat History**: Stored locally for each user
- **Offline Mode**: Cached data works offline

## API Keys

Users can add their own API keys in settings, or the application will use configured defaults:

- **OpenAI**: For GPT-4 and GPT-4 Mini models
- **Gemini**: For Google Gemini 2.0 Flash (recommended for cost/performance)

## Architecture

### Frontend Stack
- **HTML5/CSS3/JavaScript**: Core web technologies
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Icon library
- **No frameworks**: Pure vanilla JavaScript for performance

### Cloud Integration
- **GitHub API**: Settings and document storage
- **Vercel**: Static site hosting
- **OpenAI/Gemini APIs**: AI model integration

### File Structure
```
web_app/
├── index.html              # Main application
├── style.css               # Styles and animations
├── js/
│   ├── app.js              # Main application logic
│   ├── globalConfig.js     # Global settings management
│   ├── settingsManager.js  # Settings UI and logic
│   ├── chatInterface.js    # Chat functionality
│   ├── vectorDatabase.js   # Search and matching
│   ├── documentProcessor.js # Document processing
│   └── githubIntegration.js # GitHub API integration
├── package.json            # Dependencies
├── vercel.json            # Deployment configuration
└── README.md              # This file
```

## Development

### Local Development
```bash
# Clone repository
git clone https://github.com/FadeevMax/SOP3.0_vercel.git
cd SOP3.0_vercel

# Serve locally
npx serve .
# or
python -m http.server 8000
```

### Configuration
The application is configured to work out-of-the-box with:
- Pre-configured GitHub repository
- Sample document data
- Default AI model settings

## Support

- **Issues**: Create issues in the GitHub repository
- **Documentation**: See inline code comments
- **Updates**: Application auto-updates from GitHub

## Security

- API keys are stored securely in Vercel environment variables
- GitHub token has minimal required permissions
- All data is encrypted in transit
- No sensitive data is logged

---

**Ready to use!** The application is configured and ready for deployment to Vercel.