# Laundry Buddy - Remaining Tasks & Improvements

## Security
- [x] **CSRF Protection**: Implemented via `csurf` and custom headers.
- [x] **Mass Assignment**: Fixed in `orderController` and `trackingController`.
- [x] **Profile Photos**: Migrated ingestion to local file storage.
   - [x] **Migration**: `migrate-photos.js` script created and run.
    - [ ] **Cloud Storage**: Future upgrade to S3/Cloudinary for scalability.
- [x] **Frontend Auth**: Migrated `laundry-dashboard` to use backend sessions.
- [x] **Rate Limiting**: `apiLimiter` covers all routes.

## Performance
- [x] **Service Worker**: Implemented IndexedDB for offline form submission.
- [x] **Pagination**: Added to `trackingController`, `adminController`, and **`contact.js`**.

## DevOps / Deployment
- [x] **Frontend Config**: Fixed Docker build context.
- [x] **Cache Headers**: Fixed dangerous `immutable` header.
- [x] **CI/CD**: Set up GitHub Actions (`.github/workflows/ci.yml`).

## Code Quality
- [x] **Logging**: Cleaned up verbose console logs in critical paths.
- [x] **Refactoring**: Consolidate duplicate `updateProfile` in `auth.js`.
- [x] **Pagination**: Added to `contact.js`.
- [x] **Data Retention**: Implemented scheduler for cleanup (`backend/cron/scheduler.js`).
- [x] **Access Control**: Strengthened admin checks in `trackingController` and `googleAuth`.
- [x] **HTML/Accessibility**: Fixed invalid button-in-anchor in `home.html`.
- [x] **Validation**: Applied `validationMiddleware` to sensitive routes (`orders`, `support`, `auth`).
- [x] **Rate Limiting**: Added specific OTP limiter (3/hr) to prevent spam.
- [x] **Frontend Security**: Secure token generation and global error handling.
- [x] **Backend Logic**: Server-side price calculation and secure random IDs.

## Completed Enhancements
- [x] **Cloud Storage**: Implemented `uploadService.js` with Cloudinary support (enabled via env vars).
- [x] **Transaction Support**: Implemented MongoDB transactions in `orderController` and `trackingController` for data integrity.

