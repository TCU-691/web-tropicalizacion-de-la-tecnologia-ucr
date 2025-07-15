
import { getUploadAuthParams } from "@imagekit/next/server";
import { randomUUID } from "crypto";
import { type NextRequest } from "next/server";

// This tells Next.js to always run this route dynamically, preventing caching.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Optional: Implement your own application logic to authenticate the user
    // For example, you can check if the user is logged in or has the necessary permissions
    // If the user is not authenticated, you can return an error response

    if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_PUBLIC_KEY) {
        console.error("ImageKit private or public key is not set in environment variables.");
        return Response.json({ error: "ImageKit keys not configured on server." }, { status: 500 });
    }

    // Generate a unique token for each authentication request.
    // This is crucial to prevent "token has been used before" errors.
    const token = randomUUID();

    const params = getUploadAuthParams({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string, // Never expose this on client side
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
        token: token,
        // expire: 30 * 60, // Optional: Controls the expiry time of the token in seconds, defaults to 1 hour
    });

    return Response.json({
      ...params,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    });
}
