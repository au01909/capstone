# 🧠 Dementia Care Conversational Summary System

A comprehensive web application that helps dementia care clients view and be reminded of their daily conversations through AI-powered summarization and person identification.

## 🎯 Features

- **AI-Powered Conversation Analysis**: Automatic transcription, summarization, and person identification
- **Smart Notifications**: Configurable reminders (hourly, daily, weekly)
- **Role-Based Access**: Separate dashboards for clients and administrators
- **Accessibility-First Design**: Large fonts, high contrast, voice navigation
- **Secure & Private**: End-to-end encryption and GDPR compliance

## 🏗️ Architecture

### Cloud Version (Original)
- **Frontend**: Next.js with TailwindCSS
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **AI Modules**: OpenAI Whisper, GPT-4, Face Recognition
- **Authentication**: JWT-based with role management

### Offline Version (New)
- **Frontend**: Next.js with TailwindCSS
- **Backend**: Node.js with Express
- **Database**: MongoDB (for user auth only)
- **AI Modules**: Local Whisper.js, Ollama LLM, Local Storage
- **Authentication**: JWT-based with role management
- **Storage**: Local file system with automatic cleanup

## 🚀 Quick Start

### Cloud Version (Original)

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Set Environment Variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your OpenAI API keys
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Offline Version (New)

1. **Install Ollama**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama pull llama3.1:8b
   ```

2. **Install Dependencies**
   ```bash
   npm run install-all
   ```

3. **Set Offline Environment**
   ```bash
   cp server/env.offline.example server/.env
   # Edit server/.env with your configuration
   ```

4. **Start Services**
   ```bash
   # Terminal 1: Start Ollama
   ollama serve
   
   # Terminal 2: Start Backend
   cd server && npm run dev
   
   # Terminal 3: Start Frontend
   cd client && npm run dev
   ```

5. **Test Offline Setup**
   ```bash
   node test-offline.js
   ```

6. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Offline API: http://localhost:5000/api/offline

📖 **Detailed offline setup guide**: [OFFLINE_SETUP.md](./OFFLINE_SETUP.md)

## 📁 Project Structure

```
capstone/
├── client/                 # Next.js frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Application pages
│   ├── styles/            # Global styles
│   └── utils/             # Helper functions
├── server/                # Node.js backend
│   ├── controllers/       # Route handlers
│   ├── models/           # Database models
│   ├── middleware/       # Authentication & validation
│   ├── services/         # Business logic
│   └── utils/            # Server utilities
└── docs/                 # Documentation
```

## 🔧 Configuration

### Environment Variables

Create `server/.env` with:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/dementia-care

# JWT
JWT_SECRET=your-super-secret-jwt-key

# AI Services
OPENAI_API_KEY=your-openai-api-key

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50MB
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 📦 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker-compose up -d
```

## 🔒 Security & Privacy

- All audio data is encrypted at rest
- JWT tokens for secure authentication
- Role-based access control
- GDPR compliant data handling
- No data sharing without explicit consent

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.
