import { DataTypes } from 'sequelize';
import sequelize from '../database/index.js';

const Playlist = sequelize.define('Playlist', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coverUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  downloadEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  visibility: {
    type: DataTypes.ENUM('private', 'public'),
    allowNull: false,
    defaultValue: 'private',
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  savesCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'playlists',
});

export default Playlist;
