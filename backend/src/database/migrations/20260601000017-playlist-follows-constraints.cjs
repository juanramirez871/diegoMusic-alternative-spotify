'use strict';

/**
 * The playlistFollows table was created by sequelize.sync() in dev before
 * migration ...16 ran, so ...16 short-circuited and never added the FK
 * constraints or the unique index. This backfills them idempotently and
 * removes any dangling follow rows first so the FK can be added.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('playlistFollows')) return;

    // 1) Purge orphan follows (playlist deleted while a follow still pointed at it).
    await queryInterface.sequelize.query(`
      DELETE FROM "playlistFollows" pf
      WHERE NOT EXISTS (SELECT 1 FROM "playlists" p WHERE p.id = pf."playlistId")
         OR NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = pf."userId")
    `);

    // 2) Collapse any duplicate (userId, playlistId) pairs, keeping the lowest id.
    await queryInterface.sequelize.query(`
      DELETE FROM "playlistFollows" a
      USING "playlistFollows" b
      WHERE a."userId" = b."userId"
        AND a."playlistId" = b."playlistId"
        AND a.id > b.id
    `);

    const [constraints] = await queryInterface.sequelize.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = '"playlistFollows"'::regclass
    `);
    const names = new Set(constraints.map((c) => c.conname));

    if (!names.has('playlistFollows_userId_fkey')) {
      await queryInterface.addConstraint('playlistFollows', {
        fields: ['userId'],
        type: 'foreign key',
        name: 'playlistFollows_userId_fkey',
        references: { table: 'users', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    if (!names.has('playlistFollows_playlistId_fkey')) {
      await queryInterface.addConstraint('playlistFollows', {
        fields: ['playlistId'],
        type: 'foreign key',
        name: 'playlistFollows_playlistId_fkey',
        references: { table: 'playlists', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    const [indexes] = await queryInterface.sequelize.query(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'playlistFollows'
    `);
    const idxNames = new Set(indexes.map((i) => i.indexname));

    if (!idxNames.has('playlistFollows_user_playlist_unique')) {
      await queryInterface.addIndex('playlistFollows', ['userId', 'playlistId'], {
        unique: true,
        name: 'playlistFollows_user_playlist_unique',
      });
    }
    if (!idxNames.has('playlistFollows_user_position_idx')) {
      await queryInterface.addIndex('playlistFollows', ['userId', 'position'], {
        name: 'playlistFollows_user_position_idx',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('playlistFollows', 'playlistFollows_userId_fkey').catch(() => {});
    await queryInterface.removeConstraint('playlistFollows', 'playlistFollows_playlistId_fkey').catch(() => {});
    await queryInterface.removeIndex('playlistFollows', 'playlistFollows_user_playlist_unique').catch(() => {});
    await queryInterface.removeIndex('playlistFollows', 'playlistFollows_user_position_idx').catch(() => {});
  },
};
