import { storage } from './storage';
import { PENDING_PLAYLIST_OPS_KEY } from '@/context/player/types';
import type { PendingPlaylistOp } from '@/interfaces/Playlist';

let lock: Promise<unknown> = Promise.resolve();

/**
 * Serialises every read-modify-write of the queue. Without it, parallel callers
 * (e.g. adding many songs at once, or enqueueing while a drain is running)
 * overwrite each other's ops and silently lose them.
 */
const withLock = <T>(task: () => Promise<T>): Promise<T> => {
  const run = lock.then(task, task);
  lock = run.catch(() => undefined);
  return run;
};

const read = async (): Promise<PendingPlaylistOp[]> => {
  try {
    const raw = await storage.getItem(PENDING_PLAYLIST_OPS_KEY);
    return raw ? (JSON.parse(raw) as PendingPlaylistOp[]) : [];
  }
  catch {
    return [];
  }
};

const write = async (ops: PendingPlaylistOp[]): Promise<void> => {
  try {
    await storage.setItem(PENDING_PLAYLIST_OPS_KEY, JSON.stringify(ops));
  }
  catch (err) {
    console.warn('[PendingPlaylistOps] write failed:', err);
  }
};

const sameOp = (a: PendingPlaylistOp, b: PendingPlaylistOp) => JSON.stringify(a) === JSON.stringify(b);

export const pendingPlaylistOps = {
  all(): Promise<PendingPlaylistOp[]> {
    return withLock(read);
  },

  enqueue(op: PendingPlaylistOp): Promise<void> {
    return withLock(async () => write([...(await read()), op]));
  },

  /** Removes the given (processed) ops, keeping anything enqueued in the meantime. */
  remove(processed: PendingPlaylistOp[]): Promise<void> {
    if (processed.length === 0) return Promise.resolve();
    return withLock(async () => {
      const left = [...processed];
      const ops = await read();
      const kept = ops.filter((op) => {
        const index = left.findIndex((done) => sameOp(done, op));
        if (index === -1) return true;
        left.splice(index, 1);
        return false;
      });
      await write(kept);
    });
  },

  /** Removes and returns every op matching the predicate. */
  removeWhere(predicate: (op: PendingPlaylistOp) => boolean): Promise<PendingPlaylistOp[]> {
    return withLock(async () => {
      const ops = await read();
      const removed = ops.filter(predicate);
      if (removed.length > 0) await write(ops.filter((op) => !predicate(op)));
      return removed;
    });
  },

  clear(): Promise<void> {
    return withLock(() => write([]));
  },
};
