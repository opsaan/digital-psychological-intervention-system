# Deployment Guide

## Quick Start for Local Development

1. **Clone and Install**:
```bash
git clone https://github.com/opsaan/digital-psychological-intervention-system.git
cd digital-psychological-intervention-system
npm install
```

2. **Setup Environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Initialize Database**:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. **Start Application**:
```bash
npm start
```

Application will be available at http://localhost:8080

**Default Credentials:**
- Admin: `admin@example.com` / `Admin123!@#`
- Demo User: `demo@example.com` / `Demo123!@#`
- Admin Panel: http://localhost:8080/admin

## GitHub Pages Demo

A static demonstration of the platform is available at:
https://opsaan.github.io/digital-psychological-intervention-system/

This shows the complete feature set and technical architecture.

## Production Deployment Options

### 1. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### 2. Heroku Deployment

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your-postgres-url
heroku config:set JWT_SECRET=your-jwt-secret

# Deploy
git push heroku main
```

### 3. DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy with automatic scaling

### 4. AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize and deploy
eb init
eb create
eb deploy
```

## Environment Variables

### Required
```
DATABASE_URL="your-database-connection-string"
JWT_SECRET="your-jwt-secret-min-32-chars"
CSRF_SECRET="your-csrf-secret"
NODE_ENV="production"
```

### Optional
```
PORT=8080
CORS_ORIGIN="https://yourdomain.com"
SMTP_HOST="smtp.youremail.com"
SMTP_USER="notifications@yourdomain.com"
SMTP_PASS="your-email-password"
STORAGE_DIR="./storage"
```

## Database Setup

### PostgreSQL (Production)

```bash
# Create database
psql -c "CREATE DATABASE mental_health_db;"

# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/mental_health_db"

# Run migrations
npm run prisma:migrate
npm run prisma:seed
```

### SQLite (Development)

```bash
# Set DATABASE_URL (or leave default)
export DATABASE_URL="file:./dev.db"

# Run migrations
npm run prisma:migrate
npm run prisma:seed
```

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT and CSRF secrets
- [ ] Configure HTTPS in production
- [ ] Set up rate limiting
- [ ] Review CORS settings
- [ ] Enable security headers
- [ ] Configure database connection pooling
- [ ] Set up error monitoring
- [ ] Configure backups

## Performance Optimization

1. **Enable Compression**:
   - Gzip compression enabled in production
   - Static file caching configured

2. **Database Optimization**:
   - Connection pooling
   - Query optimization
   - Index configuration

3. **CDN Configuration**:
   - Static assets via CDN
   - Image optimization

## Monitoring

### Health Checks
```bash
# Application health
curl http://localhost:8080/health

# Database health
curl http://localhost:8080/api/v1/health/db
```

### Logging
- Application logs via Winston
- Error tracking with Sentry (configure SENTRY_DSN)
- Performance monitoring

## Backup Strategy

### Database Backups
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# SQLite backup
cp dev.db backup-$(date +%Y%m%d).db
```

### File Storage Backups
```bash
# Backup uploaded files
tar -czf storage-backup-$(date +%Y%m%d).tar.gz ./storage
```

## Scaling Considerations

1. **Horizontal Scaling**:
   - Load balancer configuration
   - Session store (Redis)
   - Shared file storage

2. **Database Scaling**:
   - Read replicas
   - Connection pooling
   - Query optimization

3. **Caching Strategy**:
   - Redis for session storage
   - Application-level caching
   - CDN for static assets

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   ```bash
   # Check database connectivity
   npm run prisma:studio
   ```

2. **Authentication Problems**:
   - Verify JWT_SECRET is set
   - Check cookie settings
   - Ensure CSRF token configuration

3. **File Upload Issues**:
   - Verify STORAGE_DIR permissions
   - Check disk space
   - Review Multer configuration

4. **Performance Issues**:
   - Monitor database queries
   - Check memory usage
   - Review API response times

### Getting Help

- Check the [GitHub Issues](https://github.com/opsaan/digital-psychological-intervention-system/issues)
- Review the [README](../README.md) for detailed setup instructions
- Consult the [API documentation](./API.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](../LICENSE) for details.
