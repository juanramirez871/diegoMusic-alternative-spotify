import { DataTypes } from 'sequelize';
import sequelize from '../database/index.js';

const PlaylistFollow = sequelize.define('PlaylistFollow', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  playlistId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  followedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'playlistFollows',
  updatedAt: false,
});

export default PlaylistFollow;
