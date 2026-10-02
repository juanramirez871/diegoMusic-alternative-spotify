import { DataTypes } from 'sequelize';
import sequelize from '../database/index.js';

const Artist = sequelize.define('Artist', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  channelId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  genres: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [],
  },
  genresFetchedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'artists',
});

export default Artist;
