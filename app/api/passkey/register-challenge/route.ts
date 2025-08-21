import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account, Databases, Query } from 'appwrite';

// Initialize Appwrite client
const appwriteClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const rpName = 'WhisperAuth';
// Relying Party ID - should be the domain of your application
const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

export async function GET(request: Request) {
    try {
        const cookieStore = cookies();
        const sessionCookieName = `a_session_${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
        const sessionCookie = cookieStore.get(sessionCookieName) || cookieStore.get(`${sessionCookieName}_legacy`);

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

        const existingCredentials = userDoc.passkeys ? userDoc.passkeys.map((p: any) => ({
            id: Buffer.from(p.credentialID, 'base64'),
            type: 'public-key',
            transports: p.transports,
        })) : [];

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: user.$id,
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: existingCredentials,
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                residentKey: 'required',
                userVerification: 'preferred',
            },
            extensions: {
                largeBlob: {
                    support: 'preferred',
                },
            },
        });

        // Store the challenge temporarily in the user's document
        await databases.updateDocument(
            process.env.APPWRITE_DATABASE_ID!,
            process.env.APPWRITE_COLLECTION_USER_ID!,
            userDoc.$id,
            { passkeyChallenge: options.challenge }
        );

        return NextResponse.json(options);
    } catch (error: any) {
        console.error('Passkey registration challenge failed:', error);
        const errorMessage = error.message || 'An unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
