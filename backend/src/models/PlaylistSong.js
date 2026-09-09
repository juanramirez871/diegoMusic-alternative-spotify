import { DataTypes } from 'sequelize';
import sequelize from '../database/index.js';

const PlaylistSong = sequelize.define('PlaylistSong', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  playlistId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  songId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  addedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'playlistSongs',
  updatedAt: false,
});

export default PlaylistSong;
