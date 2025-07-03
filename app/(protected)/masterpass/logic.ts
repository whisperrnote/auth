// Enhanced crypto configuration for maximum security with optimal performance
export class MasterPassCrypto {
  private static instance: MasterPassCrypto;
  private masterKey: CryptoKey | null = null;
  private isUnlocked = false;
  private static readonly DEFAULT_TIMEOUT = 10 * 60 * 1000; // 10 minutes default

  static getInstance(): MasterPassCrypto {
    if (!MasterPassCrypto.instance) {
      MasterPassCrypto.instance = new MasterPassCrypto();
    }
    return MasterPassCrypto.instance;
  }

  // Enhanced configuration constants
  private static readonly PBKDF2_ITERATIONS = 200000; // Increased from 100k
  private static readonly SALT_SIZE = 32; // Increased from 16 bytes
  private static readonly IV_SIZE = 16; // Increased from 12 bytes for AES-256
  private static readonly KEY_SIZE = 256; // Explicit 256-bit key

  // Derive key from master password using PBKDF2
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: MasterPassCrypto.PBKDF2_ITERATIONS, // 200k iterations
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: MasterPassCrypto.KEY_SIZE },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Unlock vault with master password
  async unlock(masterPassword: string, userId: string, isFirstTime: boolean = false): Promise<boolean> {
    try {
      // SALT DERIVED ONLY FROM userId (consistent and unique per user)
      const encoder = new TextEncoder();
      const userBytes = encoder.encode(userId);
      const userSalt = await crypto.subtle.digest('SHA-256', userBytes);
      const combinedSalt = new Uint8Array(userSalt);
      const testKey = await this.deriveKey(masterPassword, combinedSalt);

      // For first-time setup, skip verification and just set the key
      if (isFirstTime) {
        this.masterKey = testKey;
        this.isUnlocked = true;
        sessionStorage.setItem('vault_unlocked', Date.now().toString());
        return true;
      }

      // For existing users, verify the check value
      const isValidPassword = await this.verifyMasterpassCheck(testKey, userId);
      if (!isValidPassword) {
        return false;
      }

      this.masterKey = testKey;
      this.isUnlocked = true;
      sessionStorage.setItem('vault_unlocked', Date.now().toString());
      return true;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      return false;
    }
  }

  // Set the check value (for initial master password creation)
  async setMasterpassCheck(userId: string): Promise<void> {
    const { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, Query } = await import('../../../lib/appwrite');
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal('userId', userId)]
    );
    const userDoc = response.documents[0];
    if (!userDoc) return;
    const check = await this.encryptCheckValue(userId);
    await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      userDoc.$id,
      { check }
    );
  }

  // Verify the check value (for unlock)
  async verifyMasterpassCheck(testKey: CryptoKey, userId: string): Promise<boolean> {
    try {
      const { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, Query } = await import('../../../lib/appwrite');
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal('userId', userId)]
      );
      const userDoc = response.documents[0];
      if (!userDoc || !userDoc.check) {
        // No check value yet, this should not happen for existing users
        console.log('No check value found for existing user');
        return false;
      }
      const decrypted = await this.decryptCheckValue(userDoc.check, testKey);
      return decrypted === userId;
    } catch (error) {
      console.log('Check value verification failed:', error);
      return false;
    }
  }

  // Clear the check value (for reset)
  async clearMasterpassCheck(userId: string): Promise<void> {
    const { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, Query } = await import('../../../lib/appwrite');
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal('userId', userId)]
    );
    const userDoc = response.documents[0];
    if (!userDoc) return;
    await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      userDoc.$id,
      { check: null }
    );
  }

  // Encrypt the check value (userId)
  async encryptCheckValue(userId: string): Promise<string> {
    if (!this.masterKey) throw new Error('Vault is locked');
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(userId));
    const iv = crypto.getRandomValues(new Uint8Array(MasterPassCrypto.IV_SIZE));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.masterKey,
      plaintext
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt the check value
  async decryptCheckValue(encryptedData: string, key: CryptoKey): Promise<string> {
    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
      const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch {
      throw new Error('Invalid master password');
    }
  }

  // Validate master password by testing decryption of existing data
  private async validateMasterPassword(testKey: CryptoKey, userId: string): Promise<boolean> {
    try {
      // Import the database modules to test against real encrypted data
      const { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_CREDENTIALS_ID, Query } = await import('../../../lib/appwrite');
      
      // Get raw documents WITHOUT automatic decryption
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_CREDENTIALS_ID,
        [Query.equal('userId', userId), Query.limit(10)] // Get more docs to find encrypted ones
      );
      
      if (response.documents.length === 0) {
        // No existing data to validate against - this is first time setup
        // For first-time setup, we accept any password since there's no existing data to test against
        return true;
      }

      // Look for any document with encrypted data to test against
      let foundEncryptedData = false;
      
      for (const doc of response.documents) {
        // Check if this document has encrypted fields that look like base64
        const hasEncryptedPassword = doc.password && 
          typeof doc.password === 'string' && 
          doc.password.length > 50 && // Encrypted data is much longer
          /^[A-Za-z0-9+/]+=*$/.test(doc.password); // Base64 pattern
          
        const hasEncryptedUsername = doc.username && 
          typeof doc.username === 'string' && 
          doc.username.length > 50 &&
          /^[A-Za-z0-9+/]+=*$/.test(doc.username);

        const hasEncryptedNotes = doc.notes && 
          typeof doc.notes === 'string' && 
          doc.notes.length > 50 &&
          /^[A-Za-z0-9+/]+=*$/.test(doc.notes);

        // Try to decrypt any encrypted field we find
        if (hasEncryptedPassword) {
          await this.testDecryption(doc.password, testKey);
          foundEncryptedData = true;
          break; // Successfully decrypted - password is correct
        } else if (hasEncryptedUsername) {
          await this.testDecryption(doc.username, testKey);
          foundEncryptedData = true;
          break; // Successfully decrypted - password is correct
        } else if (hasEncryptedNotes) {
          await this.testDecryption(doc.notes, testKey);
          foundEncryptedData = true;
          break; // Successfully decrypted - password is correct
        }
      }

      // If no encrypted data found, check if we have any data at all
      if (!foundEncryptedData) {
        // This could mean:
        // 1. User has credentials but they're not encrypted yet (legacy data)
        // 2. User has no credentials at all (first time)
        // In either case, we should allow the password for now
        console.log('No encrypted data found to validate against - allowing password (legacy or first-time setup)');
        return true;
      }

      // If we reach here, we successfully decrypted something
      return true;

    } catch (error) {
      // If any decryption fails, the password is wrong
      console.log('Master password validation failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  // Test decryption with a specific key (without setting it as the master key)
  private async testDecryption(encryptedData: string, testKey: CryptoKey): Promise<string> {
    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
      const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        testKey,
        encrypted
      );

      const decoder = new TextDecoder();
      const plaintext = decoder.decode(decrypted);
      return JSON.parse(plaintext);
    } catch (error) {
      throw new Error('Test decryption failed - invalid master password');
    }
  }

  // Lock vault (clear master key from memory)
  lock(): void {
    this.masterKey = null;
    this.isUnlocked = false;
    sessionStorage.removeItem('vault_unlocked');
  }

  // Reset master password (clear vault and force new setup)
  resetMasterPassword(): void {
    this.lockApplication();
    
    // Clear any setup flags
    if (typeof window !== 'undefined') {
      const userId = sessionStorage.getItem('current_user_id');
      if (userId) {
        localStorage.removeItem(`masterpass_setup_${userId}`);
      }
    }
  }

  // Get timeout setting from localStorage or use default
  private getTimeoutSetting(): number {
    const saved = localStorage.getItem('vault_timeout_minutes');
    return saved ? parseInt(saved) * 60 * 1000 : MasterPassCrypto.DEFAULT_TIMEOUT;
  }

  // Set timeout setting
  static setTimeoutMinutes(minutes: number): void {
    localStorage.setItem('vault_timeout_minutes', minutes.toString());
  }

  // Get timeout in minutes for UI
  static getTimeoutMinutes(): number {
    const saved = localStorage.getItem('vault_timeout_minutes');
    return saved ? parseInt(saved) : 10; // default 10 minutes
  }

  // Check if vault is unlocked with dynamic timeout
  isVaultUnlocked(): boolean {
    if (!this.isUnlocked || !this.masterKey) return false;

    const unlockTime = sessionStorage.getItem('vault_unlocked');
    if (unlockTime) {
      const elapsed = Date.now() - parseInt(unlockTime);
      const timeout = this.getTimeoutSetting();
      if (elapsed > timeout) {
        this.lockApplication();
        return false;
      }
    }
    return true;
  }

  // Encrypt data before sending to database
  async encryptData(data: any): Promise<string> {
    if (!this.isVaultUnlocked()) {
      throw new Error('Vault is locked');
    }

    try {
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(JSON.stringify(data));

      // Generate larger IV for enhanced security
      const iv = crypto.getRandomValues(new Uint8Array(MasterPassCrypto.IV_SIZE));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        this.masterKey!,
        plaintext
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Return base64 encoded string
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data received from database
  async decryptData(encryptedData: string): Promise<any> {
    if (!this.isVaultUnlocked()) {
      throw new Error('Vault is locked');
    }

    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV (now 16 bytes) and encrypted data
      const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
      const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        this.masterKey!,
        encrypted
      );

      const decoder = new TextDecoder();
      const plaintext = decoder.decode(decrypted);
      return JSON.parse(plaintext);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Application lock functionality
  lockApplication(): void {
    // Clear all decrypted data from memory
    this.masterKey = null;
    this.isUnlocked = false;

    // Clear session storage
    sessionStorage.removeItem('vault_unlocked');

    // Clear any cached decrypted data
    this.clearDecryptedCache();

    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }

  // Clear any cached decrypted data from components
  private clearDecryptedCache(): void {
    // Dispatch custom event to notify components to clear their decrypted data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vault-locked'));
    }
  }

  // Update activity timestamp
  updateActivity(): void {
    if (this.isUnlocked) {
      sessionStorage.setItem('vault_unlocked', Date.now().toString());

      // Optional: Add user activity validation
      this.validateUserActivity();
    }
  }

  // Validate user is still actively using the application
  private validateUserActivity(): void {
    // Check for suspicious activity patterns
    const activityPattern = sessionStorage.getItem('activity_pattern') || '[]';
    const activities = JSON.parse(activityPattern);
    const now = Date.now();

    // Keep only last 10 activities
    activities.push(now);
    if (activities.length > 10) {
      activities.shift();
    }

    sessionStorage.setItem('activity_pattern', JSON.stringify(activities));

    // Lock if activities seem automated (too regular)
    if (activities.length >= 5) {
      const intervals = activities.slice(1).map((time: number, i: number) =>
        time - activities[i]
      );
      const avgInterval = intervals.reduce((a: number, b: number) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((acc: number, interval: number) =>
        acc + Math.pow(interval - avgInterval, 2), 0
      ) / intervals.length;

      // If activities are too regular (low variance), might be automated
      if (variance < 1000 && avgInterval < 5000) {
        console.warn('Suspicious activity pattern detected');
        this.lockApplication();
      }
    }
  }
}

export const masterPassCrypto = MasterPassCrypto.getInstance();

// Export utility functions for settings page
export const setVaultTimeout = (minutes: number) => {
  MasterPassCrypto.setTimeoutMinutes(minutes);
};

export const getVaultTimeout = () => {
  return MasterPassCrypto.getTimeoutMinutes();
};

// Utility functions for field-specific encryption
export const encryptField = async (value: string): Promise<string> => {
  return masterPassCrypto.encryptData(value);
};

export const decryptField = async (encryptedValue: string): Promise<string> => {
  return masterPassCrypto.decryptData(encryptedValue);
};

// Middleware for automatic encryption/decryption of database operations
export const createSecureDbWrapper = (databases: any, databaseId: string) => {
  return {
    // Secure document creation
    createDocument: async (collectionId: string, documentId: string, data: any, permissions?: string[]) => {
      const secureData = { ...data };

      // Encrypt sensitive fields based on collection
      if (collectionId === 'credentials') {
        if (secureData.username) secureData.username = await encryptField(secureData.username);
        if (secureData.password) secureData.password = await encryptField(secureData.password);
        if (secureData.notes) secureData.notes = await encryptField(secureData.notes);
        if (secureData.customFields) secureData.customFields = await encryptField(secureData.customFields);
      } else if (collectionId === 'totpSecrets') {
        if (secureData.secretKey) secureData.secretKey = await encryptField(secureData.secretKey);
      }

      return databases.createDocument(databaseId, collectionId, documentId, secureData, permissions);
    },

    // Secure document retrieval
    getDocument: async (collectionId: string, documentId: string) => {
      const doc = await databases.getDocument(databaseId, collectionId, documentId);
      return await decryptDocument(doc, collectionId);
    },

    // Secure document listing
    listDocuments: async (collectionId: string, queries?: string[]) => {
      const response = await databases.listDocuments(databaseId, collectionId, queries);
      const decryptedDocuments = await Promise.all(
        response.documents.map((doc: any) => decryptDocument(doc, collectionId))
      );
      return { ...response, documents: decryptedDocuments };
    },

    // Secure document update
    updateDocument: async (collectionId: string, documentId: string, data: any, permissions?: string[]) => {
      const secureData = { ...data };

      // Encrypt sensitive fields based on collection
      if (collectionId === 'credentials') {
        if (secureData.username) secureData.username = await encryptField(secureData.username);
        if (secureData.password) secureData.password = await encryptField(secureData.password);
        if (secureData.notes) secureData.notes = await encryptField(secureData.notes);
        if (secureData.customFields) secureData.customFields = await encryptField(secureData.customFields);
      } else if (collectionId === 'totpSecrets') {
        if (secureData.secretKey) secureData.secretKey = await encryptField(secureData.secretKey);
      }

      return databases.updateDocument(databaseId, collectionId, documentId, secureData, permissions);
    },

    // Direct database access (for non-sensitive operations)
    deleteDocument: (collectionId: string, documentId: string) =>
      databases.deleteDocument(databaseId, collectionId, documentId),
  };
};

// Helper function to decrypt document based on collection type
const decryptDocument = async (doc: any, collectionId: string) => {
  const decryptedDoc = { ...doc };

  try {
    if (collectionId === 'credentials') {
      if (decryptedDoc.username) decryptedDoc.username = await decryptField(decryptedDoc.username);
      if (decryptedDoc.password) decryptedDoc.password = await decryptField(decryptedDoc.password);
      if (decryptedDoc.notes) decryptedDoc.notes = await decryptField(decryptedDoc.notes);
      if (decryptedDoc.customFields) decryptedDoc.customFields = await decryptField(decryptedDoc.customFields);
    } else if (collectionId === 'totpSecrets') {
      if (decryptedDoc.secretKey) decryptedDoc.secretKey = await decryptField(decryptedDoc.secretKey);
    }
  } catch (error) {
    console.error('Failed to decrypt document:', error);
    // Return original document if decryption fails (fallback)
    return doc;
  }

  return decryptedDoc;
};

// Persistence summary:
//
// - The master key (CryptoKey) and unlock state are kept **only in memory** (class fields) and are NOT persisted to disk or storage.
// - The unlock timestamp is stored in `sessionStorage` as 'vault_unlocked' to track inactivity timeout. This is cleared on lock.
// - The vault timeout setting (in minutes) is stored in `localStorage` as 'vault_timeout_minutes' for user configuration.
// - The master password itself and derived key are NEVER persisted to disk, localStorage, or sessionStorage.
// - Activity patterns for suspicious activity detection are stored in `sessionStorage` as 'activity_pattern' (array of timestamps).
// - The master password setup flag is stored in `localStorage` as 'masterpass_setup_{userId}' to know if the user has set a master password.
//
// All decrypted data and keys are kept only in memory and are cleared on lock or timeout. No sensitive cryptographic material is persisted beyond the session.
// - The master password setup flag is stored in `localStorage` as 'masterpass_setup_{userId}' to know if the user has set a master password.
//
// All decrypted data and keys are kept only in memory and are cleared on lock or timeout. No sensitive cryptographic material is persisted beyond the session.
// - The master password setup flag is stored in `localStorage` as 'masterpass_setup_{userId}' to know if the user has set a master password.
//
// All decrypted data and keys are kept only in memory and are cleared on lock or timeout. No sensitive cryptographic material is persisted beyond the session.
// - The master password setup flag is stored in `localStorage` as 'masterpass_setup_{userId}' to know if the user has set a master password.
//
// All decrypted data and keys are kept only in memory and are cleared on lock or timeout. No sensitive cryptographic material is persisted beyond the session.

// Add utility function for reset
export const resetMasterPasswordVault = () => {
  masterPassCrypto.resetMasterPassword();
};

// Add utility to update the check value in the user doc
export const updateMasterpassCheckValue = async (userId: string) => {
  const { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, Query } = await import('../../../lib/appwrite');
  const response = await appwriteDatabases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_USER_ID,
    [Query.equal('userId', userId)]
  );
  const userDoc = response.documents[0];
  if (!userDoc) return;
  const check = await masterPassCrypto.encryptCheckValue(userId);
  await appwriteDatabases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_USER_ID,
    userDoc.$id,
    { check }
  );
};
