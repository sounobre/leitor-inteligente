import type { ReadingPositionChange } from './study-db';

type SendPosition = (position: ReadingPositionChange) => Promise<boolean>;
type RemovePosition = (position: ReadingPositionChange) => Promise<void>;

/**
 * Sends positions in order and only removes a position after the server accepts it.
 * A failed send stops the batch so the failed item remains available for retry.
 */
export async function syncPendingReadingPositions(
  positions: ReadingPositionChange[],
  send: SendPosition,
  remove: RemovePosition,
) {
  for (const position of positions) {
    if (!await send(position)) throw new Error('Reading position sync failed');
    await remove(position);
  }
}