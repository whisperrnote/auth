import { Client, Account, Databases, ID } from "appwrite";

const appwriteClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const appwriteAccount = new Account(appwriteClient);
const appwriteDatabases = new Databases(appwriteClient);

export {
  appwriteClient,
  appwriteAccount,
  appwriteDatabases,
  ID,
};
