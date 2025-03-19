import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

import { User } from '../user/schemas/user.schema';
import { Follow } from '../follow/schemas/follow.schema';
import { Like } from '../like/schemas/like.schema';
import { Comment } from '../comment/schemas/comment.schema';
import { Share } from '../share/schemas/share.schema';

// Types for graph data structures
interface GraphNode {
  id: string;
  username: string;
  avatar?: string;
  metrics: {
    followers: number;
    following: number;
    influence: number;
    communityId?: number;
  };
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: EdgeType;
}

enum EdgeType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
}

interface ConnectionStrength {
  userId: string;
  targetId: string;
  score: number;
  factors: {
    followScore: number;
    interactionScore: number;
    mutualConnectionsScore: number;
  };
}

interface SocialGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface Community {
  id: number;
  members: string[];
  centralityScore: number;
  topInfluencers: string[];
}

@Injectable()
export class SocialGraphService {
  private readonly logger = new Logger(SocialGraphService.name);
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly GRAPH_CACHE_KEY = 'social_graph';
  private readonly COMMUNITY_CACHE_KEY = 'communities';
  private readonly SUGGESTIONS_CACHE_PREFIX = 'suggestions_';
  private readonly MUTUAL_CACHE_PREFIX = 'mutual_';

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Follow.name) private followModel: Model<Follow>,
    @InjectModel(Like.name) private likeModel: Model<Like>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Share.name) private shareModel: Model<Share>,
    @InjectQueue('social-graph') private graphQueue: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get connection strength between two users
   */
  async getConnectionStrength(userId: string, targetId: string): Promise<ConnectionStrength> {
    // Try to get from cache first
    const cacheKey = `connection_${userId}_${targetId}`;
    const cached = await this.cacheManager.get<ConnectionStrength>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Calculate connection strength
    const followRelationship = await this.followModel.findOne({
      $or: [
        { followerId: userId, followeeId: targetId },
        { followerId: targetId, followeeId: userId },
      ],
    });

    // Calculate interaction scores
    const interactionScore = await this.calculateInteractionScore(userId, targetId);
    
    // Calculate mutual connections
    const mutualConnections = await this.getMutualConnections(userId, targetId);
    const mutualConnectionsScore = Math.min(1, mutualConnections.length / 10) * 0.3;

    // Calculate follow score
    let followScore = 0;
    if (followRelationship) {
      // If they follow each other, higher score
      const reverseFollowRelationship = await this.followModel.findOne({
        followerId: targetId,
        followeeId: userId,
      });
      
      if (reverseFollowRelationship) {
        followScore = 0.5;
      } else {
        followScore = 0.3;
      }
    }

    // Calculate total score
    const factors = {
      followScore,
      interactionScore,
      mutualConnectionsScore,
    };
    
    const score = followScore + interactionScore + mutualConnectionsScore;
    
    const result: ConnectionStrength = {
      userId,
      targetId,
      score,
      factors,
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    
    return result;
  }

  /**
   * Calculate interaction score between two users
   */
  private async calculateInteractionScore(userId: string, targetId: string): Promise<number> {
    // Count likes on each other's content
    const likesCount = await this.likeModel.countDocuments({
      $or: [
        { userId, contentId: targetId },
        { userId: targetId, contentId: userId },
      ],
    });

    // Count comments on each other's content
    const commentsCount = await this.commentModel.countDocuments({
      $or: [
        { userId, contentId: targetId },
        { userId: targetId, contentId: userId },
      ],
    });

    // Count shares of each other's content
    const sharesCount = await this.shareModel.countDocuments({
      $or: [
        { userId, contentId: targetId },
        { userId: targetId, contentId: userId },
      ],
    });

    // Calculate weighted score - sharing and commenting are stronger signals than likes
    const interactionScore = (likesCount * 0.05 + commentsCount * 0.15 + sharesCount * 0.2);
    
    // Cap at 0.4 to not overwhelm other factors
    return Math.min(0.4, interactionScore);
  }

  /**
   * Get mutual connections between two users
   */
  async getMutualConnections(userId: string, targetId: string): Promise<User[]> {
    // Try to get from cache first
    const cacheKey = `${this.MUTUAL_CACHE_PREFIX}${userId}_${targetId}`;
    const cached = await this.cacheManager.get<User[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Find users followed by userId
    const userFollowing = await this.followModel.find({ 
      followerId: userId, 
      status: 'active' 
    }).select('followeeId');
    
    const userFollowingIds = userFollowing.map(follow => follow.followeeId.toString());

    // Find users followed by targetId
    const targetFollowing = await this.followModel.find({ 
      followerId: targetId, 
      status: 'active' 
    }).select('followeeId');
    
    const targetFollowingIds = targetFollowing.map(follow => follow.followeeId.toString());

    // Find intersection of followed users
    const mutualIds = userFollowingIds.filter(id => targetFollowingIds.includes(id));

    // Get user details
    const mutualUsers = await this.userModel.find({
      _id: { $in: mutualIds },
    }).select('username profile.avatar');

    // Cache the result
    await this.cacheManager.set(cacheKey, mutualUsers, this.CACHE_TTL);
    
    return mutualUsers;
  }

  /**
   * Get connection suggestions for a user
   */
  async getConnectionSuggestions(userId: string, limit: number = 10): Promise<User[]> {
    // Try to get from cache first
    const cacheKey = `${this.SUGGESTIONS_CACHE_PREFIX}${userId}`;
    const cached = await this.cacheManager.get<User[]>(cacheKey);
    
    if (cached) {
      return cached.slice(0, limit);
    }

    // Get user's current connections
    const userFollowing = await this.followModel.find({ 
      followerId: userId, 
      status: 'active' 
    }).select('followeeId');
    
    const userFollowingIds = userFollowing.map(follow => follow.followeeId.toString());
    
    // Add the user's own ID to exclude from suggestions
    userFollowingIds.push(userId);

    // Find friends of friends
    const friendsOfFriends = await this.followModel.aggregate([
      // Find all people that user's connections follow
      { $match: { followerId: { $in: userFollowingIds }, status: 'active' } },
      { $group: { _id: '$followeeId', count: { $sum: 1 } } },
      // Exclude people the user already follows
      { $match: { _id: { $nin: userFollowingIds.map(id => new Types.ObjectId(id)) } } },
      // Sort by the number of mutual connections
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Find users in the same community
    const userCommunity = await this.getUserCommunity(userId);
    let communityMembers = [];
    
    if (userCommunity) {
      communityMembers = await this.userModel.find({
        _id: { 
          $in: userCommunity.members.map(id => new Types.ObjectId(id)),
          $nin: userFollowingIds.map(id => new Types.ObjectId(id)),
        },
      }).limit(20);
    }

    // Combine and weight suggestions
    const suggestions = [];
    
    // Add friends of friends with weight
    for (const fof of friendsOfFriends) {
      suggestions.push({
        user: await this.userModel.findById(fof._id).select('username profile.avatar'),
        weight: fof.count * 2, // Friends of friends are strong suggestions
      });
    }
    
    // Add community members with weight
    for (const member of communityMembers) {
      // Check if already added as friend of friend
      const existing = suggestions.findIndex(s => s.user._id.toString() === member._id.toString());
      
      if (existing >= 0) {
        suggestions[existing].weight += 1; // Add community member weight
      } else {
        suggestions.push({
          user: member,
          weight: 1, // Community members get base weight
        });
      }
    }

    // Sort by weight and limit
    suggestions.sort((a, b) => b.weight - a.weight);
    const result = suggestions.map(s => s.user);

    // Cache the result
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    
    return result.slice(0, limit);
  }

  /**
   * Generate data for social network visualization
   */
  async getNetworkVisualizationData(userId: string, depth: number = 2): Promise<SocialGraph> {
    // Generate nodes and edges for visualization
    const visited = new Set<string>();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    // Start with the user
    await this.addUserToGraph(userId, nodes, edges, visited, depth);
    
    return { nodes, edges };
  }

  /**
   * Recursively add user and connections to graph
   */
  private async addUserToGraph(
    userId: string,
    nodes: GraphNode[],
    edges: GraphEdge[],
    visited: Set<string>,
    depthRemaining: number,
  ): Promise<void> {
    // Prevent revisiting the same node
    if (visited.has(userId) || depthRemaining < 0) {
      return;
    }
    
    visited.add(userId);
    
    // Get user data
    const user = await this.userModel.findById(userId).select('username profile.avatar');
    
    if (!user) {
      return;
    }
    
    // Get user metrics
    const followerCount = await this.followModel.countDocuments({ 
      followeeId: userId,
      status: 'active',
    });
    
    const followingCount = await this.followModel.countDocuments({ 
      followerId: userId,
      status: 'active',
    });
    
    // Calculate influence score (basic implementation)
    const influence = this.calculateInfluence(followerCount, followingCount);
    
    // Get community
    const community = await this.getUserCommunity(userId);
    
    // Add node
    nodes.push({
      id: userId,
      username: user.username,
      avatar: user.profile?.avatar,
      metrics: {
        followers: followerCount,
        following: followingCount,
        influence,
        communityId: community?.id,
      },
    });
    
    // If at max depth, don't add connections
    if (depthRemaining === 0) {
      return;
    }
    
    // Get connections
    const followers = await this.followModel.find({ 
      followeeId: userId,
      status: 'active',
    }).select('followerId');
    
    const following = await this.followModel.find({ 
      followerId: userId,
      status: 'active',
    }).select('followeeId');
    
    // Add edges for followers
    for (const follower of followers) {
      const followerId = follower.followerId.toString();
      
      // Add edge
      edges.push({
        source: followerId,
        target: userId,
        weight: 1,
        type: EdgeType.FOLLOW,
      });
      
      // Recursively add follower's connections
      await this.addUserToGraph(followerId, nodes, edges, visited, depthRemaining - 1);
    }
    
    // Add edges for following
    for (const follow of following) {
      const followeeId = follow.followeeId.toString();
      
      // Add edge
      edges.push({
        source: userId,
        target: followeeId,
        weight: 1,
        type: EdgeType.FOLLOW,
      });
      
      // Recursively add followee's connections
      await this.addUserToGraph(followeeId, nodes, edges, visited, depthRemaining - 1);
    }
  }

  /**
   * Calculate user influence score
   */
  private calculateInfluence(followers: number, following: number): number {
    // Basic influence calculation
    // Followers have positive impact, too many following has diminishing returns
    const followerScore = Math.log10(followers + 1) * 10;
    const followingPenalty = Math.log10(following + 1) * 2;
    
    return Math.max(0, followerScore - followingPenalty);
  }

  /**
   * Get community for a user
   */
  async getUserCommunity(userId: string): Promise<Community | null> {
    // Get communities from cache
    const communities = await this.getCommunities();
    
    // Find user's community
    return communities.find(community => community.members.includes(userId)) || null;
  }

  /**
   * Get all communities
   */
  async getCommunities(): Promise<Community[]> {
    // Try to get from cache first
    const cached = await this.cacheManager.get<Community[]>(this.COMMUNITY_CACHE_KEY);
    
    if (cached) {
      return cached;
    }

    // Queue a background job to update communities
    await this.graphQueue.add('update-communities', {}, { 
      removeOnComplete: true,
      removeOnFail: true,
    });
    
    // Return empty array if not cached yet
    return [];
  }

  /**
   * Update the social graph - meant to be run in background
   */
  async updateSocialGraph(): Promise<void> {
    this.logger.log('Starting social graph update...');
    
    try {
      // Get all users
      const users = await this.userModel.find().select('_id username profile.avatar');
      
      // Create graph structure
      const graph: SocialGraph = {
        nodes: [],
        edges: [],
      };
      
      // Add nodes
      for (const user of users) {
        const userId = user._id.toString();
        
        // Get follower and following counts
        const followerCount = await this.followModel.countDocuments({ 
          followeeId: userId,
          status: 'active',
        });
        
        const followingCount = await this.followModel.countDocuments({ 
          followerId: userId,
          status: 'active',
        });
        
        // Calculate influence
        const influence = this.calculateInfluence(followerCount, followingCount);
        
        // Add node
        graph.nodes.push({
          id: userId,
          username: user.username,
          avatar: user.profile?.avatar,
          metrics: {
            followers: followerCount,
            following: followingCount,
            influence,
            communityId: undefined, // Will be set later
          },
        });
      }
      
      // Add edges
      const follows = await this.followModel.find({ status: 'active' });
      
      for (const follow of follows) {
        graph.edges.push({
          source: follow.followerId.toString(),
          target: follow.followeeId.toString(),
          weight: 1,
          type: EdgeType.FOLLOW,
        });
      }
      
      // Add interaction edges (likes, comments, shares)
      // This is simplified for brevity

      // Store graph in cache
      await this.cacheManager.set(this.GRAPH_CACHE_KEY, graph, this.CACHE_TTL * 12); // Cache for 12 hours
      
      // Detect communities
      const communities = await this.detectCommunities(graph);
      
      // Update node community IDs
      for (const community of communities) {
        for (const memberId of community.members) {
          const node = graph.nodes.find(n => n.id === memberId);
          if (node) {
            node.metrics.communityId = community.id;
          }
        }
      }
      
      // Store communities in cache
      await this.cacheManager.set(this.COMMUNITY_CACHE_KEY, communities, this.CACHE_TTL * 12); // Cache for 12 hours
      
      this.logger.log('Social graph update completed successfully');
    } catch (error) {
      this.logger.error(`Error updating social graph: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Detect communities in graph using Louvain method
   * This is a simplified implementation
   */
  private async detectCommunities(graph: SocialGraph): Promise<Community[]> {
    this.logger.log('Detecting communities...');
    
    try {
      // Simplified implementation - in a real system, use a proper graph library
      // Basic approach: use the Louvain method for community detection
      
      // For this example, we'll create mock communities based on followers
      const communities: Community[] = [];
      
      // Group users by influence
      const influenceTiers = [
        { min: 50, max: Infinity, id: 1 }, // High influence
        { min: 20, max: 50, id: 2 }, // Medium influence
        { min: 10, max: 20, id: 3 }, // Low-medium influence
        { min: 0, max: 10, id: 4 }, // Low influence
      ];
      
      for (const tier of influenceTiers) {
        const members = graph.nodes
          .filter(node => node.metrics.influence >= tier.min && node.metrics.influence < tier.max)
          .map(node => node.id);
        
        if (members.length > 0) {
          // Find top influencers in this community
          const topInfluencers = graph.nodes
            .filter(node => members.includes(node.id))
            .sort((a, b) => b.metrics.influence - a.metrics.influence)
            .slice(0, 5)
            .map(node => node.id);
          
          communities.push({
            id: tier.id,
            members,
            centralityScore: tier.min, // Simplified
            topInfluencers,
          });
        }
      }
      
      return communities;
    } catch (error) {
      this.logger.error(`Error detecting communities: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Scheduled task to update social graph
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledGraphUpdate() {
    this.logger.log('Running scheduled social graph update...');
    
    try {
      // Add job to queue
      await this.graphQueue.add('update-social-graph', {}, { 
        removeOnComplete: true,
        removeOnFail: true,
      });
    } catch (error) {
      this.logger.error(`Error scheduling social graph update: ${error.message}`, error.stack);
    }
  }

  /**
   * Clear user-specific caches when relationships change
   */
  async invalidateUserCache(userId: string): Promise<void> {
    // Clear user's connection suggestions
    await this.cacheManager.del(`${this.SUGGESTIONS_CACHE_PREFIX}${userId}`);
    
    // Clear mutual connections caches involving this user
    // This is a simplification - in a real system, you'd need to be more targeted
    // For example, you could keep track of cache keys in a separate data structure
    
    // Clear entire social graph cache to rebuild
    // In a production system, you'd want to be more selective
    await this.cacheManager.del(this.GRAPH_CACHE_KEY);
  }
}
