'use strict';

/**
 * Backfills a default "Favoritos" playlist for every user that currently has
 * favoriteSongs, copying their favorites into playlistSongs (order preserved by
 * favoriteSongs.id). The favoriteSongs table is intentionally left intact as a
 * safety net; a later migration drops it.
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('favoriteSongs') || !tables.includes('playlists')) return;

    const [users] = await queryInterface.sequelize.query(
      'SELECT DISTINCT "userId" FROM "favoriteSongs";'
    );

    for (const { userId } of users) {
      // Skip if this user already has a default playlist.
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM "playlists" WHERE "userId" = :userId AND "isDefault" = true LIMIT 1;',
        { replacements: { userId } }
      );

      let playlistId;
      if (existing.length > 0) {
        playlistId = existing[0].id;
      } else {
        const [inserted] = await queryInterface.sequelize.query(
          'INSERT INTO "playlists" ' +
          '("userId", "name", "isDefault", "downloadEnabled", "position", "createdAt", "updatedAt") ' +
          "VALUES (:userId, 'Favoritos', true, true, 0, NOW(), NOW()) RETURNING id;",
          { replacements: { userId } }
        );
        playlistId = inserted[0].id;
      }

      // Copy favorites into playlistSongs, preserving order, skipping dupes.
      await queryInterface.sequelize.query(
        'INSERT INTO "playlistSongs" ("playlistId", "songId", "position", "addedAt", "createdAt") ' +
        'SELECT :playlistId, fs."songId", ' +
        '  ROW_NUMBER() OVER (ORDER BY fs.id) - 1, NOW(), NOW() ' +
        'FROM "favoriteSongs" fs ' +
        'WHERE fs."userId" = :userId ' +
        'ON CONFLICT ("playlistId", "songId") DO NOTHING;',
        { replacements: { playlistId, userId } }
      );
    }
  },

  async down(queryInterface) {
    // Remove seeded default playlists (cascades to playlistSongs).
    await queryInterface.sequelize.query(
      'DELETE FROM "playlists" WHERE "isDefault" = true;'
    );
  },
};
