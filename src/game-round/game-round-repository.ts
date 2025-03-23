import { EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';
import { GameRound, GameRoundStatus } from './game-round.entity';
import { GameRoundFilterDto } from './game-round.dto';

@EntityRepository(GameRound)
export class GameRoundRepository extends Repository<GameRound> {
  
  /**
   * Get game rounds with filtering options
   */
  async getGameRounds(filterDto: GameRoundFilterDto): Promise<[GameRound[], number]> {
    const { status, creatorId, songId, isPublic, limit = 10, offset = 0 } = filterDto;
    
    const query = this.createQueryBuilder('gameRound')
      .leftJoinAndSelect('gameRound.creator', 'creator')
      .leftJoinAndSelect('gameRound.song', 'song');
    
    // Apply filters
    if (status) {
      query.andWhere('gameRound.status = :status', { status });
    }
    
    if (creatorId) {
      query.andWhere('gameRound.creatorId = :creatorId', { creatorId });
    }
    
    if (songId) {
      query.andWhere('gameRound.songId = :songId', { songId });
    }
    
    if (isPublic !== undefined) {
      query.andWhere('gameRound.isPublic = :isPublic', { isPublic });
    }
    
    // Add pagination
    query.skip(offset).take(limit);
    
    // Order by most recent first
    query.orderBy('gameRound.createdAt', 'DESC');
    
    return query.getManyAndCount();
  }
  
  /**
   * Find rounds that should be started based on scheduledStartTime
   */
  async findRoundsToStart(): Promise<GameRound[]> {
    const now = new Date();
    
    return this.createQueryBuilder('gameRound')
      .where('gameRound.status = :status', { status: GameRoundStatus.PENDING })
      .andWhere('gameRound.scheduledStartTime IS NOT NULL')
      .andWhere('gameRound.scheduledStartTime <= :now', { now })
      .getMany();
  }
  
  /**
   * Find active rounds that should be completed based on duration
   */
  async findRoundsToComplete(): Promise<GameRound[]> {
    const now = new Date();
    
    return this.createQueryBuilder('gameRound')
      .where('gameRound.status = :status', { status: GameRoundStatus.ACTIVE })
      .andWhere('gameRound.actualStartTime IS NOT NULL')
      .andWhere(`
        (EXTRACT(EPOCH FROM (:now - gameRound.actualStartTime)) >= gameRound.roundDuration)
      `, { now })
      .getMany();
  }
  
  /**
   * Get current active game rounds with player count
   */
  async getActiveRoundsWithPlayerCount(): Promise<any[]> {
    return this.createQueryBuilder('gameRound')
      .leftJoinAndSelect('gameRound.creator', 'creator')
      .leftJoinAndSelect('gameRound.song', 'song')
      .leftJoin('gameRound.lyricSelections', 'lyricSelection')
      .select([
        'gameRound.id',
        'gameRound.title',
        'gameRound.status',
        'gameRound.scheduledStartTime',
        'gameRound.actualStartTime',
        'gameRound.maxParticipants',
        'gameRound.isPublic',
        'creator.id',
        'creator.username',
        'song.id',
        'song.title',
        'COUNT(DISTINCT lyricSelection.userId) as playerCount'
      ])
      .where('gameRound.status = :status', { status: GameRoundStatus.ACTIVE })
      .groupBy('gameRound.id')
      .addGroupBy('creator.id')
      .addGroupBy('song.id')
      .getRawMany();
  }
}
