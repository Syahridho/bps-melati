import type { ChatMessage } from '@/components/ui/chat-thread';

/**
 * Transform raw response items from various ticket sources into ChatMessage[].
 * The decision for `side` (officer vs reporter) is based on the presence of
 * `is_reporter`, `type` containing 'pelapor', or the sender name not matching
 * known officer roles. Adjust the heuristics if the actual data shape changes.
 */
export function transformResponses(responses: any[]): ChatMessage[] {
  return responses.map((r) => {
    // Heuristic: treat as reporter when explicitly marked or type indicates reporter
    const isReporter =
      r.is_reporter === true ||
      (r.type && r.type.includes('pelapor')) ||
      (r.user_name && !/admin|operator/i.test(r.user_name));

    const side: 'officer' | 'reporter' = isReporter ? 'reporter' : 'officer';

    return {
      id: r.id,
      side,
      senderName: r.user_name ?? r.name ?? 'Unknown',
      badge: r.type
        ? { label: r.type.replace(/_/g, ' ') }
        : undefined,
      body: r.message,
      createdAt: r.sent_at ?? r.created_at,
      meta: r.email_status
        ? { label: r.email_status }
        : undefined,
      attachments: r.attachments ?? [],
    } as ChatMessage;
  });
}