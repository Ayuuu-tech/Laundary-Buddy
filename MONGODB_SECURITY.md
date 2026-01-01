# 🔐 MongoDB Security Best Practices Guide

## Table of Contents
1. [Network Security](#network-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [Encryption](#encryption)
4. [Backup & Recovery](#backup--recovery)
5. [Monitoring & Auditing](#monitoring--auditing)
6. [Production Checklist](#production-checklist)

---

## Network Security

### 1. IP Whitelist Configuration

**⚠️ CRITICAL: Remove 0.0.0.0/0 (allow from anywhere)**

#### Steps to Configure IP Whitelist:

1. Go to MongoDB Atlas: https://cloud.mongodb.com
2. Select your cluster
3. Click "Network Access" in the left sidebar
4. Click "Add IP Address"

**Add these IPs:**

For **Development**:
- Your local IP address
- Your office IP address (if applicable)

For **Production (Render.com)**:
```
Render.com uses dynamic IPs, so you need to:
- Option 1: Add all Render IPs (get from Render dashboard)
- Option 2: Use MongoDB Atlas Private Endpoint (paid feature)
- Option 3: Temporarily allow 0.0.0.0/0 but enable strong authentication
```

For **Production (Vercel)**:
- Vercel uses dynamic IPs
- Use MongoDB Atlas Data API or Private Endpoint
- Or whitelist entire Vercel IP range (not recommended)

For **CI/CD (GitHub Actions)**:
- Add GitHub Actions IP ranges
- Or use self-hosted runners with static IPs

#### Best Practice:
```
✅ DO: Whitelist specific IPs
✅ DO: Use Private Endpoints for production
✅ DO: Regular audit of whitelisted IPs
❌ DON'T: Use 0.0.0.0/0 in production
❌ DON'T: Forget to remove old IPs
```

### 2. VPC Peering (Advanced)

For enterprise-level security, set up VPC peering between your cloud provider and MongoDB Atlas.

---

## Authentication & Authorization

### 1. Database Users

#### Create Separate Users for Different Purposes:

**Application User (Read/Write)**:
```javascript
// MongoDB Atlas UI or MongoDB Shell
db.createUser({
  user: "laundry_app_user",
  pwd: "STRONG_RANDOM_PASSWORD_HERE",
  roles: [
    { role: "readWrite", db: "laundry_buddy" }
  ]
})
```

**Analytics User (Read-Only)**:
```javascript
db.createUser({
  user: "laundry_analytics",
  pwd: "STRONG_RANDOM_PASSWORD_HERE",
  roles: [
    { role: "read", db: "laundry_buddy" }
  ]
})
```

**Backup User**:
```javascript
db.createUser({
  user: "laundry_backup",
  pwd: "STRONG_RANDOM_PASSWORD_HERE",
  roles: [
    { role: "backup", db: "admin" },
    { role: "restore", db: "admin" }
  ]
})
```

### 2. Password Policy

**Requirements:**
- Minimum 32 characters
- Mix of uppercase, lowercase, numbers, symbols
- No dictionary words
- Use password generator:

```bash
# Generate strong password
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Rotate Credentials Regularly

- **Application passwords**: Every 90 days
- **Admin passwords**: Every 30 days
- **After security incidents**: Immediately

---

## Encryption

### 1. Encryption at Rest

**MongoDB Atlas M10+ clusters include encryption at rest by default**

To verify:
1. Go to your cluster
2. Click "Configuration"
3. Look for "Encryption at Rest" - should be enabled

### 2. Encryption in Transit (TLS/SSL)

**Already configured** in your connection string:
```
mongodb+srv://...
```

The `mongodb+srv://` protocol automatically uses TLS.

**To enforce TLS in your application:**

```javascript
// In config/db.js
const options = {
  ssl: true,
  sslValidate: true,
  tlsAllowInvalidCertificates: false, // Don't allow invalid certs
  tlsAllowInvalidHostnames: false     // Don't allow invalid hostnames
};

mongoose.connect(process.env.MONGODB_URI, options);
```

### 3. Field-Level Encryption (Advanced)

For sensitive data like SSN, credit cards:

```javascript
// Not implemented yet, but recommended for PII
const mongoose = require('mongoose');
const { ClientEncryption } = require('mongodb-client-encryption');

// Encrypt specific fields before storing
```

---

## Backup & Recovery

### 1. Enable Continuous Backup

**For M10+ clusters:**

1. Go to MongoDB Atlas Dashboard
2. Select your cluster
3. Click "Backup" tab
4. Enable "Continuous Backup"

**Configuration:**
- **Retention Period**: 7-35 days (recommended: 14 days)
- **Snapshot Frequency**: Every 6-24 hours
- **Point-in-Time Recovery**: Enable (allows restore to any point)

### 2. Test Restore Procedure

**⚠️ CRITICAL: Test backups regularly!**

**Quarterly Backup Test:**
```bash
# 1. Create a test cluster
# 2. Restore backup to test cluster
# 3. Verify data integrity
# 4. Document the process
# 5. Delete test cluster
```

### 3. Manual Backup Strategy

**Weekly Manual Export:**

```bash
# Export entire database
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/laundry_buddy" --out=/backup/$(date +%Y%m%d)

# Compress backup
tar -czf backup_$(date +%Y%m%d).tar.gz /backup/$(date +%Y%m%d)

# Upload to S3/cloud storage
aws s3 cp backup_$(date +%Y%m%d).tar.gz s3://your-bucket/mongodb-backups/
```

**Restore from manual backup:**

```bash
# Extract backup
tar -xzf backup_20260101.tar.gz

# Restore to MongoDB
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/laundry_buddy" /backup/20260101/laundry_buddy
```

### 4. Backup Storage

**Store backups in:**
- ✅ AWS S3 with versioning enabled
- ✅ Google Cloud Storage
- ✅ Azure Blob Storage
- ✅ Multiple regions (geo-redundancy)

**Retention Policy:**
- Daily backups: Keep for 7 days
- Weekly backups: Keep for 4 weeks
- Monthly backups: Keep for 12 months
- Yearly backups: Keep for 7 years (compliance)

---

## Monitoring & Auditing

### 1. Enable Database Auditing

**MongoDB Atlas M10+ clusters:**

1. Go to "Security" → "Advanced Settings"
2. Enable "Database Auditing"
3. Configure audit filter:

```json
{
  "atype": "authCheck",
  "param.command": {
    "$in": ["find", "insert", "update", "delete", "drop"]
  }
}
```

### 2. Monitor Performance Metrics

**Set up alerts for:**
- High CPU usage (> 80%)
- High memory usage (> 90%)
- Slow queries (> 100ms)
- Connection spikes
- Failed authentication attempts

**Atlas UI:**
1. Go to "Alerts" tab
2. Create alerts for:
   - "Connections % of configured limit" > 80%
   - "Opcounter - Query" spike > 200%
   - "Logical Size" growth > 10 GB/day

### 3. Query Performance Monitoring

**Enable slow query logging:**

```javascript
// In your application
mongoose.set('debug', (collectionName, method, query, doc) => {
  const start = Date.now();
  // Log queries that take > 100ms
  if (Date.now() - start > 100) {
    console.warn(`Slow query: ${collectionName}.${method}`, query);
  }
});
```

### 4. Database Activity Monitoring

**Track:**
- Failed login attempts
- Unauthorized access attempts
- Schema changes
- Large deletions
- Unusual query patterns

---

## Production Checklist

### Pre-Deployment

- [ ] Remove 0.0.0.0/0 from IP whitelist
- [ ] Add production server IPs to whitelist
- [ ] Rotate all database passwords
- [ ] Use separate user accounts (not admin)
- [ ] Enable encryption at rest (M10+ clusters)
- [ ] Verify TLS/SSL is enforced
- [ ] Set up continuous backup
- [ ] Configure backup retention (14+ days)
- [ ] Test backup restore procedure
- [ ] Set up backup alerts
- [ ] Enable database auditing
- [ ] Configure performance alerts
- [ ] Set up slow query monitoring
- [ ] Document connection strings (in secure location)
- [ ] Create read-only user for analytics
- [ ] Set up monitoring dashboard
- [ ] Configure email/SMS alerts for critical issues
- [ ] Document disaster recovery procedure

### Post-Deployment

- [ ] Verify application can connect
- [ ] Monitor connection pool metrics
- [ ] Check query performance
- [ ] Review audit logs
- [ ] Verify backups are running
- [ ] Test alert notifications
- [ ] Document any issues
- [ ] Set up regular security reviews (monthly)

### Weekly Maintenance

- [ ] Review slow queries
- [ ] Check disk usage trends
- [ ] Review failed login attempts
- [ ] Verify backup success
- [ ] Check for MongoDB updates/patches
- [ ] Review connection patterns

### Monthly Maintenance

- [ ] Test backup restoration
- [ ] Review and update IP whitelist
- [ ] Audit database users and permissions
- [ ] Review schema changes
- [ ] Check for unused indexes
- [ ] Optimize slow queries
- [ ] Review security logs
- [ ] Update documentation

### Quarterly Maintenance

- [ ] Full security audit
- [ ] Rotate database passwords
- [ ] Review and update backup strategy
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Review MongoDB version (consider upgrades)
- [ ] Review cloud provider security bulletins

---

## Emergency Procedures

### 1. Suspected Data Breach

```
1. IMMEDIATELY rotate all database passwords
2. Review audit logs for unauthorized access
3. Check IP whitelist for unknown entries
4. Review recent schema/data changes
5. Notify security team
6. Consider taking snapshot before investigation
7. Document all findings
```

### 2. Database Performance Issues

```
1. Check MongoDB Atlas metrics dashboard
2. Review slow query logs
3. Check connection pool status
4. Verify indexes are being used
5. Check for long-running queries
6. Consider adding indexes
7. Scale cluster if needed (vertical/horizontal)
```

### 3. Database Connection Failures

```
1. Verify network connectivity
2. Check IP whitelist
3. Verify credentials are correct
4. Check MongoDB Atlas status page
5. Review connection string format
6. Check connection pool limits
7. Review application logs
```

### 4. Data Loss

```
1. Don't panic!
2. Stop all write operations
3. Identify what data was lost
4. Check point-in-time recovery options
5. Restore from most recent backup
6. Verify restored data
7. Document incident
8. Review backup procedures
```

---

## Connection String Security

### ❌ BAD: Hardcoded credentials

```javascript
const uri = 'mongodb+srv://myuser:mypassword@cluster.mongodb.net/mydb';
```

### ✅ GOOD: Environment variables

```javascript
const uri = process.env.MONGODB_URI;

// With additional options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

### Connection String Format

```
mongodb+srv://[username]:[password]@[cluster].[region].mongodb.net/[database]?retryWrites=true&w=majority&appName=[appname]
```

**Best Practices:**
- Store in environment variables
- Never commit to Git
- Use different credentials per environment
- Include database name in connection string
- Enable retryWrites
- Set write concern (w=majority)

---

## Resources

- MongoDB Security Checklist: https://docs.mongodb.com/manual/security/
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
- OWASP Database Security: https://owasp.org/www-community/Database_Security
- MongoDB University (Free courses): https://university.mongodb.com/

---

## Contact

For database security issues or questions:
- Email: devops@yourdomain.com
- Slack: #database-security

**For security vulnerabilities:** security@yourdomain.com
