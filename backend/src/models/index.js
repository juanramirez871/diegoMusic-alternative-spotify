import sequelize from '../database/index.js';
import User from './User.js';
import Artist from './Artist.js';
import Song from './Song.js';
import Settings from './Settings.js';
import SongPlayed from './SongPlayed.js';
import FavoriteSong from './FavoriteSong.js';
import FavoriteArtist from './FavoriteArtist.js';
import Playlist from './Playlist.js';
import PlaylistSong from './PlaylistSong.js';
import PlaylistFollow from './PlaylistFollow.js';

Artist.hasMany(Song, { foreignKey: 'artistId' });
Song.belongsTo(Artist, { foreignKey: 'artistId' });

User.hasOne(Settings, { foreignKey: 'userId', onDelete: 'CASCADE' });
Settings.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(SongPlayed, { foreignKey: 'userId', onDelete: 'CASCADE' });
SongPlayed.belongsTo(User, { foreignKey: 'userId' });

Song.hasMany(SongPlayed, { foreignKey: 'songId', onDelete: 'CASCADE' });
SongPlayed.belongsTo(Song, { foreignKey: 'songId' });

User.hasMany(FavoriteSong, { foreignKey: 'userId', onDelete: 'CASCADE' });
FavoriteSong.belongsTo(User, { foreignKey: 'userId' });

Song.hasMany(FavoriteSong, { foreignKey: 'songId', onDelete: 'CASCADE' });
FavoriteSong.belongsTo(Song, { foreignKey: 'songId' });

User.hasMany(FavoriteArtist, { foreignKey: 'userId', onDelete: 'CASCADE' });
FavoriteArtist.belongsTo(User, { foreignKey: 'userId' });

Artist.hasMany(FavoriteArtist, { foreignKey: 'artistId', onDelete: 'CASCADE' });
FavoriteArtist.belongsTo(Artist, { foreignKey: 'artistId' });

User.hasMany(Playlist, { foreignKey: 'userId', onDelete: 'CASCADE' });
Playlist.belongsTo(User, { foreignKey: 'userId' });

Playlist.belongsToMany(Song, { through: PlaylistSong, foreignKey: 'playlistId', otherKey: 'songId' });
Song.belongsToMany(Playlist, { through: PlaylistSong, foreignKey: 'songId', otherKey: 'playlistId' });

Playlist.hasMany(PlaylistSong, { foreignKey: 'playlistId', onDelete: 'CASCADE' });
PlaylistSong.belongsTo(Playlist, { foreignKey: 'playlistId' });

Song.hasMany(PlaylistSong, { foreignKey: 'songId', onDelete: 'CASCADE' });
PlaylistSong.belongsTo(Song, { foreignKey: 'songId' });

User.hasMany(PlaylistFollow, { foreignKey: 'userId', onDelete: 'CASCADE' });
PlaylistFollow.belongsTo(User, { foreignKey: 'userId' });

Playlist.hasMany(PlaylistFollow, { foreignKey: 'playlistId', onDelete: 'CASCADE' });
PlaylistFollow.belongsTo(Playlist, { foreignKey: 'playlistId' });

export {
  sequelize,
  User,
  Artist,
  Song,
  Settings,
  SongPlayed,
  FavoriteSong,
  FavoriteArtist,
  Playlist,
  PlaylistSong,
  PlaylistFollow,
};
