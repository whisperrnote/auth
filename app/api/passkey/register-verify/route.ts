import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account, Databases, Query } from 'appwrite';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

// Initialize Appwrite client
const appwriteClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const origin = process.env.NEXT_PUBLIC_RP_ORIGIN || `https://${rpID}`;

export async function POST(request: Request) {
    try {
        const body: RegistrationResponseJSON = await request.json();

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

        if (!userDoc || !userDoc.passkeyChallenge) {
            return NextResponse.json({ error: 'No challenge found for user' }, { status: 400 });
        }

        const expectedChallenge = userDoc.passkeyChallenge;

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true,
        });

        const { verified, registrationInfo } = verification;

        if (verified && registrationInfo) {
            // Clear the challenge from the user's document
            await databases.updateDocument(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_COLLECTION_USER_ID!,
                userDoc.$id,
                { passkeyChallenge: null }
            );

            // Return registration info to the client to store
            return NextResponse.json({ verified: true, registrationInfo });
        }

        return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
    } catch (error: any) {
        console.error('Passkey registration verification failed:', error);
        return NextResponse.json({ verified: false, error: error.message }, { status: 500 });
    }
}
