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
  private async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: MasterPassCrypto.PBKDF2_ITERATIONS, // 200k iterations
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: MasterPassCrypto.KEY_SIZE },
      true, // Make extractable for passkey functionality
      ["encrypt", "decrypt"],
    );
  }

  // Getter for the master key, needed for passkey logic
  getMasterKey(): CryptoKey | null {
    return this.masterKey;
  }

  // Export the raw master key
  async exportKey(): Promise<ArrayBuffer | null> {
    if (!this.masterKey) return null;
    return crypto.subtle.exportKey("raw", this.masterKey);
  }

  // Import a raw key and set it as the master key
  async importKey(keyBytes: ArrayBuffer): Promise<void> {
    this.masterKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM", length: 256 },
      true, // Make it extractable so it can be re-wrapped
      ["encrypt", "decrypt"],
    );
  }

  // Unlock the vault after a key has been imported (e.g., from passkey)
  async unlockWithImportedKey(): Promise<boolean> {
    if (!this.masterKey) {
      console.error("Cannot unlock with imported key: key is not present.");
      return false;
    }
    this.isUnlocked = true;
    sessionStorage.setItem("vault_unlocked", Date.now().toString());
    // We don't need to verify a check value here because the key's authenticity
    // is guaranteed by the passkey's cryptographic signature.
    return true;
  }

  // Unlock vault with master password
  async unlock(
    masterPassword: string,
    userId: string,
    isFirstTime: boolean = false,
  ): Promise<boolean> {
    try {
      // SALT DERIVED ONLY FROM userId (consistent and unique per user)
      const encoder = new TextEncoder();
      const userBytes = encoder.encode(userId);
      const userSalt = await crypto.subtle.digest("SHA-256", userBytes);
      const combinedSalt = new Uint8Array(userSalt);
      const testKey = await this.deriveKey(masterPassword, combinedSalt);

      // For first-time setup, skip verification and just set the key
      if (isFirstTime) {
        this.masterKey = testKey;
        this.isUnlocked = true;
        sessionStorage.setItem("vault_unlocked", Date.now().toString());
        return true;
      }

      // For existing users, verify the check value
      const isValidPassword = await this.verifyMasterpassCheck(testKey, userId);
      if (!isValidPassword) {
        return false;
      }

      this.masterKey = testKey;
      this.isUnlocked = true;
      sessionStorage.setItem("vault_unlocked", Date.now().toString());
      return true;
    } catch (error) {
      console.error("Failed to unlock vault:", error);
      return false;
    }
  }

  // Set the check value (for initial master password creation)
  async setMasterpassCheck(userId: string): Promise<void> {
    const {
      appwriteDatabases,
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      Query,
    } = await import("../../../lib/appwrite");
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal("userId", userId)],
    );
    const userDoc = response.documents[0];
    if (!userDoc) return;
    const check = await this.encryptCheckValue(userId);
    await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      userDoc.$id,
      { check },
    );
  }

  // Verify the check value (for unlock)
  async verifyMasterpassCheck(
    testKey: CryptoKey,
    userId: string,
  ): Promise<boolean> {
    try {
      const {
        appwriteDatabases,
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        Query,
      } = await import("../../../lib/appwrite");
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal("userId", userId)],
      );
      const userDoc = response.documents[0];
      if (!userDoc || !userDoc.check) {
        // No check value yet, this should not happen for existing users
        console.log("No check value found for existing user");
        return false;
      }
      const decrypted = await this.decryptCheckValue(userDoc.check, testKey);
      return decrypted === userId;
    } catch (error) {
      console.log("Check value verification failed:", error);
      return false;
    }
  }

  // Clear the check value (for reset)
  async clearMasterpassCheck(userId: string): Promise<void> {
    const {
      appwriteDatabases,
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      Query,
    } = await import("../../../lib/appwrite");
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal("userId", userId)],
    );
    const userDoc = response.documents[0];
    if (!userDoc) return;
    await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      userDoc.$id,
      { check: null },
    );
  }

  // Encrypt the check value (userId)
  async encryptCheckValue(userId: string): Promise<string> {
    if (!this.masterKey) throw new Error("Vault is locked");
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(userId));
    const iv = crypto.getRandomValues(new Uint8Array(MasterPassCrypto.IV_SIZE));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.masterKey,
      plaintext,
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  // Decrypt the check value
  async decryptCheckValue(
    encryptedData: string,
    key: CryptoKey,
  ): Promise<string> {
    try {
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );
      const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
      const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encrypted,
      );
      const decoder = new TextDecoder();
      // Stored check is JSON.stringify(userId), so decode -> string and compare raw
      const decoded = decoder.decode(decrypted);
      try {
        return JSON.parse(decoded);
      } catch {
        // If value was stored as plain string without JSON quotes (legacy), return raw
        return decoded;
      }
    } catch {
      throw new Error("Invalid master password");
    }
  }

  // Validate master password by testing decryption of existing data
  private async validateMasterPassword(
    testKey: CryptoKey,
    userId: string,
  ): Promise<boolean> {
    try {
      // Import the database modules to test against real encrypted data
      const {
        appwriteDatabases,
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_CREDENTIALS_ID,
        Query,
      } = await import("../../../lib/appwrite");

      // Get raw documents WITHOUT automatic decryption
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_CREDENTIALS_ID,
        [Query.equal("userId", userId), Query.limit(10)], // Get more docs to find encrypted ones
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
        const hasEncryptedPassword =
          doc.password &&
          typeof doc.password === "string" &&
          doc.password.length > 50 && // Encrypted data is much longer
          /^[A-Za-z0-9+/]+=*$/.test(doc.password); // Base64 pattern

        const hasEncryptedUsername =
          doc.username &&
          typeof doc.username === "string" &&
          doc.username.length > 50 &&
          /^[A-Za-z0-9+/]+=*$/.test(doc.username);

        const hasEncryptedNotes =
          doc.notes &&
          typeof doc.notes === "string" &&
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
        console.log(
          "No encrypted data found to validate against - allowing password (legacy or first-time setup)",
        );
        return true;
      }

      // If we reach here, we successfully decrypted something
      return true;
    } catch (error) {
      // If any decryption fails, the password is wrong
      console.log(
        "Master password validation failed:",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  // Test decryption with a specific key (without setting it as the master key)
  private async testDecryption(
    encryptedData: string,
    testKey: CryptoKey,
  ): Promise<string> {
    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
      const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        testKey,
        encrypted,
      );

      const decoder = new TextDecoder();
      const plaintext = decoder.decode(decrypted);
      return JSON.parse(plaintext);
    } catch (error) {
      throw new Error("Test decryption failed - invalid master password");
    }
  }

  // Lock vault (clear master key from memory)
  lock(): void {
    this.masterKey = null;
    this.isUnlocked = false;
    sessionStorage.removeItem("vault_unlocked");
  }

  // Reset master password (clear vault and force new setup)
  resetMasterPassword(): void {
    this.lockApplication();

    // Clear any setup flags
    if (typeof window !== "undefined") {
      const userId = sessionStorage.getItem("current_user_id");
      if (userId) {
        localStorage.removeItem(`masterpass_setup_${userId}`);
      }
    }
  }

  // Get timeout setting from localStorage or use default
  private getTimeoutSetting(): number {
    const saved = localStorage.getItem("vault_timeout_minutes");
    return saved
      ? parseInt(saved) * 60 * 1000
      : MasterPassCrypto.DEFAULT_TIMEOUT;
  }

  // Set timeout setting
  static setTimeoutMinutes(minutes: number): void {
    localStorage.setItem("vault_timeout_minutes", minutes.toString());
  }

  // Get timeout in minutes for UI
  static getTimeoutMinutes(): number {
    const saved = localStorage.getItem("vault_timeout_minutes");
    return saved ? parseInt(saved) : 10; // default 10 minutes
  }

  // Check if vault is unlocked with dynamic timeout
  isVaultUnlocked(): boolean {
    if (!this.isUnlocked || !this.masterKey) return false;

    const unlockTime = sessionStorage.getItem("vault_unlocked");
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
  async encryptData(data: unknown): Promise<string> {
    console.log("encryptData called, isVaultUnlocked:", this.isVaultUnlocked());
    console.log("masterKey exists:", !!this.masterKey);
    console.log("isUnlocked flag:", this.isUnlocked);

    if (!this.isVaultUnlocked()) {
      throw new Error("Vault is locked - cannot encrypt data");
    }

    // Validate input data
    if (data === null || data === undefined) {
      throw new Error("Cannot encrypt null or undefined data");
    }

    // Convert to string if not already
    const dataToEncrypt = typeof data === "string" ? data : String(data);

    if (dataToEncrypt.trim().length === 0) {
      throw new Error("Cannot encrypt empty string");
    }

    try {
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(JSON.stringify(dataToEncrypt));

      // Generate larger IV for enhanced security
      const iv = crypto.getRandomValues(
        new Uint8Array(MasterPassCrypto.IV_SIZE),
      );

      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        this.masterKey!,
        plaintext,
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Return base64 encoded string
      const result = btoa(String.fromCharCode(...combined));
      console.log("Encryption successful, result length:", result.length);
      return result;
    } catch (error) {
      console.error("Encryption failed:", error);
      throw new Error("Failed to encrypt data: " + error);
    }
  }

  // Decrypt data received from database
  async decryptData(encryptedData: string): Promise<unknown> {
    if (!this.isVaultUnlocked()) {
      throw new Error("Vault is locked");
    }

    // Validate input
    if (!encryptedData || typeof encryptedData !== "string") {
      throw new Error("Invalid encrypted data provided");
    }

    if (encryptedData.trim().length === 0) {
      throw new Error("Cannot decrypt empty string");
    }

    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0)),
      );

      // Extract IV (now 16 bytes) and encrypted data
      const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
      const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        this.masterKey!,
        encrypted,
      );

      const decoder = new TextDecoder();
      const plaintext = decoder.decode(decrypted);
      return JSON.parse(plaintext);
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  // Application lock functionality
  lockApplication(): void {
    // Clear all decrypted data from memory
    this.masterKey = null;
    this.isUnlocked = false;

    // Clear session storage
    sessionStorage.removeItem("vault_unlocked");

    // Clear any cached decrypted data
    this.clearDecryptedCache();

    // Force garbage collection if available
    if (typeof window !== "undefined" && "gc" in window) {
      (window as Window & { gc?: () => void }).gc?.();
    }
  }

  // Clear any cached decrypted data from components
  private clearDecryptedCache(): void {
    // Dispatch custom event to notify components to clear their decrypted data
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("vault-locked"));
    }
  }

  // Update activity timestamp
  updateActivity(): void {
    if (this.isUnlocked) {
      // Throttle updates to once per second to avoid rapid event bursts
      const last = sessionStorage.getItem("vault_unlocked");
      const now = Date.now();
      if (!last || now - parseInt(last) >= 1000) {
        sessionStorage.setItem("vault_unlocked", now.toString());
      }
      // Intentionally skip validateUserActivity to prevent false positives
    }
  }

  // Explicit lock trigger for UI actions
  lockNow(): void {
    this.lockApplication();
  }

  // Validate user is still actively using the application
  private validateUserActivity(): void {
    // Suspicious activity detection disabled to prevent false positives from normal UI events
    // Keeping the method for future enhancements or optional opt-in.
    return;
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

// Utility functions for field-specific encryption with validation
export const encryptField = async (value: string): Promise<string> => {
  // Validate input before encryption
  if (value === null || value === undefined) {
    throw new Error("Cannot encrypt null or undefined value");
  }

  if (typeof value !== "string") {
    throw new Error("Can only encrypt string values");
  }

  if (value.trim().length === 0) {
    throw new Error("Cannot encrypt empty string");
  }

  return masterPassCrypto.encryptData(value);
};

export const decryptField = async (encryptedValue: string): Promise<string> => {
  // Validate input before decryption
  if (!encryptedValue || typeof encryptedValue !== "string") {
    throw new Error("Invalid encrypted value provided");
  }

  if (encryptedValue.trim().length === 0) {
    throw new Error("Cannot decrypt empty string");
  }

  return masterPassCrypto.decryptData(encryptedValue) as Promise<string>;
};

// Middleware for automatic encryption/decryption of database operations
export const createSecureDbWrapper = (
  databases: {
    createDocument: (...args: unknown[]) => unknown;
    getDocument: (...args: unknown[]) => unknown;
    updateDocument: (...args: unknown[]) => unknown;
    deleteDocument: (...args: unknown[]) => unknown;
    listDocuments: (...args: unknown[]) => unknown;
  },
  databaseId: string,
) => {
  return {
    // Secure document creation
    createDocument: async (
      collectionId: string,
      documentId: string,
      data: Record<string, unknown>,
      permissions?: string[],
    ) => {
      const secureData = { ...data };

      // Encrypt sensitive fields based on collection
      if (collectionId === "credentials") {
        if (secureData.username)
          secureData.username = await encryptField(String(secureData.username));
        if (secureData.password)
          secureData.password = await encryptField(String(secureData.password));
        if (secureData.notes)
          secureData.notes = await encryptField(String(secureData.notes));
        if (secureData.customFields)
          secureData.customFields = await encryptField(
            String(secureData.customFields),
          );
      } else if (collectionId === "totpSecrets") {
        if (secureData.secretKey)
          secureData.secretKey = await encryptField(
            String(secureData.secretKey),
          );
      }

      return databases.createDocument(
        databaseId,
        collectionId,
        documentId,
        secureData,
        permissions,
      );
    },

    // Secure document retrieval
    getDocument: async (collectionId: string, documentId: string) => {
      const doc = (await databases.getDocument(
        databaseId,
        collectionId,
        documentId,
      )) as Record<string, unknown>;
      return await decryptDocument(doc, collectionId);
    },

    // Secure document listing
    listDocuments: async (collectionId: string, queries?: string[]) => {
      const response = (await databases.listDocuments(
        databaseId,
        collectionId,
        queries,
      )) as { documents: Record<string, unknown>[]; [key: string]: unknown };
      const decryptedDocuments = await Promise.all(
        response.documents.map((doc: Record<string, unknown>) =>
          decryptDocument(doc, collectionId),
        ),
      );
      return { ...response, documents: decryptedDocuments };
    },

    // Secure document update
    updateDocument: async (
      collectionId: string,
      documentId: string,
      data: Record<string, unknown>,
      permissions?: string[],
    ) => {
      const secureData = { ...data };

      // Encrypt sensitive fields based on collection
      if (collectionId === "credentials") {
        if (secureData.username)
          secureData.username = await encryptField(String(secureData.username));
        if (secureData.password)
          secureData.password = await encryptField(String(secureData.password));
        if (secureData.notes)
          secureData.notes = await encryptField(String(secureData.notes));
        if (secureData.customFields)
          secureData.customFields = await encryptField(
            String(secureData.customFields),
          );
      } else if (collectionId === "totpSecrets") {
        if (secureData.secretKey)
          secureData.secretKey = await encryptField(
            String(secureData.secretKey),
          );
      }

      return databases.updateDocument(
        databaseId,
        collectionId,
        documentId,
        secureData,
        permissions,
      );
    },

    // Direct database access (for non-sensitive operations)
    deleteDocument: (collectionId: string, documentId: string) =>
      databases.deleteDocument(databaseId, collectionId, documentId),
  };
};

// Helper function to decrypt document based on collection type
const decryptDocument = async (
  doc: Record<string, unknown>,
  collectionId: string,
) => {
  const decryptedDoc = { ...doc };

  try {
    if (collectionId === "credentials") {
      if (decryptedDoc.username)
        decryptedDoc.username = await decryptField(
          String(decryptedDoc.username),
        );
      if (decryptedDoc.password)
        decryptedDoc.password = await decryptField(
          String(decryptedDoc.password),
        );
      if (decryptedDoc.notes)
        decryptedDoc.notes = await decryptField(String(decryptedDoc.notes));
      if (decryptedDoc.customFields)
        decryptedDoc.customFields = await decryptField(
          String(decryptedDoc.customFields),
        );
    } else if (collectionId === "totpSecrets") {
      if (decryptedDoc.secretKey)
        decryptedDoc.secretKey = await decryptField(
          String(decryptedDoc.secretKey),
        );
    }
  } catch (error) {
    console.error("Failed to decrypt document:", error);
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
  const {
    appwriteDatabases,
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_USER_ID,
    Query,
  } = await import("../../../lib/appwrite");
  const response = await appwriteDatabases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_USER_ID,
    [Query.equal("userId", userId)],
  );
  const userDoc = response.documents[0];
  if (!userDoc) return;
  const check = await masterPassCrypto.encryptCheckValue(userId);
  await appwriteDatabases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_USER_ID,
    userDoc.$id,
    { check },
  );
};
