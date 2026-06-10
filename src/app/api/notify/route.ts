import { NextRequest, NextResponse } from 'next/server';
import { postToTeams } from '@/lib/notifications';
import { NotifyPayload } from '@/types/notification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate that type is one of the allowed values
    const validTypes = ['tour', 'article', 'project'];
    if (!body.type || !validTypes.includes(body.type)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Call postToTeams (it swallows errors internally)
    await postToTeams(body as NotifyPayload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in /api/notify:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
