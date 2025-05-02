import { ReadableStreamDefaultController } from 'stream/web';

/**
 * Helper to send a Server-Sent Event (SSE) to the client
 * @param controller Stream controller to send the event through
 * @param event Event type
 * @param data Event data
 */
export function sseSend(
  controller: ReadableStreamDefaultController,
  event: string,
  data: string
): void {
  // Replace CRLF with newline for safe transmission
  const safeData = data.replace(/(\r\n|\n|\r)/g, '\n');

  const payload = `event: ${event}
data: ${safeData}

`;

  controller.enqueue(new TextEncoder().encode(payload));
}
