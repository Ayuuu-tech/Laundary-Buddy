# 🔐 Generated Secrets for Production

Copy these to your production environment:

```env
# Session Secret (128 characters hex)
SESSION_SECRET=f7c793722f9f105f44c53412d35e1aa8f99527b3c36f5e9f1c68e47e0b5a804353f3705f0d986d6c6e168815e065bd8485d34c7f36c809a14869679bbbd1ee3b

# JWT Secret (128 characters hex)
JWT_SECRET=c559cdb1f3232865cb7a0cf329f22dbfaeeb166a744560341ccd9b91380e178f8e7b43dc80f53c669c14df893b03261519781aa25f8b1d519fec03e5e55d40f9
```

## ⚠️ IMPORTANT SECURITY NOTES:

1. **DO NOT commit these secrets to Git**
2. **Add them to your production environment variables**
3. **Delete this file after copying the secrets**
4. **Generate new secrets if these are exposed**

## 🚀 Setting Environment Variables:

### On Render.com:
1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add these as environment variables
4. Click "Save Changes"

### On Heroku:
```bash
heroku config:set SESSION_SECRET=f7c793722f9f105f44c53412d35e1aa8f99527b3c36f5e9f1c68e47e0b5a804353f3705f0d986d6c6e168815e065bd8485d34c7f36c809a14869679bbbd1ee3b
heroku config:set JWT_SECRET=c559cdb1f3232865cb7a0cf329f22dbfaeeb166a744560341ccd9b91380e178f8e7b43dc80f53c669c14df893b03261519781aa25f8b1d519fec03e5e55d40f9
```

### On AWS/Docker:
Add to your `.env` file or environment configuration

---
*Generated: January 27, 2026*
*Keep these secrets secure!*
