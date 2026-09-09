'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('playlists')) return;

    await queryInterface.createTable('playlists', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      coverUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      downloadEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('playlists', ['userId'], {
      name: 'playlists_userId_idx',
    });

    // At most one default ("Favoritos") playlist per user.
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS playlists_user_default_unique ' +
      'ON "playlists" ("userId") WHERE "isDefault" = true;'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('playlists');
  },
};
