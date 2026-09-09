import storage from './storage';
import { PENDING_PLAYLIST_OPS_KEY } from '@/context/player/types';
import type { PendingPlaylistOp } from '@/interfaces/Playlist';

export const pendingPlaylistOps = {
  async all(): Promise<PendingPlaylistOp[]> {
    try {
      const raw = await storage.getItem(PENDING_PLAYLIST_OPS_KEY);
      return raw ? (JSON.parse(raw) as PendingPlaylistOp[]) : [];
    }
    catch {
      return [];
    }
  },

  async set(ops: PendingPlaylistOp[]): Promise<void> {
    try {
      await storage.setItem(PENDING_PLAYLIST_OPS_KEY, JSON.stringify(ops));
    }
    catch (err) {
      console.warn('[PendingPlaylistOps] set failed:', err);
    }
  },

  async enqueue(op: PendingPlaylistOp): Promise<void> {
    const ops = await this.all();
    ops.push(op);
    await this.set(ops);
  },

  async clear(): Promise<void> {
    await this.set([]);
  },
};
