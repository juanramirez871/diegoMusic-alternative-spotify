'use strict';


module.exports = {
  async up(queryInterface, Sequelize) {
    const songsTable = await queryInterface.describeTable('songs');
    if (!songsTable.genres) {
      await queryInterface.addColumn('songs', 'genres', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      });
    }
    if (!songsTable.tags) {
      await queryInterface.addColumn('songs', 'tags', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      });
    }
    if (!songsTable.enrichedAt) {
      await queryInterface.addColumn('songs', 'enrichedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!songsTable.enrichmentAttempts) {
      await queryInterface.addColumn('songs', 'enrichmentAttempts', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    const artistsTable = await queryInterface.describeTable('artists');
    if (!artistsTable.genres) {
      await queryInterface.addColumn('artists', 'genres', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      });
    }
    if (!artistsTable.genresFetchedAt) {
      await queryInterface.addColumn('artists', 'genresFetchedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    const [indexes] = await queryInterface.sequelize.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'songs' AND indexname = 'songs_enriched_at_idx'`,
    );
    if (indexes.length === 0) {
      await queryInterface.sequelize.query(
        `CREATE INDEX "songs_enriched_at_idx" ON "songs" ("enrichedAt")`,
      );
    }

    const [genreIdx] = await queryInterface.sequelize.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'songs' AND indexname = 'songs_genres_gin_idx'`,
    );
    if (genreIdx.length === 0) {
      await queryInterface.sequelize.query(
        `CREATE INDEX "songs_genres_gin_idx" ON "songs" USING GIN ("genres")`,
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "songs_genres_gin_idx"`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "songs_enriched_at_idx"`);
    await queryInterface.removeColumn('artists', 'genresFetchedAt').catch(() => {});
    await queryInterface.removeColumn('artists', 'genres').catch(() => {});
    await queryInterface.removeColumn('songs', 'enrichmentAttempts').catch(() => {});
    await queryInterface.removeColumn('songs', 'enrichedAt').catch(() => {});
    await queryInterface.removeColumn('songs', 'tags').catch(() => {});
    await queryInterface.removeColumn('songs', 'genres').catch(() => {});
  },
};
