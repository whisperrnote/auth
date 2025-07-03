import { Client, Account, Databases, ID, Query } from "appwrite";

// --- Appwrite Client Setup ---
const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const appwriteAccount = new Account(appwriteClient);
const appwriteDatabases = new Databases(appwriteClient);

// --- Database & Collection IDs (from database.md & .env) ---
export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "passwordManagerDb";
export const APPWRITE_COLLECTION_CREDENTIALS_ID = process.env.APPWRITE_COLLECTION_CREDENTIALS_ID || "credentials";
export const APPWRITE_COLLECTION_TOTPSECRETS_ID = process.env.APPWRITE_COLLECTION_TOTPSECRETS_ID || "totpSecrets";
export const APPWRITE_COLLECTION_FOLDERS_ID = process.env.APPWRITE_COLLECTION_FOLDERS_ID || "folders";
export const APPWRITE_COLLECTION_SECURITYLOGS_ID = process.env.APPWRITE_COLLECTION_SECURITYLOGS_ID || "securityLogs";
export const APPWRITE_COLLECTION_USER_ID = process.env.APPWRITE_COLLECTION_USER_ID || "user";

// --- Collection Structure & Field Mappings ---
// These must match appwrite.json and database.md exactly
export const COLLECTION_SCHEMAS = {
  credentials: {
    encrypted: ['username', 'password', 'notes', 'customFields'],
    plaintext: [
      'userId',
      'name',
      'url',
      'folderId',
      'tags',
      'faviconUrl',
      'createdAt',
      'updatedAt'
    ]
  },
  totpSecrets: {
    encrypted: ['secretKey'],
    plaintext: [
      'userId',
      'issuer',
      'accountName',
      'algorithm',
      'digits',
      'period',
      'folderId',
      'createdAt',
      'updatedAt'
    ]
  },
  folders: {
    encrypted: [],
    plaintext: [
      'userId',
      'name',
      'parentFolderId',
      'createdAt',
      'updatedAt'
    ]
  },
  securityLogs: {
    encrypted: [],
    plaintext: [
      'userId',
      'eventType',
      'ipAddress',
      'userAgent',
      'details',
      'timestamp'
    ]
  },
  user: {
    encrypted: [],
    plaintext: [
      'userId',
      'email',
      'masterpass'
    ]
  }
};

// --- Type Definitions ---
// All fields and types below are consistent with appwrite.json and database.md

export interface Credential {
  $id?: string;
  userId: string;
  name: string;
  url?: string;
  username: string;
  password: string;
  notes?: string;
  folderId?: string;
  tags?: string[];
  customFields?: string;
  faviconUrl?: string;
  createdAt?: string; // datetime, auto
  updatedAt?: string; // datetime, auto
  $createdAt?: string;
  $updatedAt?: string;
}

export interface TOTPSecret {
  $id?: string;
  userId: string;
  issuer: string;
  accountName: string;
  secretKey: string;
  algorithm?: string; // default "SHA1"
  digits?: number; // default 6
  period?: number; // default 30
  folderId?: string;
  createdAt?: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface Folder {
  $id?: string;
  userId: string;
  name: string;
  parentFolderId?: string;
  createdAt?: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export interface SecurityLog {
  $id?: string;
  userId: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  timestamp: string;
}

export interface UserDoc {
  $id?: string;
  userId: string;
  email: string;
  masterpass?: boolean;
}

// --- Notes ---
// - All collection and attribute names match appwrite.json exactly.
// - All types, required/optional fields, and encrypted fields are consistent with the schema.
// - Indexes and relationships are not represented in code, but all keys and types are correct.
// - If you add or change attributes in appwrite.json, update these interfaces and COLLECTION_SCHEMAS accordingly.

// --- Secure CRUD Operations ---
export class AppwriteService {
  // Create with automatic encryption
  static async createCredential(data: Omit<Credential, '$id' | '$createdAt' | '$updatedAt'>): Promise<Credential> {
    const encryptedData = await this.encryptDocumentFields(data, 'credentials');
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      ID.unique(),
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async createTOTPSecret(data: Omit<TOTPSecret, '$id' | '$createdAt' | '$updatedAt'>): Promise<TOTPSecret> {
    const encryptedData = await this.encryptDocumentFields(data, 'totpSecrets');
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      ID.unique(),
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async createFolder(data: Omit<Folder, '$id' | '$createdAt' | '$updatedAt'>): Promise<Folder> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      ID.unique(),
      data
    );
    // Explicitly cast/convert the returned Document to Folder type
    return {
      $id: doc.$id,
      userId: doc.userId,
      name: doc.name,
      parentFolderId: doc.parentFolderId,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt,
    };
  }

  static async createSecurityLog(data: Omit<SecurityLog, '$id'>): Promise<SecurityLog> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      ID.unique(),
      data
    );
    // Explicitly map the returned document to SecurityLog type
    return {
      $id: doc.$id,
      userId: doc.userId,
      eventType: doc.eventType,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      details: doc.details,
      timestamp: doc.timestamp,
    };
  }

