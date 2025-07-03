// Enhanced crypto configuration for maximum security with optimal performance
class MasterPassCrypto {
  private static instance: MasterPassCrypto;
  private masterKey: CryptoKey | null = null;
  private isUnlocked = false;

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
  async unlock(masterPassword: string, userId: string): Promise<boolean> {
    try {
      // Generate stronger, more unique salt
      const encoder = new TextEncoder();
      const userBytes = encoder.encode(userId + 'whisperrauth_salt_2024');
      const userSalt = await crypto.subtle.digest('SHA-256', userBytes);
      const additionalEntropy = await crypto.subtle.digest('SHA-512', encoder.encode(userId + Date.now()));

      // Combine for 32-byte salt
      const combinedSalt = new Uint8Array(MasterPassCrypto.SALT_SIZE);
      combinedSalt.set(new Uint8Array(userSalt.slice(0, 16)));
      combinedSalt.set(new Uint8Array(additionalEntropy.slice(0, 16)), 16);

      this.masterKey = await this.deriveKey(masterPassword, combinedSalt);
      this.isUnlocked = true;

      // Store unlock timestamp for auto-lock
      sessionStorage.setItem('vault_unlocked', Date.now().toString());
      return true;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      return false;
    }
  }

  // Lock vault (clear master key from memory)
  lock(): void {
    this.masterKey = null;
    this.isUnlocked = false;
    sessionStorage.removeItem('vault_unlocked');
  }

  // Check if vault is unlocked
  isVaultUnlocked(): boolean {
    if (!this.isUnlocked || !this.masterKey) return false;

    // Auto-lock after 10 minutes (reduced from 15 for security)
    const unlockTime = sessionStorage.getItem('vault_unlocked');
    if (unlockTime) {
      const elapsed = Date.now() - parseInt(unlockTime);
      if (elapsed > 10 * 60 * 1000) {
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
