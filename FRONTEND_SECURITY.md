# Frontend Security Implementation Guide

## Instructions for Adding Security Headers to HTML Files

### 1. Add to `<head>` section of all HTML files:

Copy the content from `security-headers.html` and paste it into the `<head>` section of:
- index.html
- home.html
- login.html
- signup.html
- submit.html
- track.html
- profile.html
- history.html
- support.html
- contact.html
- laundry-dashboard.html
- laundry-login.html

### 2. Update Google Client ID

In each HTML file, replace:
```html
<meta name="google-client-id" content="YOUR_GOOGLE_CLIENT_ID_HERE">
```

With your actual Google Client ID (or set it via environment variable in your deployment).

### 3. Update Content Security Policy

In `security-headers.html`, update the CSP `connect-src` directive with your actual API domain:

```html
connect-src 'self' https://accounts.google.com https://YOUR-ACTUAL-API-DOMAIN.com;
```

### 4. CSRF Token Integration

Add this script to api-config.js or at the beginning of your main JavaScript files:

```javascript
// Already included in security-headers.html
// This will automatically add CSRF tokens to all POST/PUT/DELETE/PATCH requests
```

### 5. Backend Changes Required

Add CSRF token route to `backend/routes/auth.js`:

```javascript
const { getCSRFTokenRoute, generateCSRFToken, validateCSRFToken } = require('../middleware/csrf');

// Add CSRF token generation to all routes
router.use(generateCSRFToken);

// Route to get CSRF token
router.get('/csrf-token', getCSRFTokenRoute);

// Apply CSRF validation to state-changing routes (except login/register)
// Example:
router.post('/logout', validateCSRFToken, authController.logout);
router.put('/profile', validateCSRFToken, authMiddleware, authController.updateProfile);
```

### 6. Testing CSRF Protection

Test that CSRF protection is working:

1. Try to make a POST/PUT/DELETE request without CSRF token - should get 403 error
2. Try with valid CSRF token - should work
3. Try with expired token - should get 403 error

### 7. Subresource Integrity (SRI)

If you're using CDN resources, add SRI hashes:

```html
<!-- Example -->
<script src="https://cdn.example.com/library.js" 
        integrity="sha384-HASH_HERE" 
        crossorigin="anonymous"></script>
```

Generate SRI hashes at: https://www.srihash.org/

## Security Checklist

- [ ] Add security headers to all HTML files
- [ ] Remove hardcoded Google Client ID from environment.js
- [ ] Add Google Client ID as meta tag in HTML
- [ ] Implement CSRF token in all forms
- [ ] Update CSP directives with actual domains
- [ ] Add SRI hashes to CDN resources
- [ ] Test CSRF protection
- [ ] Enable HTTPS in production
- [ ] Verify Content-Type headers
- [ ] Test XSS protection
- [ ] Validate all user inputs on frontend
- [ ] Sanitize all displayed user data

## Additional Security Measures

### Input Sanitization

Add to your form handling code:

```javascript
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Use before sending to API or displaying
const safeInput = sanitizeInput(userInput);
```

### XSS Prevention

When displaying user-generated content:

```javascript
// Bad - vulnerable to XSS
element.innerHTML = userData;

// Good - safe from XSS
element.textContent = userData;

// If you need HTML, sanitize first
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userData);
```

### Secure Cookie Handling

Ensure cookies are secure in production:

```javascript
// Already configured in backend/server.js
// Cookies should have:
// - httpOnly: true
// - secure: true (in production)
// - sameSite: 'strict' or 'lax'
```

### Rate Limiting on Frontend

Add basic client-side rate limiting:

```javascript
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}

// Usage
const limiter = new RateLimiter(5, 60000); // 5 requests per minute

async function makeAPICall() {
  if (!limiter.canMakeRequest()) {
    console.warn('Rate limit exceeded');
    return;
  }
  
  // Make API call
}
```

## Testing

### Manual Security Testing

1. **XSS Testing**: Try injecting `<script>alert('XSS')</script>` in all input fields
2. **CSRF Testing**: Try making requests without CSRF token
3. **Clickjacking**: Load your site in an iframe - should be blocked
4. **HTTPS**: All resources should load over HTTPS in production
5. **Headers**: Use security headers analyzer: https://securityheaders.com

### Automated Testing

Use tools like:
- OWASP ZAP: https://www.zaproxy.org/
- Burp Suite: https://portswigger.net/burp
- Mozilla Observatory: https://observatory.mozilla.org/

## Deployment

Before deploying to production:

1. Ensure all environment variables are set correctly
2. Verify HTTPS is enabled
3. Test all security features
4. Run security scanner
5. Review Content Security Policy violations
6. Monitor error logs for security issues

## Monitoring

Set up monitoring for:
- Failed login attempts
- CSRF token violations
- CSP violations
- XSS attempts
- Unusual API access patterns

## Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
- CSP Evaluator: https://csp-evaluator.withgoogle.com/
- Security Headers: https://securityheaders.com/
