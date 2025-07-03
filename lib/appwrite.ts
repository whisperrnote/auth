import { Client, Account, Databases, ID, Query, AuthenticationFactor } from "appwrite";
import type { Credentials, TotpSecrets, Folders, SecurityLogs, User } from "@/types/appwrite.d";
import { AuthenticatorType } from "appwrite";
import { updateMasterpassCheckValue, masterPassCrypto } from "@/app/(protected)/masterpass/logic";

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
// Dynamically derive encrypted/plaintext fields from the types
const ENCRYPTED_FIELDS = {
  credentials: ['username', 'password', 'notes', 'customFields'],
  totpSecrets: ['secretKey'],
  folders: [],
  securityLogs: [],
  user: [],
} as const;

function getPlaintextFields<T>(allFields: (keyof T)[], encrypted: readonly string[]): string[] {
  return allFields.filter(f => !encrypted.includes(f as string)).map(f => f as string);
}

export const COLLECTION_SCHEMAS = {
  credentials: {
    encrypted: ENCRYPTED_FIELDS.credentials,
    plaintext: getPlaintextFields<Credentials>(
      [
        'userId', 'name', 'url', 'username', 'notes', 'folderId', 'tags', 'customFields',
        'faviconUrl', 'createdAt', 'updatedAt', 'password', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.credentials
    ),
  },
  totpSecrets: {
    encrypted: ENCRYPTED_FIELDS.totpSecrets,
    plaintext: getPlaintextFields<TotpSecrets>(
      [
        'userId', 'issuer', 'accountName', 'secretKey', 'algorithm', 'digits', 'period',
        'folderId', 'createdAt', 'updatedAt', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.totpSecrets
    ),
  },
  folders: {
    encrypted: ENCRYPTED_FIELDS.folders,
    plaintext: getPlaintextFields<Folders>(
      [
        'userId', 'name', 'parentFolderId', 'createdAt', 'updatedAt', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.folders
    ),
  },
  securityLogs: {
    encrypted: ENCRYPTED_FIELDS.securityLogs,
    plaintext: getPlaintextFields<SecurityLogs>(
      [
        'userId', 'eventType', 'ipAddress', 'userAgent', 'details', 'timestamp',
        '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.securityLogs
    ),
  },
  user: {
    encrypted: ENCRYPTED_FIELDS.user,
    plaintext: getPlaintextFields<User>(
      [
        'userId', 'email', 'masterpass', 'twofa', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.user
    ),
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
   * Also sets the encrypted check value.
   */
  static async setMasterpassFlag(userId: string, email: string): Promise<void> {
    const userDoc = await this.getUserDoc(userId);
    if (userDoc && userDoc.$id) {
      await appwriteDatabases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, userDoc.$id, { masterpass: true });
    } else {
      await appwriteDatabases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, ID.unique(), {
        userId,
        email,
        masterpass: true,
      });
    }
    // Set the check value
    await updateMasterpassCheckValue(userId);
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

  static async deleteSecurityLog(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id
    );
  }

  static async deleteUserDoc(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
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

    try {
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
    } catch (error) {
      console.error('Decryption module not available:', error);
      // Return original document if decryption module can't be loaded
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

// --- 2FA / MFA Helpers (Following Official Appwrite Documentation) ---

/**
 * Generate recovery codes - MUST be done before enabling MFA
 * These are single-use passwords for account recovery
 */
export async function generateRecoveryCodes(): Promise<{ recoveryCodes: string[] }> {
  return await appwriteAccount.createMfaRecoveryCodes();
}

/**
 * List enabled MFA factors for current user
 * Returns: { totp: boolean, email: boolean, phone: boolean }
 */
export async function listMfaFactors(): Promise<{ totp: boolean; email: boolean; phone: boolean }> {
  return await appwriteAccount.listMfaFactors();
}

/**
 * Enable/disable MFA enforcement on the account
 * Note: User must have at least 2 factors before MFA is enforced
 */
export async function updateMfaStatus(enabled: boolean): Promise<any> {
  return await appwriteAccount.updateMFA(enabled);
}

/**
 * Add TOTP authenticator factor (does NOT enable MFA yet)
 * Returns QR code URL and secret for authenticator app
 */
export async function addTotpFactor(): Promise<{ qrUrl: string; secret: string }> {
  const result = await appwriteAccount.createMfaAuthenticator(AuthenticatorType.Totp);
  // Appwrite returns 'secret' and 'uri' (not 'qrUrl'), so map accordingly
  return {
    qrUrl: result.uri || "",
    secret: result.secret
  };
}

/**
 * Remove TOTP authenticator factor
 */
// export async function removeTotpFactor(): Promise<void> {
//   return await appwriteAccount.deleteMfaAuthenticator("totp");
// }

export async function removeTotpFactor(): Promise<void> {
  await appwriteAccount.deleteMfaAuthenticator(AuthenticatorType.Totp);
}
/**
 * Verify TOTP factor by creating and completing a challenge
 * This step confirms the authenticator app is working
 */
export async function verifyTotpFactor(otp: string): Promise<boolean> {
  try {
    // Create challenge for TOTP
    const challenge = await appwriteAccount.createMfaChallenge(AuthenticationFactor.Totp);
    // Complete challenge with OTP
    await appwriteAccount.updateMfaChallenge(challenge.$id, otp);
    return true;
  } catch (error) {
    console.error("TOTP verification failed:", error);
    return false;
  }
}

/**
 * Create MFA challenge for login flow
 * factor: "totp" | "email" | "phone" | "recoverycode"
 */
export async function createMfaChallenge(factor: "totp" | "email" | "phone" | "recoverycode"): Promise<{ $id: string }> {
  return await appwriteAccount.createMfaChallenge(AuthenticationFactor.Totp);
}

/**
 * Complete MFA challenge with code
 */
export async function completeMfaChallenge(challengeId: string, code: string): Promise<any> {
  return await appwriteAccount.updateMfaChallenge(challengeId, code);
}

/**
 * Check if user needs MFA after login
 * Throws 'user_more_factors_required' error if MFA is needed
 */
export async function checkMfaRequired(): Promise<any> {
  return await appwriteAccount.get();
}

/**
 * Add Email as an MFA factor (must be verified first).
 * This will send a verification email if not already verified.
 * Returns: { email: string }
 */
export async function addEmailFactor(email: string, password: string): Promise<{ email: string }> {
  // 1. Update email if needed (Appwrite requires a password for this)
  await appwriteAccount.updateEmail(email, password);
  // 2. Send verification email (user must follow link to verify)
  await appwriteAccount.createVerification(window.location.origin + "/verify-email");
  return { email };
}

/**
 * Complete email verification for MFA (after user clicks link in email).
 * Call this with the userId and secret from the verification link.
 */
export async function completeEmailVerification(userId: string, secret: string): Promise<void> {
  await appwriteAccount.updateVerification(userId, secret);
}

/**
 * Initiate password recovery (send reset email).
 * @param email User's email
 * @param redirectUrl URL to redirect after clicking email link (must be allowed in Appwrite console)
 */
export async function createPasswordRecovery(email: string, redirectUrl: string) {
  return await appwriteAccount.createRecovery(email, redirectUrl);
}

/**
 * Complete password recovery (reset password).
 * @param userId User ID from query param
 * @param secret Secret from query param
 * @param password New password
 */
export async function updatePasswordRecovery(userId: string, secret: string, password: string) {
  return await appwriteAccount.updateRecovery(userId, secret, password);
}

// --- Email/password login/register ---

/**
 * Email/password login
 */
export async function loginWithEmailPassword(email: string, password: string) {
  return await appwriteAccount.createEmailPasswordSession(email, password);
}

/**
 * Register with email/password
 */
export async function registerWithEmailPassword(email: string, password: string, name?: string) {
  return await appwriteAccount.create(ID.unique(), email, password, name);
}

/**
 * Email OTP: Send OTP to email (returns { userId, phrase? })
 */
export async function sendEmailOtp(email: string, enablePhrase = false) {
  return await appwriteAccount.createEmailToken(ID.unique(), email, enablePhrase);
}

/**
 * Email OTP: Complete OTP login (returns session)
 */
export async function completeEmailOtp(userId: string, otp: string) {
  return await appwriteAccount.createSession(userId, otp);
}

/**
 * Magic URL: Send magic link to email
 */
export async function sendMagicUrl(email: string, redirectUrl: string) {
  return await appwriteAccount.createMagicURLToken(ID.unique(), email, redirectUrl);
}

/**
 * Magic URL: Complete magic link login (returns session)
 */
export async function completeMagicUrl(userId: string, secret: string) {
  return await appwriteAccount.createSession(userId, secret);
}

// --- Export everything ---
export {
  appwriteClient,
  appwriteAccount,
  appwriteDatabases,
  ID,
  Query,
  // MFA functions
  // generateRecoveryCodes,
  // listMfaFactors,
  // updateMfaStatus,
  // addTotpFactor,
  // removeTotpFactor,
  // verifyTotpFactor,
  // createMfaChallenge,
  // completeMfaChallenge,
  // checkMfaRequired,
};

/**
 * List all TOTP secrets for a user (decrypted).
 */
export async function listTotpSecrets(userId: string) {
  return await AppwriteService.listTOTPSecrets(userId);
}

/**
 * Create a new folder.
 */
export async function createFolder(data: Omit<Folders, '$id' | '$createdAt' | '$updatedAt'>) {
  return await AppwriteService.createFolder(data);
}

/**
 * Create a new TOTP secret (encrypted).
 */
export async function createTotpSecret(data: Omit<TotpSecrets, '$id' | '$createdAt' | '$updatedAt'>) {
  return await AppwriteService.createTOTPSecret(data);
}

/**
 * Delete a TOTP secret by document ID.
 */
export async function deleteTotpSecret(id: string) {
  return await AppwriteService.deleteTOTPSecret(id);
}

/**
 * Update user profile (name/email).
 */
export async function updateUserProfile(userId: string, data: { name?: string; email?: string }) {
  // Update Appwrite account name/email if changed
  if (data.name) await appwriteAccount.updateName(data.name);
  if (data.email) await appwriteAccount.updateEmail(data.email, ""); // Password required if changing email
  // Update user doc in DB if needed
  const userDoc = await AppwriteService.getUserDoc(userId);
  if (userDoc && userDoc.$id) {
    await AppwriteService.updateUserDoc(userDoc.$id, data);
  }
}

/**
 * Export all user data (credentials, totp, folders).
 */
export async function exportAllUserData(userId: string) {
  return await AppwriteService.exportUserData(userId);
}

/**
 * Delete user account and all associated data.
 */
export async function deleteUserAccount(userId: string) {
  // Delete all user data (credentials, totp, folders, logs, user doc)
  const userDoc = await AppwriteService.getUserDoc(userId);
  if (userDoc && userDoc.$id) {
    await AppwriteService.deleteUserDoc(userDoc.$id);
  }
  // Delete credentials, totp, folders, logs
  const [creds, totps, folders, logs] = await Promise.all([
    AppwriteService.listCredentials(userId),
    AppwriteService.listTOTPSecrets(userId),
    AppwriteService.listFolders(userId),
    AppwriteService.listSecurityLogs(userId),
  ]);
  await Promise.all([
    ...creds.map((c) => AppwriteService.deleteCredential(c.$id)),
    ...totps.map((t) => AppwriteService.deleteTOTPSecret(t.$id)),
    ...folders.map((f) => AppwriteService.deleteFolder(f.$id)),
    ...logs.map((l) => AppwriteService.deleteSecurityLog(l.$id)),
  ]);
  // Delete Appwrite account session (log out)
  await appwriteAccount.deleteSession("current");
  // Optionally, delete Appwrite account (irreversible)
  // await appwriteAccount.delete(); // Only if you want to fully remove the user from Appwrite
}

/**
 * Check if user has set master password (returns boolean).
 */
export async function hasMasterpass(userId: string): Promise<boolean> {
  return await AppwriteService.hasMasterpass(userId);
}

/**
 * Set master password flag for user (after first setup).
 */
export async function setMasterpassFlag(userId: string, email: string): Promise<void> {
  return await AppwriteService.setMasterpassFlag(userId, email);
}

/**
 * Reset master password and wipe all user data.
 * This should be called after 2FA/email verification is successful.
 * Also resets the check value.
 */
export async function resetMasterpassAndWipe(userId: string): Promise<void> {
  // Use raw Appwrite database API to avoid decryption
  // Delete user doc
  try {
    const userDocs = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of userDocs.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, doc.$id);
    }
  } catch {}

  // Delete credentials
  try {
    const creds = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of creds.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_CREDENTIALS_ID, doc.$id);
    }
  } catch {}

  // Delete totp secrets
  try {
    const totps = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of totps.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_TOTPSECRETS_ID, doc.$id);
    }
  } catch {}

  // Delete folders
  try {
    const folders = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of folders.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_FOLDERS_ID, doc.$id);
    }
  } catch {}

  // Delete security logs
  try {
    const logs = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of logs.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_SECURITYLOGS_ID, doc.$id);
    }
  } catch {}

  // After reset, set check value to null (or remove it)
  try {
    const userDocs = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of userDocs.documents) {
      await appwriteDatabases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, doc.$id, { check: null });
    }
  } catch {}
}

