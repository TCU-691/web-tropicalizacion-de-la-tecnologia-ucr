import { NextRequest, NextResponse } from 'next/server';
import { extractFileIdFromUrl } from '@/lib/imagekit-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testUrl = searchParams.get('url');

    if (!testUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const fileId = extractFileIdFromUrl(testUrl);
    
    return NextResponse.json({
      originalUrl: testUrl,
      extractedFileId: fileId,
      canExtract: !!fileId,
      envVarsConfigured: {
        publicKey: !!process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: !!process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: !!process.env.IMAGEKIT_URL_ENDPOINT
      }
    });

  } catch (error) {
    console.error('Error in test-imagekit API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
