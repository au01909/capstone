# Offline Setup Guide for Dementia Care Application

This guide explains how to set up and run the dementia care application completely offline, without any cloud dependencies.

## Overview

The offline version replaces:
- **OpenAI Whisper API** → **Local Whisper.js model** for speech-to-text
- **OpenAI GPT-4** → **Local Ollama LLM** for text summarization
- **Cloud storage** → **Local file system** for conversation storage
- **Cloud processing** → **Local processing** with automatic cleanup

## Prerequisites

### 1. System Requirements
- **Node.js** 18+ 
- **Python** 3.8+ (for Ollama)
- **Git** (for installation)
- **8GB+ RAM** (for running local AI models)
- **10GB+ free disk space** (for models and storage)

### 2. Install Ollama (Local LLM)

#### macOS/Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows:
Download from [ollama.ai](https://ollama.ai/download)

### 3. Download Required Models

```bash
# Download a lightweight LLM model (recommended for local use)
ollama pull llama3.1:8b

# Alternative: Download smaller model for lower-end systems
ollama pull llama3.1:3b
```

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
# Copy the offline environment template
cd server
cp env.offline.example .env
```

Edit `.env` file with your configuration:

```env
# Database (still needed for user auth)
MONGODB_URI=mongodb://localhost:27017/dementia-care

# JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Cleanup Configuration
CLEANUP_INTERVAL=0 0 1 * *  # First day of every month
RETENTION_MONTHS=1           # Keep recordings for 1 month

# File Upload
MAX_FILE_SIZE=52428800       # 50MB
```

### 3. Start Services

#### Terminal 1 - Start Ollama:
```bash
ollama serve
```

#### Terminal 2 - Start Database:
```bash
# Install and start MongoDB (if not already running)
# macOS with Homebrew:
brew services start mongodb-community

# Ubuntu/Debian:
sudo systemctl start mongod

# Windows:
net start MongoDB
```

#### Terminal 3 - Start Backend:
```bash
cd server
npm run dev
```

#### Terminal 4 - Start Frontend:
```bash
cd client
npm run dev
```

## Usage

### 1. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Ollama**: http://localhost:11434

### 2. Offline Features

#### Upload Conversations
- Use the `/api/offline/conversations/upload` endpoint
- Audio files are processed locally using Whisper.js
- Summaries are generated using your local Ollama model
- All data is stored locally in `./local-storage/`

#### View Conversations
- Access via `/api/offline/conversations/{userId}`
- Conversations are organized by person name
- Full transcript and AI-generated summaries available

#### Storage Management
- Automatic monthly cleanup of old recordings
- Manual cleanup available via API
- Storage statistics and monitoring

### 3. API Endpoints

#### Upload Conversation
```bash
POST /api/offline/conversations/upload
Content-Type: multipart/form-data

# Form data:
# - audio: audio file
# - personName: string
# - notes: string (optional)
```

#### Get Conversations
```bash
GET /api/offline/conversations/{userId}?page=1&limit=20&personName=John
```

#### Get Storage Stats
```bash
GET /api/offline/conversations/{userId}/storage-stats
```

#### Manual Cleanup
```bash
POST /api/offline/conversations/{userId}/cleanup
{
  "monthsOld": 1
}
```

## Storage Structure

```
local-storage/
├── conversations/
│   └── {userId}/
│       └── {personName}/
│           ├── conv_1234567890_abc123.json
│           ├── conv_1234567891_def456.json
│           └── ...
└── audio/
    └── {userId}/
        ├── conversation_1234567890_abc123.mp3
        ├── conversation_1234567891_def456.wav
        └── ...
```

## Configuration Options

### Model Selection

#### For High-End Systems (16GB+ RAM):
```env
OLLAMA_MODEL=llama3.1:8b
```

#### For Mid-Range Systems (8GB RAM):
```env
OLLAMA_MODEL=llama3.1:3b
```

#### For Low-End Systems (4GB RAM):
```env
OLLAMA_MODEL=tinyllama:1.1b
```

### Cleanup Schedule

#### Monthly (default):
```env
CLEANUP_INTERVAL=0 0 1 * *
RETENTION_MONTHS=1
```

#### Weekly:
```env
CLEANUP_INTERVAL=0 0 * * 0
RETENTION_MONTHS=0.25
```

#### Daily:
```env
CLEANUP_INTERVAL=0 0 * * *
RETENTION_MONTHS=0.033
```

## Troubleshooting

### 1. Ollama Not Responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### 2. Model Not Found
```bash
# List available models
ollama list

# Pull required model
ollama pull llama3.1:8b
```

### 3. Memory Issues
- Use a smaller model (3b instead of 8b)
- Close other applications
- Increase system swap space

### 4. Storage Issues
```bash
# Check storage usage
du -sh local-storage/

# Manual cleanup
curl -X POST http://localhost:5000/api/offline/conversations/{userId}/cleanup \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"monthsOld": 1}'
```

## Performance Optimization

### 1. Model Caching
- Ollama automatically caches models in memory
- First request may be slower as model loads
- Subsequent requests are faster

### 2. Audio Processing
- Use compressed audio formats (MP3) for faster processing
- Limit audio file size to 50MB
- Process files in background

### 3. Storage Optimization
- Regular cleanup prevents disk space issues
- Compress old conversations if needed
- Monitor storage usage

## Security Considerations

### 1. Data Privacy
- All data stays on your local machine
- No cloud dependencies
- Full control over data retention

### 2. Access Control
- JWT-based authentication still required
- Users can only access their own data
- Admin can access all data for management

### 3. File Permissions
```bash
# Secure storage directories
chmod 700 local-storage/
chmod 600 local-storage/conversations/
chmod 600 local-storage/audio/
```

## Migration from Cloud Version

### 1. Export Existing Data
```bash
# Export conversations from cloud version
curl -X GET http://your-cloud-api/conversations/export \
  -H "Authorization: Bearer {token}"
```

### 2. Import to Offline Version
```bash
# Import conversations to offline version
curl -X POST http://localhost:5000/api/offline/conversations/import \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d @exported-conversations.json
```

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Check application health
curl http://localhost:5000/health

# Check Ollama status
curl http://localhost:11434/api/tags
```

### 2. Logs
```bash
# View application logs
tail -f server/logs/combined.log

# View error logs
tail -f server/logs/error.log
```

### 3. Backup
```bash
# Backup local storage
tar -czf backup-$(date +%Y%m%d).tar.gz local-storage/

# Backup database
mongodump --db dementia-care --out backup-db-$(date +%Y%m%d)
```

## Support

For issues with the offline setup:
1. Check the logs in `server/logs/`
2. Verify all services are running
3. Ensure sufficient system resources
4. Check network connectivity (for initial model downloads only)

The offline version provides complete privacy and control over your dementia care data while maintaining all the functionality of the cloud version.
