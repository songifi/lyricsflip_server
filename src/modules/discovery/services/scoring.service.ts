import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  
  // Weight coefficients for different factors
  private readonly weights = {
    likes: 1.0,
    comments: 2.0,
    shares: 3.0,
    saves: 2.5,
    views: 0.1,
    age: 0.8, // Higher means older content decays faster
    quality: 1.5
  };

  /**
   * Calculate content popularity score
   */
  calculatePopularityScore(
    content: any, 
    interactions: any[], 
    options: { ignoreAge?: boolean } = {}
  ): number {
    if (!content || !interactions) {
      return 0;
    }
    
    // Group interactions by type
    const interactionCounts = {
      like: 0,
      comment: 0,
      share: 0,
      save: 0,
      view: 0
    };
    
    interactions.forEach(interaction => {
      if (interactionCounts[interaction.type] !== undefined) {
        interactionCounts[interaction.type]++;
      }
    });
    
    // Calculate base interaction score
    let interactionScore = 
      (interactionCounts.like * this.weights.likes) +
      (interactionCounts.comment * this.weights.comments) +
      (interactionCounts.share * this.weights.shares) +
      (interactionCounts.save * this.weights.saves) +
      (interactionCounts.view * this.weights.views);
    
    // Logarithmic scaling to prevent very popular content from dominating
    interactionScore = interactionScore > 0 
      ? Math.log10(1 + interactionScore) * 10 
      : 0;
    
    // Apply quality multiplier if available
    if (content.qualityScore) {
      interactionScore *= (1 + (content.qualityScore * this.weights.quality));
    }
    
    // Apply time decay if not ignored
    if (!options.ignoreAge && content.createdAt) {
      const ageInDays = this.getContentAgeInDays(content.createdAt);
      // Decay formula: score * (1 / (1 + age_factor * age))
      // This creates a decay that's less aggressive at first but increases over time
      const timeDecay = 1 / (1 + (this.weights.age * ageInDays / 30)); // Scaled by 30 days
      interactionScore *= timeDecay;
    }
    
    // Normalize score to 0-100 range
    return Math.min(100, interactionScore);
  }

  /**
   * Calculate content quality score based on engagement ratios
   */
  calculateQualityScore(content: any, interactions: any[]): number {
    if (!content || !interactions || interactions.length === 0) {
      return 0;
    }
    
    // Group interactions by type
    const interactionCounts = {
      like: 0,
      comment: 0,
      share: 0,
      save: 0,
      view: 0
    };
    
    interactions.forEach(interaction => {
      if (interactionCounts[interaction.type] !== undefined) {
        interactionCounts[interaction.type]++;
      }
    });
    
    // Calculate meaningful engagement ratio
    // Views should be at least 1 to avoid division by zero
    const views = Math.max(1, interactionCounts.view);
    
    // Engagement ratios
    const engagementRatios = {
      likeRatio: interactionCounts.like / views,
      commentRatio: interactionCounts.comment / views,
      shareRatio: interactionCounts.share / views,
      saveRatio: interactionCounts.save / views
    };
    
    // Calculate composite quality score
    const qualityScore = 
      (engagementRatios.likeRatio * 50) + 
      (engagementRatios.commentRatio * 100) +
      (engagementRatios.shareRatio * 150) +
      (engagementRatios.saveRatio * 125);
    
    // Normalize to 0-1 range with logarithmic scaling
    return Math.min(1, Math.log10(1 + qualityScore) / 2);
  }

  /**
   * Normalize a score to a specific range
   */
  normalizeScore(score: number, min: number = 0, max: number = 100): number {
    return Math.min(max, Math.max(min, score));
  }

  /**
   * Get content age in days
   */
  private getContentAgeInDays(createdAt: Date | string): number {
    const creationDate = new Date(createdAt);
    const now = new Date();
    const ageInMs = now.getTime() - creationDate.getTime();
    return ageInMs / (1000 * 60 * 60 * 24); // Convert to days
  }
}