/**
 * Search credentials for a user (secure, decrypted).
 */
export async function searchCredentials(userId: string, searchTerm: string): Promise<Credentials[]> {
  return await AppwriteService.searchCredentials(userId, searchTerm);
}

/**
 * List all credentials for a user (decrypted).
 */
export async function listCredentials(userId: string) {
  return await AppwriteService.listCredentials(userId);
}

/**
 * Create a new credential (encrypted).
 */
export async function createCredential(data: Omit<Credentials, '$id' | '$createdAt' | '$updatedAt'>) {
  return await AppwriteService.createCredential(data);
}

/**
 * Update a credential by document ID (encrypted).
 */
export async function updateCredential(id: string, data: Partial<Credentials>) {
  return await AppwriteService.updateCredential(id, data);
}

/**
 * Delete a credential by document ID.
 */
export async function deleteCredential(id: string) {
  return await AppwriteService.deleteCredential(id);
}

/**
 * Redirects authenticated users to /masterpass or /dashboard as appropriate.
 */
export async function redirectIfAuthenticated(user: any, isVaultUnlocked: () => boolean, router: any) {
  if (user) {
    const hasMp = await hasMasterpass(user.$id);
    if (!hasMp || !isVaultUnlocked()) {
      router.replace("/masterpass");
      return true;
    } else {
      router.replace("/dashboard");
      return true;
    }
  }
  return false;
}

/**
 * Logs out the current user from Appwrite and clears session/local storage.
 * Use this everywhere for a consistent logout experience.
 */
export async function logoutAppwrite() {
  try {
    await appwriteAccount.deleteSession("current");
  } catch {}
  // Clear vault/session data
  if (typeof window !== "undefined") {
    sessionStorage.clear();
    localStorage.removeItem("vault_timeout_minutes");
    // Optionally clear other app-specific keys here
  }
}