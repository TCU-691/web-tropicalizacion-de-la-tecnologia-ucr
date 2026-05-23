export type NotifyPayload =
  | { type: 'tour'; id: string; title: string; description: string; slug: string; date: string; location: string }
  | { type: 'article'; id: string; title: string; description: string }
  | { type: 'project'; id: string; title: string; description: string; slug: string };
