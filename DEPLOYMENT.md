# 🚀 Deployment Guide

This guide covers deploying the Dementia Care Summary System to production.

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 7.0+
- OpenAI API key
- SMTP credentials for email notifications
- Domain name and SSL certificate (for production)

## 🔧 Environment Setup

### 1. Backend Environment Variables

Create `server/.env` with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/dementia-care
DB_NAME=dementia-care

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=production

# AI Services
OPENAI_API_KEY=your-openai-api-key-here
WHISPER_MODEL=whisper-1

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@dementiacare.com

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800
ALLOWED_AUDIO_TYPES=audio/mpeg,audio/wav,audio/mp4,audio/ogg

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Frontend URL
CLIENT_URL=https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 2. Frontend Environment Variables

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## 🐳 Docker Deployment (Recommended)

### 1. Build and Start Services

```bash
# Clone the repository
git clone <repository-url>
cd dementia-care-summary

# Copy environment files
cp server/env.example server/.env
cp client/.env.example client/.env.local

# Edit environment variables
nano server/.env
nano client/.env.local

# Start services
docker-compose up -d
```

### 2. Verify Deployment

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Test endpoints
curl http://localhost:5000/health
curl http://localhost:3000
```

## 🖥️ Manual Deployment

### 1. Backend Deployment

```bash
# Install dependencies
cd server
npm install

# Start the server
npm start
```

### 2. Frontend Deployment

```bash
# Install dependencies
cd client
npm install

# Build for production
npm run build

# Start the application
npm start
```

## ☁️ Cloud Deployment Options

### AWS Deployment

1. **EC2 Instance Setup**
   ```bash
   # Launch EC2 instance (Ubuntu 20.04 LTS)
   # Install Docker and Docker Compose
   sudo apt update
   sudo apt install docker.io docker-compose
   sudo usermod -aG docker $USER
   ```

2. **RDS MongoDB Setup**
   - Create MongoDB Atlas cluster
   - Update MONGODB_URI in environment variables

3. **S3 for File Storage**
   - Create S3 bucket for audio files
   - Configure AWS SDK in backend

### Google Cloud Platform

1. **Cloud Run Deployment**
   ```bash
   # Build and push images
   gcloud builds submit --tag gcr.io/PROJECT_ID/dementia-care-backend
   gcloud builds submit --tag gcr.io/PROJECT_ID/dementia-care-frontend
   
   # Deploy to Cloud Run
   gcloud run deploy dementia-care-backend --image gcr.io/PROJECT_ID/dementia-care-backend
   gcloud run deploy dementia-care-frontend --image gcr.io/PROJECT_ID/dementia-care-frontend
   ```

### Vercel Deployment (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd client
vercel --prod
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Firewall Configuration

```bash
# UFW firewall rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Database Security

- Enable MongoDB authentication
- Use strong passwords
- Restrict network access
- Enable SSL/TLS for database connections

## 📊 Monitoring and Logging

### 1. Application Monitoring

```bash
# Install PM2 for process management
npm install -g pm2

# Start application with PM2
pm2 start server/index.js --name "dementia-care-api"
pm2 start client/server.js --name "dementia-care-frontend"

# Setup monitoring
pm2 install pm2-logrotate
pm2 startup
pm2 save
```

### 2. Log Management

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/dementia-care

# Log rotation configuration
/var/log/dementia-care/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

### 3. Health Checks

```bash
# Create health check script
cat > healthcheck.sh << 'EOF'
#!/bin/bash
curl -f http://localhost:5000/health || exit 1
curl -f http://localhost:3000 || exit 1
EOF

chmod +x healthcheck.sh

# Add to crontab
echo "*/5 * * * * /path/to/healthcheck.sh" | crontab -
```

## 🔄 Backup and Recovery

### 1. Database Backup

```bash
# MongoDB backup script
cat > backup-mongodb.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://admin:password@localhost:27017/dementia-care" --out="/backups/mongodb_$DATE"
tar -czf "/backups/mongodb_$DATE.tar.gz" "/backups/mongodb_$DATE"
rm -rf "/backups/mongodb_$DATE"
EOF

chmod +x backup-mongodb.sh

# Schedule daily backups
echo "0 2 * * * /path/to/backup-mongodb.sh" | crontab -
```

### 2. File Backup

```bash
# Audio files backup
rsync -av /path/to/uploads/ /backup/uploads/
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :5000
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   ```

2. **MongoDB Connection Issues**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Restart MongoDB
   sudo systemctl restart mongod
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   free -h
   
   # Increase swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Performance Optimization

1. **Enable Gzip Compression**
2. **Setup CDN for static assets**
3. **Implement Redis caching**
4. **Optimize database queries**
5. **Use connection pooling**

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer Setup**
2. **Multiple Backend Instances**
3. **Database Replication**
4. **File Storage Distribution**

### Vertical Scaling

1. **Increase Server Resources**
2. **Optimize Application Code**
3. **Database Indexing**
4. **Caching Strategies**

## 🔐 Security Checklist

- [ ] SSL/TLS certificates installed
- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting setup
- [ ] Access logs reviewed
- [ ] Penetration testing completed
- [ ] GDPR compliance verified

## 📞 Support

For deployment support:
- Check logs: `docker-compose logs -f`
- Review documentation
- Contact development team
- Create issue in repository
