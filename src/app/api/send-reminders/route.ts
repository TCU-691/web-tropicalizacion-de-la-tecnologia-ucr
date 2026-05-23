import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { postToTeams } from '@/lib/notifications';
import type { FirestoreTour } from '@/types/tour';

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!db) {
      return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });
    }

    // Compute target date: today + 7 days in YYYY-MM-DD UTC
    const targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Query upcoming tours
    const toursQuery = query(
      collection(db, 'tours'),
      where('status', '==', 'Próximamente')
    );
    const toursSnap = await getDocs(toursQuery);

    let sent = 0;

    for (const tourDoc of toursSnap.docs) {
      const tour = tourDoc.data() as FirestoreTour;

      // Skip tours without a machine-readable date
      if (!tour.dateISO) continue;

      // Skip tours not matching the 7-day window
      if (tour.dateISO !== targetDate) continue;

      // Skip if reminder already sent
      const sentRef = doc(db, 'remindersSent', `${tourDoc.id}_7d`);
      const sentSnap = await getDoc(sentRef);
      if (sentSnap.exists()) continue;

      // Post reminder to Teams
      await postToTeams({
        type: 'tour',
        id: tourDoc.id,
        title: `🗓️ Recordatorio (7 días): ${tour.title}`,
        description: tour.description,
        slug: tour.slug,
        date: tour.date,
        location: tour.location,
      });

      // Mark as sent to prevent duplicates
      await setDoc(sentRef, {
        tourId: tourDoc.id,
        type: 'reminder_7d',
        sentAt: Timestamp.now(),
      });

      sent++;
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error('[send-reminders] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
