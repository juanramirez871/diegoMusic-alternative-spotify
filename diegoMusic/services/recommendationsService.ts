import apiFetch from './api';
import type { SongData } from '@/interfaces/Song';

export interface TopGenre {
  genre: string;
  weight: number;
}

export const recommendationsService = {
  async fetchRecommendations(limit = 20): Promise<SongData[]> {
    try {
      const data = await apiFetch<{ songs: SongData[] }>(`/recommendations?limit=${limit}`);
      return data.songs ?? [];
    }
    catch (err) {
      console.warn('[Recommendations] fetch failed:', err);
      return [];
    }
  },

  async fetchTopGenres(): Promise<TopGenre[]> {
    try {
      const data = await apiFetch<{ genres: TopGenre[] }>('/recommendations/genres');
      return data.genres ?? [];
    }
    catch (err) {
      console.warn('[Recommendations] top genres fetch failed:', err);
      return [];
    }
  },

  async fetchDiscovery(): Promise<SongData[]> {
    try {
      const data = await apiFetch<{ songs: SongData[] }>('/recommendations/discover');
      return data.songs ?? [];
    }
    catch (err) {
      console.warn('[Recommendations] discovery fetch failed:', err);
      return [];
    }
  },
};
