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

        if (!userDoc || !userDoc.passkeys || userDoc.passkeys.length === 0) {
            return NextResponse.json({ error: 'No passkeys found for user' }, { status: 400 });
        }

        if (!userDoc.passkeyChallenge) {
            return NextResponse.json({ error: 'No challenge found for user' }, { status: 400 });
        }

        const credential = userDoc.passkeys.find((p: any) => p.credentialID === body.id);

        if (!credential) {
            return NextResponse.json({ error: 'Credential not found for user' }, { status: 404 });
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: userDoc.passkeyChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(credential.credentialID, 'base64'),
                credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
                counter: credential.counter,
                transports: credential.transports,
            },
            requireUserVerification: true,
        });

        const { verified, authenticationInfo } = verification;

        if (verified) {
            const { newCounter } = authenticationInfo;
            const updatedPasskeys = userDoc.passkeys.map((p: any) =>
                p.credentialID === body.id ? { ...p, counter: newCounter } : p
            );

            await databases.updateDocument(
                process.env.APPWRITE_DATABASE_ID!,
                process.env.APPWRITE_COLLECTION_USER_ID!,
                userDoc.$id,
                {
                    passkeys: updatedPasskeys,
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
