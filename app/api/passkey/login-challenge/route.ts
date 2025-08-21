import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account, Databases, Query } from 'appwrite';

// Initialize Appwrite client
const appwriteClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookieName = `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
        const sessionCookie = cookieStore.get(sessionCookieName) || cookieStore.get(`${sessionCookieName}_legacy`);

        // No session needed for login challenge if we allow discovering credentials
        // But for this flow, user is already logged in and just unlocking the vault, so session is required.
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        appwriteClient.setSession(sessionCookie.value);
        const account = new Account(appwriteClient);
        const user = await account.get();

        const databases = new Databases(appwriteClient);
        const userDocs = await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_COLLECTION_USER_ID!,
            [Query.equal('userId', user.$id)]
        );
        const userDoc = userDocs.documents[0];

        if (!userDoc) {
            return NextResponse.json({ error: 'User document not found' }, { status: 404 });
        }

        const allowCredentials = userDoc.passkeys ? userDoc.passkeys.map((p: any) => ({
            id: Buffer.from(p.credentialID, 'base64'),
            type: 'public-key',
            transports: p.transports,
        })) : [];

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials,
            userVerification: 'preferred',
            extensions: {
                // largeBlob: {
                //     read: true,
                // },
            } as any,
        });

        // Store the challenge temporarily
        await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_COLLECTION_USER_ID!,
            userDoc.$id,
            { passkeyChallenge: options.challenge }
        );

        return NextResponse.json(options);
    } catch (error: any) {
        console.error('Passkey login challenge failed:', error);
        return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: 500 });
    }
}
