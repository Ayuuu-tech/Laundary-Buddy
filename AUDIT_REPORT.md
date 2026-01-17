# Audit Report: LaundryBuddy Flaws 

## Status of Reported Flaws

### Critical & High Priority Issues
| Flaw ID | Description | Status | Action Taken |
|---------|-------------|--------|--------------|
| 1 | Hardcoded Admin Email | **Fixed** | Removed hardcoded check in `routes/admin.js`. Access is fully controlled by `isAdmin` middleware. |
| 2 | Plain Password in User Doc | **Fixed** | Verified logic uses `tempUser` with hashed password during OTP flows. |
| 3 | CORS Bypass in Production | **Fixed** | Enforced strict origin check in `server.js`, rejecting unknown origins. |
| 4 | Missing Admin Auth (Support) | **Fixed** | Confirmed `isAdmin` middleware is applied to sensitive `support` routes. |
| 5 | Mass Assignment (Orders) | **Fixed** | Verified explicit field whitelisting in `updateOrder` controller. |
| 6 | No Rate Limit (Reset OTP) | **Fixed** | `otpLimiter` is successfully applied to `request-reset-otp` route. |
| 7 | Session Data Exposure | **Fixed** | Removed `req.session` from error responses and development logs. |
| 15 | Inconsistent Auth (JWT/Session) | **Fixed** | Standardized on Session-based auth for consistency. |
| 26 | Hardcoded API Key (Frontend) | **Fixed** | Removed `x-laundry-key` from frontend. Backend relies on Admin Session. |
| 28 | Google OAuth Validation | **Fixed** | Verified strict Client ID check in `googleAuth.js`. |
| 29 | Service Worker LocalStorage | **Fixed** | Confirmed usage of IndexedDB (`idb-utils.js`) for offline storage. |
| 40 | Weak Token Generation | **Fixed** | Replaced `Math.random` with `crypto.getRandomValues`. |
| 55 | Hardcoded DB Credentials | **Fixed** | Updated `docker-compose.yml` to strictly require environment variables. |

### Medium & Low Priority Issues
| Flaw ID | Description | Status | Action Taken |
|---------|-------------|--------|--------------|
| 8 | Verbose Debug Logging | **Fixed** | Wrapped sensitive logs in `NODE_ENV` checks or removed them. |
| 9 | Duplicate Functions | **Fixed** | Verified `updateProfile` is not duplicated in `auth.js`. |
| 10 | URL Path Duplication | **Fixed** | Cleaned up `/api` prefixes in `api-config.js` and `laundry-dashboard.js`. |
| 30 | Base64 Profile Photos | **Fixed** | Backend now saves photos to disk (`uploads/` folder) instead of DB. |
| - | Duplicate Security Headers | **Fixed** | Removed redundant headers from `https.js` that conflict with Helmet. |
| - | Invalid HTML (Form Method) | **Fixed** | Added `method="POST"` to `submit.html` form. |
| - | Model Default Status | **Fixed** | Aligned `Tracking` model default status to `pending`. |

## Remaining Tasks / Architecture
- **Cloud Storage**: Profile photos are currently saved to local disk (`/uploads`). For scalable deployment (e.g., Heroku/Vercel), migrate to S3/Cloudinary. (See TODO.md)
- **MongoDB Transactions**: For complex state changes (Order + Tracking), implementing transactions is recommended for data integrity.

## Conclusion
The application is now secure and production-ready regarding the identified flaws. All critical security vulnerabilities have been addressed.
