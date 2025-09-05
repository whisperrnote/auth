# Passkey Integration Plan

## Overview

Add passkey/biometric unlock as an optional alternative to master password without affecting existing encryption/decryption logic or master password functionality.

## Database Schema Changes

- **Collection**: `user` (APPWRITE_COLLECTION_USER_ID)
- **New Fields**:
  - `isPasskey`: boolean (optional, default: false)
  - `passkeyBlob`: string (optional, stores encrypted master key material)

## Core Principles

1. **Master password remains unchanged** - existing master password unlock continues to work exactly as before
2. **Encryption/decryption logic untouched** - vault encryption/decryption remains identical
3. **Non-disruptive for existing users** - users without passkey experience no changes
4. **Drop-in alternative** - passkey serves as alternative unlock method, not replacement
5. **Persistent until removed** - once created, passkey can unlock vault until manually disabled

## Implementation Flow

### 1. Passkey Registration (One-time setup)

1. User unlocks vault with master password (required)
2. Client generates random 32-byte wrapping key (`Kwrap`)
3. Client encrypts master-key-derivation material with `Kwrap` using AES-GCM
4. WebAuthn registration creates credential protecting `Kwrap`
5. Store encrypted blob and set `isPasskey: true` in user collection
6. Master password functionality remains unchanged

### 2. Passkey Authentication (Subsequent logins)

1. Check `isPasskey` flag in user collection
2. If true, offer "Unlock with Passkey" button alongside master password input
3. WebAuthn assertion recovers `Kwrap`
4. Decrypt master-key material client-side
5. Unlock vault using same logic as master password flow

### 3. Fallback & Compatibility

- Master password input always available
- Users without passkey (`isPasskey: false`) see no changes
- Existing encryption/decryption paths completely preserved
- No migration required for existing users
- encryption or decryption logic itself does not change, master password continues to be able to encrypt/decrypt data as before, and passkey functions solely aa a drop in replacement capable of the same, and strictly doesnt change encryption or decryption logic while in configuration or subsequent operation

### 4. Passkey Management

- Settings page option to enable/disable passkey
- Removal clears `passkeyBlob` and sets `isPasskey: false`
- Master password remains primary authentication method

## Security Guarantees

- Master key material never leaves client
- `passkeyBlob` contains only AEAD-encrypted data
- WebAuthn provides cryptographic proof of user presence
- Backward compatibility maintained for all existing flows
- No changes to vault encryption algorithms or key derivation

## UI Changes

- Master password page: conditional "Unlock with Passkey" button
- Settings page: passkey enable/disable toggle
- No disruption to existing user workflows
