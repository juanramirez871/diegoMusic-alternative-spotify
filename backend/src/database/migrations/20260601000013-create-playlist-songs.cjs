'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('playlistSongs')) return;

    await queryInterface.createTable('playlistSongs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      playlistId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'playlists', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      songId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'songs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      addedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('playlistSongs', ['playlistId', 'songId'], {
      unique: true,
      name: 'playlistSongs_playlist_song_unique',
    });
    await queryInterface.addIndex('playlistSongs', ['playlistId', 'position'], {
      name: 'playlistSongs_playlist_position_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('playlistSongs');
  },
};