  static async createUserDoc(data: Omit<UserDoc, '$id'>): Promise<UserDoc> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      ID.unique(),
      data
    );
    // Explicitly map the returned document to UserDoc type
    return {
      $id: doc.$id,
      userId: doc.userId,
      email: doc.email,
      masterpass: doc.masterpass,
    };
  }

  // Read with automatic decryption
  static async getCredential(id: string): Promise<Credential> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async getTOTPSecret(id: string): Promise<TOTPSecret> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async getFolder(id: string): Promise<Folder> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id
    );
    return {
      $id: doc.$id,
      userId: doc.userId,
      name: doc.name,
      parentFolderId: doc.parentFolderId,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt,
    };
  }

  static async getUserDoc(userId: string): Promise<UserDoc | null> {
    try {
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal('userId', userId)]
      );
      const doc = response.documents[0];
      if (!doc) return null;
      return {
        $id: doc.$id,
        userId: doc.userId,
        email: doc.email,
        masterpass: doc.masterpass,
      };
    } catch (error) {
      return null;
    }
  }

  static async getSecurityLog(id: string): Promise<SecurityLog> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id
    );
    return {
      $id: doc.$id,
      userId: doc.userId,
      eventType: doc.eventType,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      details: doc.details,
      timestamp: doc.timestamp,
    };
  }

  // List with automatic decryption
  static async listCredentials(userId: string, queries: string[] = []): Promise<Credential[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    return await Promise.all(
      response.documents.map((doc: any) => this.decryptDocumentFields(doc, 'credentials'))
    );
  }

  static async listTOTPSecrets(userId: string, queries: string[] = []): Promise<TOTPSecret[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    return await Promise.all(
      response.documents.map((doc: any) => this.decryptDocumentFields(doc, 'totpSecrets'))
    );
  }

  static async listFolders(userId: string, queries: string[] = []): Promise<Folder[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    // Explicitly map each document to Folder type
    return response.documents.map((doc: any) => ({
      $id: doc.$id,
      userId: doc.userId,
      name: doc.name,
      parentFolderId: doc.parentFolderId,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt,
    }));
  }

  static async listSecurityLogs(userId: string, queries: string[] = []): Promise<SecurityLog[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      [Query.equal('userId', userId), Query.orderDesc('timestamp'), ...queries]
    );
    // Explicitly map each document to SecurityLog type
    return response.documents.map((doc: any) => ({
      $id: doc.$id,
      userId: doc.userId,
      eventType: doc.eventType,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      details: doc.details,
      timestamp: doc.timestamp,
    }));
  }

  // Update with automatic encryption
  static async updateCredential(id: string, data: Partial<Credential>): Promise<Credential> {
    const encryptedData = await this.encryptDocumentFields(data, 'credentials');
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id,
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async updateTOTPSecret(id: string, data: Partial<TOTPSecret>): Promise<TOTPSecret> {
    const encryptedData = await this.encryptDocumentFields(data, 'totpSecrets');
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id,
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async updateFolder(id: string, data: Partial<Folder>): Promise<Folder> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id,
      data
    );
    return {
      $id: doc.$id,
      userId: doc.userId,
      name: doc.name,
      parentFolderId: doc.parentFolderId,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt,
    };
  }

  static async updateUserDoc(id: string, data: Partial<UserDoc>): Promise<UserDoc> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      id,
      data
    );
    return {
      $id: doc.$id,
      userId: doc.userId,
      email: doc.email,
      masterpass: doc.masterpass,
    };
  }

  static async updateSecurityLog(id: string, data: Partial<SecurityLog>): Promise<SecurityLog> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id,
      data
    );
    return {
      $id: doc.$id,
      userId: doc.userId,
      eventType: doc.eventType,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      details: doc.details,
      timestamp: doc.timestamp,
    };
  }

  // Delete operations
  static async deleteCredential(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id
    );
  }

  static async deleteTOTPSecret(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id
    );
  }

  static async deleteFolder(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id
    );
  }

  // --- Security Event Logging ---
  static async logSecurityEvent(
    userId: string,
    eventType: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createSecurityLog({
      userId,
      eventType,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  // --- Encryption/Decryption Helpers ---
  private static async encryptDocumentFields(data: any, collectionType: keyof typeof COLLECTION_SCHEMAS): Promise<any> {
    const schema = COLLECTION_SCHEMAS[collectionType];
    const result = { ...data };

    // Import encryption function from master password logic
    const { encryptField } = await import('../app/(protected)/masterpass/logic');

    for (const field of schema.encrypted) {
      if (result[field] !== undefined && result[field] !== null && result[field] !== '') {
        try {
          result[field] = await encryptField(result[field]);
        } catch (error) {
          console.error(`Failed to encrypt field ${field}:`, error);
          throw new Error(`Encryption failed for ${field}`);
        }
      }
    }

    return result;
  }

  private static async decryptDocumentFields(doc: any, collectionType: keyof typeof COLLECTION_SCHEMAS): Promise<any> {
    const schema = COLLECTION_SCHEMAS[collectionType];
    const result = { ...doc };

    // Import decryption function from master password logic
    const { decryptField } = await import('../app/(protected)/masterpass/logic');

    for (const field of schema.encrypted) {
      if (result[field] !== undefined && result[field] !== null && result[field] !== '') {
        try {
          result[field] = await decryptField(result[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Return original value as fallback
          result[field] = '[DECRYPTION_FAILED]';
        }
      }
    }

    return result;
  }

  // --- Search Operations ---
  static async searchCredentials(userId: string, searchTerm: string): Promise<Credential[]> {
    // Note: Due to encryption, we need to fetch all and filter locally
    const allCredentials = await this.listCredentials(userId);
    const term = searchTerm.toLowerCase();
    
    return allCredentials.filter(cred => 
      cred.name.toLowerCase().includes(term) ||
      cred.username.toLowerCase().includes(term) ||
      (cred.url && cred.url.toLowerCase().includes(term))
    );
  }

  // --- Bulk Operations ---
  static async bulkCreateCredentials(credentials: Omit<Credential, '$id' | '$createdAt' | '$updatedAt'>[]): Promise<Credential[]> {
    return await Promise.all(credentials.map(cred => this.createCredential(cred)));
  }

  static async exportUserData(userId: string): Promise<{
    credentials: Credential[];
    totpSecrets: TOTPSecret[];
    folders: Folder[];
  }> {
    const [credentials, totpSecrets, folders] = await Promise.all([
      this.listCredentials(userId),
      this.listTOTPSecrets(userId),
      this.listFolders(userId)
    ]);

    return { credentials, totpSecrets, folders };
  }
}

// --- Export everything ---
export {
  appwriteClient,
  appwriteAccount,
  appwriteDatabases,
  ID,
  Query,
};

// --- Collection Structure Reference ---
// Credentials: userId, name, url, username(E), password(E), notes(E), folderId, tags, customFields(E), faviconUrl
// TOTPSecrets: userId, issuer, accountName, secretKey(E), algorithm, digits, period, folderId
// Folders: userId, name, parentFolderId
// SecurityLogs: userId, eventType, ipAddress, userAgent, details, timestamp
// User: userId, email, masterpass
// (E) = Encrypted field
// (E) = Encrypted field
