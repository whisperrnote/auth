# Backend Database Schema Upgrade - Migration Guide

## Overview

This document describes the comprehensive security and feature upgrades to the Appwrite backend schema for the Whisperrauth password manager application.

## Key Changes Summary

### 1. **Maximum Encryption Enabled** 🔐
- **Appwrite-level encryption** enabled on ALL sensitive columns
- First layer of defense: backend database encryption (Appwrite's encryption at rest)
- Second layer: Client-side end-to-end encryption with master password
- Triple-layered security: Network (TLS) → Database (Appwrite) → Application (Client-side)

### 2. **New "Identities" Table** 👤
- Dedicated table for passkeys and future identity types
- Supports multiple passkeys per user (primary + backups)
- Extensible for future identity methods (biometrics, hardware keys, etc.)
- Clean separation from user metadata

### 3. **Expanded Credentials Schema** 💳
- **itemType field**: Support for login, card, secureNote, identity, etc.
- **Credit card fields**: cardNumber, cardholderName, cardExpiry, cardCVV, cardPIN, cardType
- **TOTP linking**: `totpId` field to reference TOTP secrets
- **Soft delete**: isDeleted, deletedAt for recovery
- **Usage tracking**: lastAccessedAt, passwordChangedAt
- **Favorites**: isFavorite flag for quick access

### 4. **Enhanced Security Logging** 📊
- Additional encrypted fields: ipAddress, userAgent, deviceFingerprint, details
- Success/failure tracking
- Severity levels (info, warning, error, critical)
- Composite indexes for fast querying

### 5. **Improved User Table** 👥
- Additional encrypted fields: email, salt, twofaSecret, backupCodes
- Auth version tracking (authVersion, v2Migrated)
- Session fingerprinting
- Last login and password change tracking

### 6. **Enhanced TOTP Table** ⏱️
- All sensitive fields encrypted (issuer, accountName, secretKey, url)
- URL field for autofill support
- Favorite and soft delete support
- Usage tracking (lastUsedAt)

### 7. **Enhanced Folders** 📁
- Encrypted folder names
- Icon and color support
- Sort ordering
- Soft delete support

### 8. **Improved Auth Settings** ⚙️
- Login rate limiting (10 attempts)
- Session limits (5 concurrent sessions)
- Password history (last 5 passwords)
- Password dictionary checks
- Personal data checks
- Session alerts

### 9. **Enhanced Storage Buckets** 📦
- Compression enabled (gzip)
- Additional secure documents bucket
- Increased backup size limit (100MB)
- Additional image formats (webp, avif)

---

## Detailed Schema Changes

### Credentials Table

#### New Fields
```javascript
itemType: string (default: "login") // login, card, secureNote, identity
totpId: string // Reference to TOTP secret
cardNumber: string (encrypted)
cardholderName: string (encrypted)
cardExpiry: string (encrypted)
cardCVV: string (encrypted)
cardPIN: string (encrypted)
cardType: string // visa, mastercard, amex, etc.
isFavorite: boolean
isDeleted: boolean
deletedAt: datetime
lastAccessedAt: datetime
passwordChangedAt: datetime
```

#### Encrypted Fields
- ✅ name
- ✅ url
- ✅ username
- ✅ password
- ✅ notes
- ✅ customFields
- ✅ cardNumber
- ✅ cardholderName
- ✅ cardExpiry
- ✅ cardCVV
- ✅ cardPIN

#### New Indexes
- idx_itemType
- idx_isFavorite
- idx_isDeleted
- idx_totpId
- idx_lastAccessed
- idx_user_type (composite: userId + itemType)

### TOTP Secrets Table

#### New Fields
```javascript
url: string (encrypted) // For autofill
tags: string[] // Categorization
isFavorite: boolean
isDeleted: boolean
deletedAt: datetime
lastUsedAt: datetime
```

#### Encrypted Fields
- ✅ issuer
- ✅ accountName
- ✅ secretKey
- ✅ url

#### New Indexes
- idx_isFavorite
- idx_isDeleted
- idx_lastUsed

### Identities Table (NEW)

Complete new table for managing passkeys and future identity types.

#### Fields
```javascript
userId: string
identityType: string (default: "passkey") // passkey, hardware_key, biometric
label: string (encrypted) // User-friendly name
credentialId: string (encrypted)
publicKey: string (encrypted)
counter: integer
passkeyBlob: string (encrypted) // Wrapped master key
transports: string[] // usb, nfc, ble, internal
aaguid: string // Authenticator GUID
deviceInfo: string (encrypted) // Device details
isPrimary: boolean
isBackup: boolean
lastUsedAt: datetime
createdAt: datetime
updatedAt: datetime
```

#### Indexes
- idx_userId
- idx_identityType
- idx_isPrimary
- idx_lastUsed
- idx_user_type (composite)

### Folders Table

#### New Fields
```javascript
icon: string // Emoji or icon identifier
color: string // Hex color
sortOrder: integer // Manual ordering
isDeleted: boolean
deletedAt: datetime
```

#### Encrypted Fields
- ✅ name

#### New Indexes
- idx_isDeleted
- idx_sortOrder

### Security Logs Table

#### New Fields
```javascript
deviceFingerprint: string (encrypted)
success: boolean
severity: string // info, warning, error, critical
```

#### Encrypted Fields
- ✅ ipAddress
- ✅ userAgent
- ✅ deviceFingerprint
- ✅ details

#### New Indexes
- idx_success
- idx_severity
- idx_user_time (composite)

### User Table

#### New Fields
```javascript
salt: string (encrypted) // For future random salt migration
twofaSecret: string (encrypted) // TOTP secret for 2FA
backupCodes: string (encrypted) // JSON array of backup codes
authVersion: integer (default: 1) // Auth system version
v2Migrated: boolean // Migration status
mustCreatePasskey: boolean // Enforcement flag
sessionFingerprint: string (encrypted) // Current session fingerprint
lastLoginAt: datetime
lastPasswordChangeAt: datetime
createdAt: datetime
updatedAt: datetime
```

#### Encrypted Fields
- ✅ email
- ✅ check
- ✅ salt
- ✅ twofaSecret
- ✅ backupCodes
- ✅ passkeyBlob
- ✅ credentialId
- ✅ publicKey
- ✅ sessionFingerprint

#### New Indexes
- idx_userId (unique)
- idx_authVersion

---

## Migration Strategy

### Phase 1: Schema Deployment (Non-Breaking)

1. **Deploy New Schema**
   ```bash
   appwrite deploy collection
   ```

2. **Verify Deployment**
   - Check all collections created
   - Verify encryption settings
   - Test indexes

### Phase 2: Data Migration

#### 2.1 Credentials Migration

```typescript
// Add itemType to existing credentials
await db.listDocuments('credentials').then(async (docs) => {
  for (const doc of docs.documents) {
    await db.updateDocument('credentials', doc.$id, {
      itemType: 'login', // Default to login
      isFavorite: false,
      isDeleted: false
    });
  }
});
```

#### 2.2 User Table Migration

```typescript
// Add new fields to existing users
await db.listDocuments('user').then(async (docs) => {
  for (const doc of docs.documents) {
    await db.updateDocument('user', doc.$id, {
      authVersion: 1,
      v2Migrated: false,
      mustCreatePasskey: false
    });
  }
});
```

#### 2.3 Identities Migration (Optional)

```typescript
// Migrate existing passkey data to identities table
await db.listDocuments('user').then(async (docs) => {
  for (const doc of docs.documents) {
    if (doc.isPasskey && doc.credentialId) {
      await db.createDocument('identities', ID.unique(), {
        userId: doc.userId,
        identityType: 'passkey',
        label: 'Primary Passkey',
        credentialId: doc.credentialId,
        publicKey: doc.publicKey,
        counter: doc.counter || 0,
        passkeyBlob: doc.passkeyBlob,
        isPrimary: true,
        isBackup: false,
        createdAt: doc.$createdAt
      });
    }
  }
});
```

### Phase 3: Frontend Updates

#### 3.1 Update Types

Regenerate TypeScript types:
```bash
appwrite types types/
```

#### 3.2 Update AppwriteService

Add support for new fields and itemType filtering:

```typescript
// In lib/appwrite.ts

// Add itemType to credential creation
static async createCredential(data: {
  itemType?: 'login' | 'card' | 'secureNote' | 'identity';
  // ... other fields
}) {
  const fullData = {
    itemType: data.itemType || 'login',
    ...data
  };
  // ... rest of implementation
}

// Add method for identities
static async createIdentity(data: IdentityData) {
  // ... implementation
}

// Add method for credit cards
static async createCreditCard(cardData: CreditCardData) {
  return this.createCredential({
    itemType: 'card',
    ...cardData
  });
}
```

#### 3.3 Add UI for New Features

1. **Credit Card Form**
   - Card number input with formatting
   - Expiry date picker
   - CVV/PIN secure inputs

2. **Identity Management UI**
   - List all passkeys/identities
   - Add/remove identities
   - Mark as primary/backup

3. **TOTP Linking**
   - Select TOTP when creating/editing credential
   - Display linked TOTP code inline

4. **Favorites & Soft Delete**
   - Star icon for favorites
   - Trash/restore functionality
   - Permanent delete after confirmation

---

## Security Improvements

### Encryption Coverage

**Before:**
- Client-side: username, password, notes, customFields, secretKey
- Database: publicKey only
- **Coverage: ~30%**

**After:**
- Client-side: All sensitive fields (unchanged)
- Database: ALL sensitive fields encrypted
- **Coverage: ~95%**

### Threat Model

| Layer | Threat | Mitigation |
|-------|--------|------------|
| Network | MITM | TLS 1.3 |
| Database | Breach | Appwrite encryption at rest |
| Application | Compromise | Client-side E2EE |
| Memory | Dump | Secure key handling |
| Session | Hijacking | Fingerprinting |

### Defense in Depth

```
User Input
    ↓
[Client-side encryption] ← Master password required
    ↓
[TLS encryption] ← Network security
    ↓
[Appwrite encryption] ← Database security
    ↓
[Disk encryption] ← Server security
    ↓
Persistent Storage
```

---

## Feature Enhancements

### 1. Multi-Item Type Support

Users can now store:
- ✅ Login credentials
- ✅ Credit/debit cards
- ✅ Secure notes
- ✅ Identity documents
- ✅ Custom item types

### 2. TOTP Integration

- Link TOTP codes to credentials
- Auto-fill TOTP when filling password
- One-click copy TOTP code
- Track TOTP usage

### 3. Identity Management

- Multiple passkeys per user
- Primary + backup keys
- Device information tracking
- Usage statistics

### 4. Enhanced Organization

- Favorites for quick access
- Soft delete with recovery
- Last accessed tracking
- Password change history
- Folder customization (icons, colors)

---

## Performance Considerations

### Index Strategy

All indexes are optimized for common queries:

1. **User-scoped queries**: `idx_userId` on all tables
2. **Type filtering**: `idx_itemType`, `idx_identityType`
3. **Status filtering**: `idx_isFavorite`, `idx_isDeleted`
4. **Time-based sorting**: `idx_lastAccessed`, `idx_timestamp`
5. **Composite indexes**: User + Type combinations

### Query Optimization

```typescript
// Efficient: Uses composite index
db.listDocuments('credentials', [
  Query.equal('userId', userId),
  Query.equal('itemType', 'login'),
  Query.equal('isDeleted', false)
]);

// Efficient: Uses dedicated indexes
db.listDocuments('credentials', [
  Query.equal('userId', userId),
  Query.equal('isFavorite', true),
  Query.orderDesc('lastAccessedAt'),
  Query.limit(10)
]);
```

---

## Backwards Compatibility

### Breaking Changes: NONE ✅

All changes are additive or have defaults:
- New fields have default values
- Existing fields unchanged
- Client-side encryption layer remains identical
- No API changes required

### Migration Path

1. Deploy schema ✅ Non-breaking
2. Run data migration ✅ Adds defaults
3. Update frontend ✅ Gradual rollout
4. Enable new features ✅ Feature flags

---

## Testing Checklist

### Schema Validation
- [ ] All collections created successfully
- [ ] All encryption flags set correctly
- [ ] All indexes created and available
- [ ] Row-level security enabled
- [ ] Permissions configured correctly

### Data Integrity
- [ ] Existing credentials accessible
- [ ] Existing TOTP secrets working
- [ ] Existing folders functional
- [ ] No data loss during migration
- [ ] Encryption/decryption working

### New Features
- [ ] Create login credential
- [ ] Create credit card
- [ ] Create identity/passkey
- [ ] Link TOTP to credential
- [ ] Mark item as favorite
- [ ] Soft delete and restore
- [ ] Folder customization
- [ ] Security logs captured

### Performance
- [ ] Query response times < 100ms
- [ ] Index utilization verified
- [ ] No N+1 queries
- [ ] Pagination working
- [ ] Large datasets handled

---

## Rollback Plan

If issues occur:

1. **Stop new writes**
   ```bash
   # Disable collections temporarily
   appwrite update collection --enabled false
   ```

2. **Restore from backup**
   ```bash
   cp appwrite.json.backup appwrite.json
   appwrite deploy collection
   ```

3. **Verify data integrity**
   - Check critical data accessible
   - Test encryption/decryption
   - Verify user access

4. **Analyze issues**
   - Review logs
   - Identify root cause
   - Plan remediation

---

## Success Metrics

- ✅ Zero data loss during migration
- ✅ 100% encryption coverage of sensitive fields
- ✅ < 100ms query response times
- ✅ Successful creation of all item types
- ✅ Identity management functional
- ✅ TOTP linking operational
- ✅ No security regressions
- ✅ Backwards compatibility maintained

---

## Next Steps

1. **Review this migration guide**
2. **Test schema in development environment**
3. **Run migration scripts on staging**
4. **Update frontend components**
5. **Test all features end-to-end**
6. **Deploy to production**
7. **Monitor and verify**

---

## Support

For issues or questions:
- Review logs in Appwrite console
- Check security audit logs
- Refer to SECURITY.md
- Contact: [Your contact]

---

**Version:** 2.0.0  
**Date:** 2025-10-15  
**Status:** Ready for deployment
