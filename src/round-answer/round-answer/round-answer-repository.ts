import { EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';
import { RoundAnswer, AnswerStatus } from './round-answer.entity';
import { AnswerFilterDto } from './round-answer.dto';

@EntityRepository(RoundAnswer)
export class RoundAnswerRepository extends Repository<RoundAnswer> {
  /**
   * Find answers with filtering options
   */
  async findAnswers(filterDto: AnswerFilterDto): Promise<[RoundAnswer[], number]> {
    const { 
      roundId, 
      userId, 
      status, 
      isCorrect, 
      minScore, 
      maxScore, 
      limit, 
      offset, 
      order, 
      sortBy 
    } = filterDto;

    const query = this.createQueryBuilder('answer')
      .leftJoinAndSelect('answer.user', 'user')
      .select([
        'answer',
        'user.id',
        'user.username',
        'user.avatarUrl'
      ]);

    // Apply filters
    if (roundId) {
      query.andWhere('answer.roundId = :roundId', { roundId });
    }

    if (userId) {
      query.andWhere('answer.userId = :userId', { userId });
    }

    if (status) {
      query.andWhere('answer.status = :status', { status });
    }

    if (isCorrect !== undefined) {
      query.andWhere('answer.isCorrect = :isCorrect', { isCorrect });
    }

    if (minScore !== undefined) {
      query.andWhere('answer.score >= :minScore', { minScore });
    }

    if (maxScore !== undefined) {
      query.andWhere('answer.score <= :maxScore', { maxScore });
    }

    // Pagination and sorting
    query.take(limit).skip(offset);
    query.orderBy(`answer.${sortBy}`, order);

    return query.getManyAndCount();
  }

  /**
   * Get answers grouped by user with statistics
   */
  async getAnswersByUser(roundId: string): Promise<any[]> {
    return this.createQueryBuilder('answer')
      .select([
        'answer.userId',
        'user.username',
        'user.avatarUrl',
        'COUNT(answer.id) as answerCount',
        'SUM(answer.score) as totalScore',
        'AVG(answer.score) as averageScore',
        'COUNT(CASE WHEN answer.isCorrect = true THEN 1 END) as correctCount'
      ])
      .leftJoin('answer.user', 'user')
      .where('answer.roundId = :roundId', { roundId })
      .groupBy('answer.userId')
      .addGroupBy('user.username')
      .addGroupBy('user.avatarUrl')
      .orderBy('totalScore', 'DESC')
      .getRawMany();
  }

  /**
   * Get answer statistics for a round
   */
  async getAnswerStatistics(roundId: string): Promise<any> {
    const stats = await this.createQueryBuilder('answer')
      .select([
        'COUNT(answer.id) as totalAnswers',
        'SUM(CASE WHEN answer.isCorrect = true THEN 1 ELSE 0 END) as correctAnswers',
        'AVG(answer.score) as averageScore',
        'MAX(answer.score) as highestScore',
        'COUNT(DISTINCT answer.userId) as totalParticipants'
      ])
      .where('answer.roundId = :roundId', { roundId })
      .getRawOne();

    const statusBreakdown = await this.createQueryBuilder('answer')
      .select([
        'answer.status',
        'COUNT(answer.id) as count'
      ])
      .where('answer.roundId = :roundId', { roundId })
      .groupBy('answer.status')
      .getRawMany();

    const scoreDistribution = await this.createQueryBuilder('answer')
      .select([
        'FLOOR(answer.score / 10) * 10 as scoreRange',
        'COUNT(answer.id) as count'
      ])
      .where('answer.roundId = :roundId', { roundId })
      .groupBy('scoreRange')
      .orderBy('scoreRange', 'ASC')
      .getRawMany();

    return {
      ...stats,
      statusBreakdown,
      scoreDistribution
    };
  }

  /**
   * Check if user has exceeded submission rate limit
   */
  async countRecentUserSubmissions(userId: string, roundId: string, timeWindowMinutes: number): Promise<number> {
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

    return this.createQueryBuilder('answer')
      .where('answer.userId = :userId', { userId })
      .andWhere('answer.roundId = :roundId', { roundId })
      .andWhere('answer.createdAt > :timeWindow', { timeWindow })
      .getCount();
  }

  /**
   * Get the latest submission attempt number for a user in a round
   */
  async getLatestSubmissionAttempt(userId: string, roundId: string): Promise<number> {
    const result = await this.createQueryBuilder('answer')
      .select('MAX(answer.submissionAttempt)', 'maxAttempt')
      .where('answer.userId = :userId', { userId })
      .andWhere('answer.roundId = :roundId', { roundId })
      .getRawOne();

    return result?.maxAttempt || 0;
  }

  /**
   * Get answer history with revision details
   */
  async getAnswerHistory(answerId: string): Promise<RoundAnswer> {
    return this.createQueryBuilder('answer')
      .leftJoinAndSelect('answer.user', 'user')
      .select([
        'answer',
        'user.id',
        'user.username'
      ])
      .where('answer.id = :answerId', { answerId })
      .getOne();
  }
}
