// src/likes/repositories/like.repository.ts
import { EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';
import { Like } from '../entities/like.entity';
import { LikeableType } from '../enums/likeable-type.enum';
import { LikeFilterDto } from '../dto/like-filter.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class LikeRepository {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
  ) {}

  /**
   * Find a like by user and content
   */
  async findByUserAndContent(
    userId: string,
    likeableId: string,
    likeableType: LikeableType,
  ): Promise<Like | null> {
    return this.likeRepository.findOne({
      where: {
        userId,
        likeableId,
        likeableType,
      },
    });
  }

  /**
   * Check if a user has liked content
   */
  async hasLiked(
    userId: string,
    likeableId: string,
    likeableType: LikeableType,
  ): Promise<boolean> {
    const count = await this.likeRepository.count({
      where: {
        userId,
        likeableId,
        likeableType,
      },
    });
    return count > 0;
  }

  /**
   * Count likes for specific content
   */
  async countLikes(likeableId: string, likeableType: LikeableType): Promise<number> {
    return this.likeRepository.count({
      where: {
        likeableId,
        likeableType,
      },
    });
  }

  /**
   * Count likes for multiple content items efficiently
   */
  async countLikesForMany(
    likeableIds: string[],
    likeableType: LikeableType,
  ): Promise<Record<string, number>> {
    if (!likeableIds.length) return {};

    const results = await this.likeRepository
      .createQueryBuilder('like')
      .select('like.likeableId', 'likeableId')
      .addSelect('COUNT(*)', 'count')
      .where('like.likeableId IN (:...likeableIds)', { likeableIds })
      .andWhere('like.likeableType = :likeableType', { likeableType })
      .groupBy('like.likeableId')
      .getRawMany();

    return results.reduce((acc, item) => {
      acc[item.likeableId] = parseInt(item.count, 10);
      return acc;
    }, {});
  }

  /**
   * Get likes with filtering options
   */
  async findLikes(filter: LikeFilterDto): Promise<[Like[], number]> {
    const query = this.createFilteredQuery(filter);
    
    return query
      .take(filter.limit)
      .skip(filter.offset)
      .orderBy(`like.${filter.sortBy || 'createdAt'}`, filter.sortDirection || 'DESC')
      .getManyAndCount();
  }

  /**
   * Create filtered query builder for likes
   */
  private createFilteredQuery(filter: LikeFilterDto): SelectQueryBuilder<Like> {
    const query = this.likeRepository.createQueryBuilder('like');

    if (filter.userId) {
      query.andWhere('like.userId = :userId', { userId: filter.userId });
    }

    if (filter.likeableId) {
      query.andWhere('like.likeableId = :likeableId', { likeableId: filter.likeableId });
    }

    if (filter.likeableType) {
      query.andWhere('like.likeableType = :likeableType', { likeableType: filter.likeableType });
    }

    if (filter.fromDate) {
      query.andWhere('like.createdAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter.toDate) {
      query.andWhere('like.createdAt <= :toDate', { toDate: filter.toDate });
    }

    // Optional: Load related user data
    query.leftJoinAndSelect('like.user', 'user');

    return query;
  }

  /**
   * Get like statistics
   */
  async getLikeStats(likeableId: string, likeableType: LikeableType): Promise<any> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Total count
    const totalCount = await this.countLikes(likeableId, likeableType);

    // Count for last 24 hours
    const last24Hours = await this.likeRepository.count({
      where: {
        likeableId,
        likeableType,
        createdAt: { $gte: oneDayAgo },
      },
    });

    // Count for last week
    const lastWeek = await this.likeRepository.count({
      where: {
        likeableId,
        likeableType,
        createdAt: { $gte: oneWeekAgo },
      },
    });

    // Count for last month
    const lastMonth = await this.likeRepository.count({
      where: {
        likeableId,
        likeableType,
        createdAt: { $gte: oneMonthAgo },
      },
    });

    // Count for previous month (for growth calculation)
    const previousMonth = await this.likeRepository.count({
      where: {
        likeableId,
        likeableType,
        createdAt: { $gte: twoMonthsAgo, $lt: oneMonthAgo },
      },
    });

    // Calculate growth percentage
    let growthPercentage = 0;
    if (previousMonth > 0) {
      growthPercentage = ((lastMonth - previousMonth) / previousMonth) * 100;
    }

    return {
      totalCount,
      likeableId,
      likeableType,
      last24Hours,
      lastWeek,
      lastMonth,
      growthPercentage,
    };
  }

  /**
   * Get trending content by likes in a time period
   */
  async getTrending(
    likeableType: LikeableType,
    days: number = 7,
    limit: number = 10,
  ): Promise<{ likeableId: string; likeCount: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await this.likeRepository
      .createQueryBuilder('like')
      .select('like.likeableId', 'likeableId')
      .addSelect('COUNT(*)', 'likeCount')
      .where('like.likeableType = :likeableType', { likeableType })
      .andWhere('like.createdAt >= :startDate', { startDate })
      .groupBy('like.likeableId')
      .orderBy('likeCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map(item => ({
      likeableId: item.likeableId,
      likeCount: parseInt(item.likeCount, 10),
    }));
  }
}
