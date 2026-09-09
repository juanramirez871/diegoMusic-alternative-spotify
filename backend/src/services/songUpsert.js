import { Artist, Song } from '../models/index.js';

export async function upsertSong({
  youtubeId,
  title,
  thumbnailUrl,
  durationFormatted,
  channelId,
  channelName,
  channelAvatar,
}) {
  const cleanThumb = thumbnailUrl && thumbnailUrl.trim() ? thumbnailUrl : null;
  const cleanDuration = durationFormatted && String(durationFormatted).trim() ? durationFormatted : null;
  const cleanChannelName = channelName && channelName.trim() ? channelName : null;
  const cleanAvatar = channelAvatar && channelAvatar.trim() ? channelAvatar : null;

  let artistId = null;
  if (channelId) {
    const [artist] = await Artist.findOrCreate({
      where: { channelId },
      defaults: { name: cleanChannelName ?? '', avatar: cleanAvatar ?? '' },
    });

    const artistPatch = {};
    if (cleanChannelName && artist.name !== cleanChannelName) artistPatch.name = cleanChannelName;
    if (cleanAvatar && artist.avatar !== cleanAvatar) artistPatch.avatar = cleanAvatar;
    if (Object.keys(artistPatch).length > 0) await artist.update(artistPatch);
    artistId = artist.id;
  }

  const [song, created] = await Song.findOrCreate({
    where: { youtubeId },
    defaults: {
      title,
      thumbnailUrl: cleanThumb ?? '',
      durationFormatted: cleanDuration,
      artistId,
    },
  });

  if (!created) {
    const patch = {};
    if (title && song.title !== title) patch.title = title;
    if (cleanThumb && song.thumbnailUrl !== cleanThumb) patch.thumbnailUrl = cleanThumb;
    if (cleanDuration && song.durationFormatted !== cleanDuration) patch.durationFormatted = cleanDuration;
    if (artistId && song.artistId !== artistId) patch.artistId = artistId;
    if (Object.keys(patch).length > 0) await song.update(patch);
  }

  return song;
}

export function songToClient(song) {
  return {
    id: song.youtubeId,
    url: `https://www.youtube.com/watch?v=${song.youtubeId}`,
    title: song.title,
    thumbnail: { url: song.thumbnailUrl ?? '' },
    channel: {
      name: song.Artist?.name ?? '',
      id: song.Artist?.channelId ?? '',
      avatar: song.Artist?.avatar ?? '',
    },
    duration_formatted: song.durationFormatted ?? '',
  };
}
