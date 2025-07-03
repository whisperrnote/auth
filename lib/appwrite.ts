import { Client, Account, Databases, ID } from "appwrite";

// --- Appwrite Client Setup ---
const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const appwriteAccount = new Account(appwriteClient);
const appwriteDatabases = new Databases(appwriteClient);

// --- Database & Collection IDs (from database.md & .env) ---
export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "passwordManagerDb";

// Credentials
export const APPWRITE_COLLECTION_CREDENTIALS_ID = process.env.APPWRITE_COLLECTION_CREDENTIALS_ID || "credentials";
// TOTP Secrets
export const APPWRITE_COLLECTION_TOTPSECRETS_ID = process.env.APPWRITE_COLLECTION_TOTPSECRETS_ID || "totpSecrets";
// Folders
export const APPWRITE_COLLECTION_FOLDERS_ID = process.env.APPWRITE_COLLECTION_FOLDERS_ID || "folders";
// Security Logs
export const APPWRITE_COLLECTION_SECURITYLOGS_ID = process.env.APPWRITE_COLLECTION_SECURITYLOGS_ID || "securityLogs";

// --- Export Appwrite SDK objects ---
export {
  appwriteClient,
  appwriteAccount,
  appwriteDatabases,
  ID,
};

// --- Collection Structure Reference ---
// Credentials: userId, name, url, username, password, notes, folderId, tags, customFields, faviconUrl, createdAt, updatedAt
// TOTPSecrets: userId, issuer, accountName, secretKey, algorithm, digits, period, folderId, createdAt, updatedAt
// Folders: userId, name, parentFolderId, createdAt, updatedAt
// SecurityLogs: userId, eventType, ipAddress, userAgent, details, timestamp
