'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('playlistFollows')) return;

    await queryInterface.createTable('playlistFollows', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      playlistId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'playlists', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      followedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('playlistFollows', ['userId', 'playlistId'], {
      unique: true,
      name: 'playlistFollows_user_playlist_unique',
    });
    await queryInterface.addIndex('playlistFollows', ['userId', 'position'], {
      name: 'playlistFollows_user_position_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('playlistFollows');
  },
};
