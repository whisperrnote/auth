import { Models } from 'appwrite';

export type Credentials = Models.Document & {
  userId: string;
  name: string;
  url: string | null;
  username: string;
  notes: string | null;
  folderId: string | null;
  tags: string[] | null;
  customFields: string | null;
  faviconUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  password: string;
}

export type TotpSecrets = Models.Document & {
  userId: string;
  issuer: string;
  accountName: string;
  secretKey: string;
  folderId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  algorithm: string | null;
  digits: number | null;
  period: number | null;
}

export type Folders = Models.Document & {
  userId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type SecurityLogs = Models.Document & {
  userId: string;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  timestamp: string;
}

export type User = Models.Document & {
  masterpass: boolean | null;
  userId: string;
  email: string | null;
  twofa: boolean | null;
  check: string | null;
}

