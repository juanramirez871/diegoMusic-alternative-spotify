'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('playlists').catch(() => null);
    if (!cols) return;

    if (!cols.visibility) {
      await queryInterface.addColumn('playlists', 'visibility', {
        type: Sequelize.ENUM('private', 'public'),
        allowNull: false,
        defaultValue: 'private',
      });
    }
    if (!cols.slug) {
      await queryInterface.addColumn('playlists', 'slug', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await queryInterface.addIndex('playlists', ['slug'], {
        unique: true,
        name: 'playlists_slug_unique',
        where: { slug: { [Sequelize.Op.ne]: null } },
      });
    }
    if (!cols.publishedAt) {
      await queryInterface.addColumn('playlists', 'publishedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!cols.savesCount) {
      await queryInterface.addColumn('playlists', 'savesCount', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('playlists', 'savesCount').catch(() => {});
    await queryInterface.removeColumn('playlists', 'publishedAt').catch(() => {});
    await queryInterface.removeIndex('playlists', 'playlists_slug_unique').catch(() => {});
    await queryInterface.removeColumn('playlists', 'slug').catch(() => {});
    await queryInterface.removeColumn('playlists', 'visibility').catch(() => {});
    // Drop the ENUM type left behind by Postgres.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_playlists_visibility";').catch(() => {});
  },
};
