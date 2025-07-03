// Master password encryption/decryption logic
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
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Unlock vault with master password
  async unlock(masterPassword: string, userId: string): Promise<boolean> {
    try {
      // Use userId as part of salt for user-specific encryption
      const encoder = new TextEncoder();
      const userSalt = await crypto.subtle.digest('SHA-256', encoder.encode(userId));
      const salt = new Uint8Array(userSalt.slice(0, 16));

      this.masterKey = await this.deriveKey(masterPassword, salt);
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

    // Auto-lock after 15 minutes of inactivity
    const unlockTime = sessionStorage.getItem('vault_unlocked');
    if (unlockTime) {
      const elapsed = Date.now() - parseInt(unlockTime);
      if (elapsed > 15 * 60 * 1000) { // 15 minutes
        this.lock();
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
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
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

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

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

  // Update activity timestamp
  updateActivity(): void {
    if (this.isUnlocked) {
      sessionStorage.setItem('vault_unlocked', Date.now().toString());
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
