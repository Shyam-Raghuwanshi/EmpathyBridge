# Production Deployment Guide

## Prerequisites
- Node.js 18+ installed
- PM2 for process management
- Nginx for reverse proxy
- SSL certificate for HTTPS

## Environment Setup

### 1. Install PM2
```bash
npm install -g pm2
```

### 2. Create Production Environment File
```bash
cp .env .env.production
```

Update `.env.production` with production values:
```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Build Application
```bash
npm run build
```

### 4. PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'empathy-bridge',
    script: './dist/server/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 5. Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Deployment Steps

### 1. Deploy to Server
```bash
# Upload files to server
rsync -avz --exclude node_modules . user@server:/path/to/app/

# Install dependencies
ssh user@server "cd /path/to/app && npm ci --only=production"

# Build application
ssh user@server "cd /path/to/app && npm run build"
```

### 2. Start with PM2
```bash
ssh user@server "cd /path/to/app && pm2 start ecosystem.config.js"
```

### 3. Configure PM2 Startup
```bash
ssh user@server "pm2 startup && pm2 save"
```

## Monitoring & Maintenance

### PM2 Commands
```bash
# View status
pm2 status

# View logs
pm2 logs empathy-bridge

# Restart application
pm2 restart empathy-bridge

# Stop application
pm2 stop empathy-bridge

# Monitor resources
pm2 monit
```

### Health Checks
The application provides a health endpoint at `/health` for monitoring.

### Log Management
Logs are stored in the `./logs` directory:
- `err.log` - Error logs
- `out.log` - Standard output
- `combined.log` - Combined logs

## Security Considerations

### 1. Environment Variables
- Store sensitive data in environment variables
- Use a secrets management system
- Rotate API keys regularly

### 2. HTTPS Only
- Enforce HTTPS for all traffic
- Use secure cookies
- Implement HSTS headers

### 3. Rate Limiting
Consider implementing rate limiting for API endpoints:
```bash
npm install express-rate-limit
```

### 4. Firewall Configuration
- Allow only necessary ports (80, 443, 22)
- Block direct access to application port
- Use fail2ban for SSH protection

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Configure session affinity for Socket.IO
- Implement Redis for session storage

### Database Integration
When adding a database:
- Use connection pooling
- Implement proper indexing
- Set up backup strategies

### CDN Configuration
For static assets:
- Configure CDN for public folder
- Set appropriate cache headers
- Optimize images and assets

## Backup Strategy

### Application Backup
```bash
# Create backup
tar -czf empathy-bridge-$(date +%Y%m%d).tar.gz /path/to/app

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/empathy-bridge"
APP_DIR="/path/to/app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/empathy-bridge_$DATE.tar.gz $APP_DIR

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Environment Backup
- Backup `.env.production`
- Document API keys securely
- Store SSL certificates safely

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **Permission Errors**
   ```bash
   chown -R node:node /path/to/app
   chmod +x /path/to/app/dist/server/server.js
   ```

3. **Socket.IO Connection Issues**
   - Check firewall settings
   - Verify proxy configuration
   - Test WebSocket support

### Performance Monitoring
- Use PM2 monitoring
- Implement application metrics
- Monitor server resources
- Set up alerting

This deployment guide ensures a robust, secure, and scalable production environment for EmpathyBridge.
