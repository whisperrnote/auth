import { Client, Account, Databases, ID, Query } from "appwrite";
import type { Credentials, TotpSecrets, Folders, SecurityLogs, User } from "@/types/appwrite.d";

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

// --- Secure CRUD Operations ---
export class AppwriteService {
  // Create with automatic encryption
  static async createCredential(data: Omit<Credentials, '$id' | '$createdAt' | '$updatedAt'>): Promise<Credentials> {
    const encryptedData = await this.encryptDocumentFields(data, 'credentials');
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      ID.unique(),
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async createTOTPSecret(data: Omit<TotpSecrets, '$id' | '$createdAt' | '$updatedAt'>): Promise<TotpSecrets> {
    const encryptedData = await this.encryptDocumentFields(data, 'totpSecrets');
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      ID.unique(),
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async createFolder(data: Omit<Folders, '$id' | '$createdAt' | '$updatedAt'>): Promise<Folders> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      ID.unique(),
      data
    );
    return doc as Folders;
  }

  static async createSecurityLog(data: Omit<SecurityLogs, '$id'>): Promise<SecurityLogs> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      ID.unique(),
      data
    );
    return doc as SecurityLogs;
  }

  static async createUserDoc(data: Omit<User, '$id'>): Promise<User> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      ID.unique(),
      data
    );
    return doc as User;
  }

  /**
   * Checks if the user has set up a master password (returns true if present in DB).
   */
  static async hasMasterpass(userId: string): Promise<boolean> {
    const userDoc = await this.getUserDoc(userId);
    return !!(userDoc && userDoc.masterpass === true);
  }

  /**
   * Sets the masterpass flag for the user in the database.
   * If the user doc exists, updates it; otherwise, creates it.
   */
  static async setMasterpassFlag(userId: string, email: string): Promise<void> {
    const userDoc = await this.getUserDoc(userId);
    if (userDoc && userDoc.$id) {
      await this.updateUserDoc(userDoc.$id, { masterpass: true });
    } else {
      await this.createUserDoc({
        userId,
        email,
        masterpass: true,
      });
    }
  }

  // Read with automatic decryption
  static async getCredential(id: string): Promise<Credentials> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async getTOTPSecret(id: string): Promise<TotpSecrets> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async getFolder(id: string): Promise<Folders> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id
    );
    return doc as Folders;
  }

  static async getUserDoc(userId: string): Promise<User | null> {
    try {
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal('userId', userId)]
      );
      const doc = response.documents[0];
      if (!doc) return null;
      return doc as User;
    } catch (error) {
      return null;
    }
  }

  static async getSecurityLog(id: string): Promise<SecurityLogs> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id
    );
    return doc as SecurityLogs;
  }

  // List with automatic decryption
  static async listCredentials(userId: string, queries: string[] = []): Promise<Credentials[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    return await Promise.all(
      response.documents.map((doc: any) => this.decryptDocumentFields(doc, 'credentials'))
    );
  }

  static async listTOTPSecrets(userId: string, queries: string[] = []): Promise<TotpSecrets[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    return await Promise.all(
      response.documents.map((doc: any) => this.decryptDocumentFields(doc, 'totpSecrets'))
    );
  }

  static async listFolders(userId: string, queries: string[] = []): Promise<Folders[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    return response.documents as Folders[];
  }

  static async listSecurityLogs(userId: string, queries: string[] = []): Promise<SecurityLogs[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      [Query.equal('userId', userId), Query.orderDesc('timestamp'), ...queries]
    );
    return response.documents as SecurityLogs[];
  }

  // Update with automatic encryption
  static async updateCredential(id: string, data: Partial<Credentials>): Promise<Credentials> {
    const encryptedData = await this.encryptDocumentFields(data, 'credentials');
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id,
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async updateTOTPSecret(id: string, data: Partial<TotpSecrets>): Promise<TotpSecrets> {
    const encryptedData = await this.encryptDocumentFields(data, 'totpSecrets');
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id,
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async updateFolder(id: string, data: Partial<Folders>): Promise<Folders> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id,
      data
    );
    return doc as Folders;
  }

  static async updateUserDoc(id: string, data: Partial<User>): Promise<User> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      id,
      data
    );
    return doc as User;
  }

  static async updateSecurityLog(id: string, data: Partial<SecurityLogs>): Promise<SecurityLogs> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id,
      data
    );
    return doc as SecurityLogs;
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
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      timestamp: new Date().toISOString()
    });
  }

  // --- Encryption/Decryption Helpers ---
  private static async encryptDocumentFields(data: any, collectionType: keyof typeof COLLECTION_SCHEMAS): Promise<any> {
    const schema = COLLECTION_SCHEMAS[collectionType];
    const result = { ...data };

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

    const { decryptField } = await import('../app/(protected)/masterpass/logic');

    for (const field of schema.encrypted) {
      if (result[field] !== undefined && result[field] !== null && result[field] !== '') {
        try {
          result[field] = await decryptField(result[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          result[field] = '[DECRYPTION_FAILED]';
        }
      }
    }

    return result;
  }

  // --- Search Operations ---
  static async searchCredentials(userId: string, searchTerm: string): Promise<Credentials[]> {
    const allCredentials = await this.listCredentials(userId);
    const term = searchTerm.toLowerCase();

    return allCredentials.filter(cred =>
      cred.name?.toLowerCase().includes(term) ||
      cred.username?.toLowerCase().includes(term) ||
      (cred.url && cred.url.toLowerCase().includes(term))
    );
  }

  // --- Bulk Operations ---
  static async bulkCreateCredentials(credentials: Omit<Credentials, '$id' | '$createdAt' | '$updatedAt'>[]): Promise<Credentials[]> {
    return await Promise.all(credentials.map(cred => this.createCredential(cred)));
  }

  static async exportUserData(userId: string): Promise<{
    credentials: Credentials[];
    totpSecrets: TotpSecrets[];
    folders: Folders[];
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