import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client, Account, Databases, Query } from 'appwrite';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

// Initialize Appwrite client
const appwriteClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const origin = process.env.NEXT_PUBLIC_RP_ORIGIN || `https://${rpID}`;

export async function POST(request: Request) {
    try {
        const body: AuthenticationResponseJSON = await request.json();

        const cookieStore = await cookies();
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

        if (!userDoc || !userDoc.isPasskey || !userDoc.credentialId) {
            return NextResponse.json({ error: 'No passkeys found for user' }, { status: 400 });
        }

        if (!userDoc.passkeyChallenge) {
            return NextResponse.json({ error: 'No challenge found for user' }, { status: 400 });
        }

        if (userDoc.credentialId !== body.id) {
            return NextResponse.json({ error: 'Credential not found for user' }, { status: 404 });
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: userDoc.passkeyChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(userDoc.credentialId, 'base64'),
                credentialPublicKey: Buffer.from(userDoc.publicKey!, 'base64'),
                counter: userDoc.counter!,
                transports: [],
            },
            requireUserVerification: true,
        });

        const { verified, authenticationInfo } = verification;

        if (verified) {
            const { newCounter } = authenticationInfo;

            await databases.updateDocument(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_COLLECTION_USER_ID!,
                userDoc.$id,
                {
                    counter: newCounter,
                    passkeyChallenge: null, // Clear the challenge
                }
            );

            return NextResponse.json({ verified: true });
        }

        return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
    } catch (error: any) {
        console.error('Passkey login verification failed:', error);
        return NextResponse.json({ verified: false, error: error.message }, { status: 500 });
    }
}
