
import { getUploadAuthParams } from "@imagekit/next/server";

export async function GET() {
    // Optional: Implement your own application logic to authenticate the user
    // For example, you can check if the user is logged in or has the necessary permissions
    // If the user is not authenticated, you can return an error response

    if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_PUBLIC_KEY) {
        console.error("ImageKit private or public key is not set in environment variables.");
        return Response.json({ error: "ImageKit keys not configured on server." }, { status: 500 });
    }

    const { token, expire, signature } = getUploadAuthParams({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string, // Never expose this on client side
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
        // token: "random-token", // Optional: You can generate a unique token for each request
        // expire: 30 * 60, // Optional: Controls the expiry time of the token in seconds, defaults to 1 hour
    });

    return Response.json({ token, expire, signature, publicKey: process.env.IMAGEKIT_PUBLIC_KEY });
}
