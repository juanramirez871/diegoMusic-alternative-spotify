import { useState, useEffect } from 'react';
import storage from '@/services/storage';
import {
  FAVORITES_QUEUE_KEY,
  FAVORITES_DEFAULT_QUEUE_KEY,
  PLAYLIST_QUEUE_KEY,
  PLAYLIST_DEFAULT_QUEUE_KEY,
  SEARCH_QUEUE_KEY,
  SEARCH_DEFAULT_QUEUE_KEY,
  QUEUE_SOURCE_KEY,
  SHUFFLE_KEY,
  REPEAT_KEY,
  RepeatMode,
  QueueSource,
} from './types';
import { SongData } from '@/interfaces/Song';

const queueKeyFor = (source: QueueSource) =>
  source === 'playlist' ? PLAYLIST_QUEUE_KEY : SEARCH_QUEUE_KEY;
const defaultQueueKeyFor = (source: QueueSource) =>
  source === 'playlist' ? PLAYLIST_DEFAULT_QUEUE_KEY : SEARCH_DEFAULT_QUEUE_KEY;

export const usePlayerQueue = () => {

  const [queue, setQueueState] = useState<SongData[]>([]);
  const [defaultQueue, setDefaultQueue] = useState<SongData[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queueSource, setQueueSource] = useState<QueueSource>('search');
  const [queuePlaylistId, setQueuePlaylistId] = useState<string | null>(null);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        const savedSource = await storage.getItem(QUEUE_SOURCE_KEY);
        // Legacy 'favorites' source maps to the new 'playlist' source.
        const source: QueueSource = savedSource === 'search' ? 'search' : 'playlist';
        setQueueSource(source);
        if (savedSource !== source) {
          await storage.setItem(QUEUE_SOURCE_KEY, source).catch(() => {});
        }

        const [savedQueue, savedDefaultQueue, savedShuffle] = await Promise.all([
          storage.getItem(queueKeyFor(source)),
          storage.getItem(defaultQueueKeyFor(source)),
          storage.getItem(SHUFFLE_KEY),
        ]);

        // Fall back to the pre-migration favorites queue keys if the new ones
        // are empty (first run after upgrade).
        let queueRaw = savedQueue;
        let defaultRaw = savedDefaultQueue;
        if (source === 'playlist' && !queueRaw) {
          queueRaw = await storage.getItem(FAVORITES_QUEUE_KEY);
          defaultRaw = defaultRaw || (await storage.getItem(FAVORITES_DEFAULT_QUEUE_KEY));
        }

        const savedRepeat = await storage.getItem(REPEAT_KEY);
        if (queueRaw) setQueueState(JSON.parse(queueRaw));
        if (defaultRaw) setDefaultQueue(JSON.parse(defaultRaw));
        if (savedShuffle) setIsShuffle(JSON.parse(savedShuffle));
        if (savedRepeat) setRepeatMode(JSON.parse(savedRepeat) as RepeatMode);
      }
      catch (error) {
        console.error('Error loading persisted queue:', error);
      }
    };
    loadQueue();
  }, []);

  const setQueue = async (newQueue: SongData[]) => {
    setQueueState(newQueue);
    try {
      await storage.setItem(queueKeyFor(queueSource), JSON.stringify(newQueue));
    }
    catch (error) {
      console.error('Error persisting queue:', error);
    }
  };

  const toggleShuffle = async (currentSong: SongData | null) => {

    const newShuffleState = !isShuffle;
    setIsShuffle(newShuffleState);

    let newQueue = [...queue];
    if (newShuffleState) {
      for (let i = newQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
      }

      if (currentSong) {
        const currentIndex = newQueue.findIndex(s => s.id === currentSong.id);
        if (currentIndex !== -1) {
          newQueue.splice(currentIndex, 1);
          newQueue.unshift(currentSong);
        }
      }
    }
    else {
      newQueue = [...defaultQueue];
    }

    setQueueState(newQueue);
    try {
      await Promise.all([
        storage.setItem(SHUFFLE_KEY, JSON.stringify(newShuffleState)),
        storage.setItem(queueKeyFor(queueSource), JSON.stringify(newQueue)),
      ]);
    }
    catch (error) {
      console.error('Error persisting shuffle state:', error);
    }
  };

  const updateQueueAndSource = async (
    song: SongData,
    initialQueue?: SongData[],
    source?: QueueSource,
    playlistId?: string,
    shuffleActive: boolean = isShuffle,
  ) => {

    let newQueue = queue;
    let newDefaultQueue = defaultQueue;
    let newSource = queueSource;

    if (initialQueue) {
      newSource = source || 'search';
      setQueueSource(newSource);
      setQueuePlaylistId(newSource === 'playlist' ? (playlistId ?? null) : null);
      newQueue = [...initialQueue];
      newDefaultQueue = [...initialQueue];

      if (shuffleActive) {
        const songsToShuffle = newQueue.filter(s => s.id !== song.id);
        for (let i = songsToShuffle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
        }
        newQueue = [song, ...songsToShuffle];
      }

      setQueueState(newQueue);
      setDefaultQueue(newDefaultQueue);
    }
    else if (queue.length === 0) {
      newQueue = [];
      newDefaultQueue = [];
      setQueueState([]);
      setDefaultQueue([]);
    }

    try {
      const storagePromises = [
        storage.setItem(QUEUE_SOURCE_KEY, newSource),
      ];

      if (initialQueue) {
        storagePromises.push(storage.setItem(queueKeyFor(newSource), JSON.stringify(newQueue)));
        storagePromises.push(storage.setItem(defaultQueueKeyFor(newSource), JSON.stringify(newDefaultQueue)));
      }

      await Promise.all(storagePromises);
    }
    catch (error) {
      console.error('Error persisting queue data:', error);
    }

    return { newQueue, newDefaultQueue, newSource };
  };

  const toggleRepeat = async () => {
    const next: RepeatMode = repeatMode === 'off' ? 'one' : 'off';
    setRepeatMode(next);
    try {
      await storage.setItem(REPEAT_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Error persisting repeat mode:', error);
    }
  };

  const getNextSong = (currentSong: SongData | null) => {
    if (queue.length === 0 || !currentSong) return null;
    if (repeatMode === 'one') return currentSong;
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex !== -1 && currentIndex < queue.length - 1) return queue[currentIndex + 1];
    return queue[0];
  };

  const getPreviousSong = (currentSong: SongData | null) => {
    if (queue.length === 0 || !currentSong) return null;
    if (repeatMode === 'one') return currentSong;
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) return queue[currentIndex - 1];
    if (repeatMode === 'all') return queue[queue.length - 1];
    return null;
  };

  return {
    queue,
    setQueue,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    queueSource,
    queuePlaylistId,
    updateQueueAndSource,
    getNextSong,
    getPreviousSong
  };
};
