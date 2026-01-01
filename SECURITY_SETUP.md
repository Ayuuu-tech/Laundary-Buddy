# 🔒 Security Setup Guide

## Critical: Credential Rotation Required

**⚠️ IMPORTANT:** The following credentials were exposed in the Git repository and MUST be rotated before production deployment:

### 1. MongoDB Database Password
- **Current exposed connection**: `mongodb+srv://ayushmaanyadav24cse_db_user:f9UgWkYHPDE8ae1x@...`
- **Action Required**:
  1. Go to MongoDB Atlas: https://cloud.mongodb.com
  2. Navigate to Database Access
  3. Delete or change password for user `ayushmaanyadav24cse_db_user`
  4. Create a new database user with a strong password
  5. Update `MONGODB_URI` in your deployment platform's environment variables

### 2. JWT Secret
- **Current exposed value**: `your_jwt_secret_key_change_this_in_production`
- **Action Required**: Generate a new secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Session Secret
- **Current exposed value**: `laundry-buddy-secret-key-change-in-production`
- **Action Required**: Generate a new secret (same command as JWT)

### 4. Resend API Key
- **Current exposed key**: `re_Vzvfzggb_8BXopE7fHdYBt9F6Y5GFFveF`
- **Action Required**:
  1. Go to Resend dashboard: https://resend.com/api-keys
  2. Delete the exposed API key
  3. Generate a new API key
  4. Update `RESEND_API_KEY` in your deployment environment

### 5. Laundry API Key
- **Current exposed key**: `laundrybuddy_secret_2026`
- **Action Required**: Generate a new secure key

---

## Removing .env from Git History

The `.env` file is already in `.gitignore`, but historical commits still contain sensitive data. To remove it completely:

### Option 1: BFG Repo-Cleaner (Recommended - Fastest)
```bash
# Install BFG
# Download from: https://rpo.github.io/bfg-repo-cleaner/

# Backup your repo first
cd ..
cp -r Laundary-Buddy Laundary-Buddy-backup

# Clean the repo
java -jar bfg.jar --delete-files .env Laundary-Buddy/.git
cd Laundary-Buddy
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 2: git filter-branch
```bash
# Backup your repo first
cd ..
cp -r Laundary-Buddy Laundary-Buddy-backup
cd Laundary-Buddy

# Remove .env from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 3: git filter-repo (Modern Approach)
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove .env
git filter-repo --path backend/.env --invert-paths --force
```

### After Cleaning
```bash
# Force push to remote (⚠️ Warning: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

⚠️ **Important**: After rewriting Git history, all collaborators must re-clone the repository!

---

## Deployment Checklist

### Before Deploying to Production:

- [ ] Rotate all exposed credentials (MongoDB, API keys, secrets)
- [ ] Set all environment variables in deployment platform (Render, Vercel, etc.)
- [ ] Remove `.env` from Git history
- [ ] Verify `.env` is in `.gitignore`
- [ ] Enable MongoDB IP whitelist (only allow deployment platform IPs)
- [ ] Enable MongoDB encryption at rest
- [ ] Set up automated MongoDB backups
- [ ] Configure HTTPS/SSL certificate
- [ ] Update CORS allowed origins for production domain
- [ ] Set `NODE_ENV=production`
- [ ] Set `SESSION_COOKIE_SECURE=true` (requires HTTPS)
- [ ] Enable rate limiting with appropriate limits
- [ ] Set up error monitoring (Sentry)
- [ ] Set up uptime monitoring
- [ ] Review and test all security headers
- [ ] Implement account lockout mechanism
- [ ] Test password reset rate limiting
- [ ] Add security logging for failed login attempts
- [ ] Create Privacy Policy
- [ ] Create Terms of Service
- [ ] Implement data export functionality (GDPR compliance)

---

## MongoDB Atlas Security Configuration

1. **Network Access**:
   - Go to Network Access in MongoDB Atlas
   - Remove `0.0.0.0/0` (allow from anywhere)
   - Add specific IP addresses:
     - Your deployment platform IPs
     - Your office/development IPs
     - CI/CD pipeline IPs

2. **Database Users**:
   - Create separate users for different environments
   - Use strong, randomly generated passwords
   - Assign minimum required privileges (least privilege principle)
   - Create read-only user for analytics/reporting

3. **Enable Encryption**:
   - Encryption at rest should be enabled by default on M10+ clusters
   - Verify in Cluster Settings → Advanced Configuration

4. **Backup Configuration**:
   - Enable Continuous Backup (Point-in-Time Recovery)
   - Set backup retention period (7-35 days recommended)
   - Test restore procedure regularly

---

## Environment Variables on Deployment Platforms

### Render.com
1. Go to your service dashboard
2. Navigate to Environment tab
3. Add each variable from `.env.example`
4. Click "Save Changes"
5. Service will automatically redeploy

### Vercel
```bash
# Using Vercel CLI
vercel env add JWT_SECRET production
vercel env add MONGODB_URI production
# ... add all variables
```

### Netlify
1. Site settings → Build & deploy → Environment
2. Add each variable
3. Redeploy site

---

## Generating Strong Secrets

### Node.js
```javascript
// Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// Generate API Key
node -e "console.log('LB_' + require('crypto').randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, ''))"
```

### OpenSSL
```bash
# Generate 64-byte secret
openssl rand -hex 64

# Generate base64 secret
openssl rand -base64 48
```

---

## Security Monitoring

### Setup Error Tracking (Sentry)
1. Sign up at https://sentry.io
2. Create a new project
3. Get your DSN
4. Add to environment: `SENTRY_DSN=https://...`
5. Integrate in server.js (already configured in code)

### Setup Uptime Monitoring
Recommended services:
- UptimeRobot (free tier available)
- Pingdom
- Better Uptime
- Status Cake

---

## Regular Security Maintenance

### Weekly:
- Review error logs for suspicious activity
- Check failed login attempts

### Monthly:
- Review and update dependencies: `npm audit`
- Review access logs
- Test backup restoration
- Review database access logs

### Quarterly:
- Rotate JWT and Session secrets
- Review and update security policies
- Penetration testing
- Review user permissions and access

### Annually:
- Full security audit
- Review and update Privacy Policy/ToS
- Rotate all API keys and credentials
- Update SSL certificates (if self-managed)

---

## Contact & Support

For security vulnerabilities, please email: security@yourdomain.com

**DO NOT** open public GitHub issues for security vulnerabilities.
