import { useCallback } from 'react';
import { usePlayback, useQueue, useLibrary } from '@/context/PlayerContext';
import type { VoiceCommand } from '@/services/voiceCommands';

export const useVoiceCommandActions = () => {
  const { togglePlayPause, pause, currentSong } = usePlayback();
  const { playNext, playPrevious, toggleShuffle, toggleRepeat } = useQueue();
  const { toggleFavorite } = useLibrary();

  return useCallback(
    (command: VoiceCommand) => {
      switch (command) {
        case 'next':
          playNext();
          break;
        case 'previous':
          playPrevious();
          break;
        case 'pause':
          pause();
          break;
        case 'play':
          togglePlayPause();
          break;
        case 'shuffle':
          toggleShuffle();
          break;
        case 'repeat':
          toggleRepeat();
          break;
        case 'favorite':
          if (currentSong) toggleFavorite(currentSong);
          break;
      }
    },
    [playNext, playPrevious, pause, togglePlayPause, toggleShuffle, toggleRepeat, toggleFavorite, currentSong],
  );
};
