# Security Implementation Guide

## Overview

This document describes the security architecture and implementations in Whisperrauth password manager.

## Security Layers

### 1. Encryption

#### Client-Side Encryption (Zero-Knowledge)
- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with 600,000 iterations (OWASP 2023 standard)
- **Salt:** 256-bit random salt (currently derived from userId for backward compatibility)
- **IV:** 128-bit random IV per encryption operation
- **Key Size:** 256-bit

All sensitive data (passwords, usernames, notes, TOTP secrets) is encrypted client-side before transmission to the server. The master password never leaves the client, and the server never has access to decrypted data.

### 2. Authentication

#### Multi-Factor Authentication (MFA)
- Time-based One-Time Passwords (TOTP)
- Email OTP for account recovery
- Passkey/WebAuthn support for biometric authentication

#### Session Management
- Secure session tokens via Appwrite
- Automatic timeout (default: 10 minutes configurable)
- Device fingerprinting for session validation
- Multi-tab synchronization

### 3. Rate Limiting

Client-side rate limiting implemented to prevent brute force attacks:
- Max 5 attempts per 15-minute window
- 30-minute lockout after exceeding limit
- Progressive delays after failed attempts

**Note:** Server-side rate limiting should also be implemented via Appwrite Functions.

### 4. Input Validation

All user inputs are validated and sanitized:
- Email validation (RFC 5322 compliant)
- Password strength requirements (min 12 chars, complexity rules)
- XSS prevention via HTML sanitization
- URL validation and protocol whitelisting
- JSON validation for custom fields

### 5. Security Headers

The following security headers are enforced:

```
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-XSS-Protection: 1; mode=block
```

### 6. Audit Logging

All security-critical events are logged:
- Authentication attempts (success/failure)
- Vault unlock/lock events
- Data access and modifications
- MFA changes
- Passkey additions/removals
- Suspicious activity detection

Logs include:
- User ID
- Event type
- Timestamp
- IP address (when available)
- User agent
- Device fingerprint
- Event details (sanitized)

### 7. Secure Logging

Production logging implementation:
- No sensitive data logged (passwords, keys, tokens redacted)
- Development-only console logging
- Error tracking integration ready
- Automatic sanitization of log contexts

## Security Best Practices

### For Developers

1. **Never log sensitive data**
   - Use the secure logger: `import { logDebug, logError } from '@/lib/logger'`
   - Sensitive keys are automatically redacted

2. **Always validate inputs**
   - Use validation functions from `@/lib/validation`
   - Sanitize before storage and display

3. **Use rate limiting**
   - Apply rate limiting to authentication endpoints
   - `import { checkRateLimit } from '@/lib/rate-limiter'`

4. **Audit security events**
   - Log all security-critical operations
   - `import { logSecurityEvent } from '@/lib/audit'`

5. **Handle errors securely**
   - Never expose stack traces to users
   - Use generic error messages for users
   - Log detailed errors server-side only

### For Deployment

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure secret management (e.g., Vercel Secrets, AWS Secrets Manager)
   - Rotate secrets regularly

2. **HTTPS Only**
   - Enforce HTTPS in production
   - Enable HSTS headers
   - Use valid SSL certificates

3. **Database Security**
   - Enable encryption at rest
   - Restrict network access
   - Regular backups (encrypted)
   - Implement proper access controls

4. **Monitoring**
   - Set up error tracking (Sentry, DataDog)
   - Monitor security logs for suspicious patterns
   - Set up alerts for critical events

## Common Vulnerabilities Addressed

### ✅ XSS (Cross-Site Scripting)
- Input sanitization on all user inputs
- CSP headers enforced
- React's built-in XSS protection
- No `dangerouslySetInnerHTML` usage

### ✅ CSRF (Cross-Site Request Forgery)
- SameSite cookie attributes
- Origin validation
- CSRF tokens (via Appwrite)

### ✅ SQL Injection
- Using Appwrite SDK (parameterized queries)
- Input validation

### ✅ Clickjacking
- X-Frame-Options: DENY
- CSP frame-ancestors 'none'

### ✅ Session Hijacking
- Secure, HttpOnly cookies
- Device fingerprinting
- Automatic session timeout
- Multi-tab logout synchronization

### ✅ Brute Force Attacks
- Rate limiting
- Progressive delays
- Account lockout
- CAPTCHA ready

### ✅ Information Disclosure
- Generic error messages
- No stack traces in production
- Secure logging
- No version exposure (X-Powered-By removed)

### ✅ Insecure Cryptography
- Industry-standard algorithms (AES-256-GCM)
- Proper key derivation (PBKDF2, 600k iterations)
- Cryptographically secure randomness
- No fallback to weak crypto

## Incident Response

### If a Security Breach is Suspected

1. **Immediate Actions**
   - Rotate all secrets and API keys
   - Invalidate all active sessions
   - Enable maintenance mode if necessary
   - Preserve logs and evidence

2. **Investigation**
   - Review security audit logs
   - Analyze access patterns
   - Identify affected users and data
   - Determine attack vector

3. **Remediation**
   - Patch vulnerabilities
   - Deploy fixes
   - Force password resets for affected users
   - Notify affected users (if required by law)

4. **Post-Incident**
   - Conduct security review
   - Update security procedures
   - Document lessons learned
   - Improve monitoring and detection

## Compliance

### Data Protection
- **GDPR Compliance:** User data encryption, right to deletion, data portability
- **CCPA Compliance:** Data access requests, deletion requests
- **SOC 2 Ready:** Audit logging, access controls, encryption

### Password Security
- Follows NIST SP 800-63B guidelines
- Implements OWASP password recommendations
- Zero-knowledge architecture

## Security Checklist

### Before Production Deployment

- [ ] All environment variables properly set
- [ ] HTTPS enforced with valid certificates
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error tracking configured (Sentry/DataDog)
- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] Backup and recovery tested
- [ ] Incident response plan documented
- [ ] Security monitoring alerts configured
- [ ] Dependencies updated and audited
- [ ] No debug code or console.logs in production
- [ ] Proper CORS configuration
- [ ] Database encryption at rest enabled
- [ ] Regular security scans scheduled

## Security Contact

For security issues, please contact: [Your Security Contact]

**DO NOT** create public GitHub issues for security vulnerabilities.

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Appwrite Security](https://appwrite.io/docs/security)

## Version History

- **v1.0.0** (2025-10-15): Initial security implementation
  - AES-256-GCM encryption
  - PBKDF2 600k iterations
  - Comprehensive input validation
  - Security headers
  - Audit logging
  - Rate limiting
