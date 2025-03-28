// src/database/migrations/1649879235404-CreateLikesTable.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';
import { LikeableType } from '../../likes/enums/likeable-type.enum';

export class CreateLikesTable1649879235404 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for likeable_type
    await queryRunner.query(`
      CREATE TYPE "likeable_type_enum" AS ENUM (
        '${LikeableType.SONG}',
        '${LikeableType.ALBUM}',
        '${LikeableType.PLAYLIST}',
        '${LikeableType.ARTIST}',
        '${LikeableType.USER}',
        '${LikeableType.COMMENT}',
        '${LikeableType.POST}'
      )
    `);

    // Create likes table
    await queryRunner.createTable(
      new Table({
        name: 'likes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'likeable_id',
            type: 'uuid',
          },
          {
            name: 'likeable_type',
            type: 'likeable_type_enum',
          },
          {
            name: 'is_anonymous',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'likes',
      new TableIndex({
        name: 'IDX_likes_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'likes',
      new TableIndex({
        name: 'IDX_likes_likeable',
        columnNames: ['likeable_id', 'likeable_type'],
      })
    );

    await queryRunner.createIndex(
      'likes',
      new TableIndex({
        name: 'IDX_likes_user_activity',
        columnNames: ['user_id', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'likes',
      new TableIndex({
        name: 'IDX_likes_trending',
        columnNames: ['likeable_type', 'created_at'],
      })
    );

    // Create unique constraint to prevent duplicate likes
    await queryRunner.createIndex(
      'likes',
      new TableIndex({
        name: 'UQ_likes_unique_like',
        columnNames: ['user_id', 'likeable_id', 'likeable_type'],
        isUnique: true,
      })
    );

    // Add foreign key for user relationship
    await queryRunner.createForeignKey(
      'likes',
      new TableForeignKey({
        name: 'FK_likes_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('likes', 'FK_likes_user');
    
    // Drop indexes
    await queryRunner.dropIndex('likes', 'UQ_likes_unique_like');
    await queryRunner.dropIndex('likes', 'IDX_likes_trending');
    await queryRunner.dropIndex('likes', 'IDX_likes_user_activity');
    await queryRunner.dropIndex('likes', 'IDX_likes_likeable');
    await queryRunner.dropIndex('likes', 'IDX_likes_user_id');
    
    // Drop table
    await queryRunner.dropTable('likes');
    
    // Drop enum type
    await queryRunner.query(`DROP TYPE "likeable_type_enum"`);
  }
}
