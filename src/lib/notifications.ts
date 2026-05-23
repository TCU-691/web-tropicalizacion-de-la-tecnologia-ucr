import { NotifyPayload } from '@/types/notification';

export async function postToTeams(payload: NotifyPayload): Promise<void> {
  // Return early if Teams webhook is not configured
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  // Build the page URL based on content type
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!siteUrl) {
    console.warn('[notifications] NEXT_PUBLIC_SITE_URL is not set — Teams card links will be broken');
  }
  let pageUrl: string;

  switch (payload.type) {
    case 'tour':
      pageUrl = `${siteUrl}/giras/${payload.slug}`;
      break;
    case 'article':
      pageUrl = `${siteUrl}/anuncios`;
      break;
    case 'project':
      pageUrl = `${siteUrl}/proyectos/${payload.slug}`;
      break;
    default:
      const _exhaustiveCheck: never = payload;
      return _exhaustiveCheck;
  }

  // Build the Teams Adaptive Card
  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              type: 'TextBlock',
              size: 'Medium',
              weight: 'Bolder',
              text: payload.title,
            },
            {
              type: 'TextBlock',
              wrap: true,
              text: payload.description,
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Ver más',
              url: pageUrl,
            },
          ],
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      console.error(
        `Failed to post to Teams: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error('Error posting to Teams:', error);
  }
}
