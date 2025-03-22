import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);
  private readonly experiments: Record<string, string[]> = {};
  
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService
  ) {
    // Initialize experiments from config
    this.initializeExperiments();
  }

  /**
   * Initialize A/B testing experiments from configuration
   */
  private initializeExperiments(): void {
    // Default recommendation algorithms
    this.experiments['recommendation_algorithm'] = [
      'collaborative-filtering',
      'content-based',
      'hybrid'
    ];
    
    // Try to load from config
    const configExperiments = this.configService.get('AB_TESTING_EXPERIMENTS');
    if (configExperiments) {
      try {
        const parsed = JSON.parse(configExperiments);
        Object.assign(this.experiments, parsed);
        this.logger.log(`Loaded ${Object.keys(parsed).length} experiments from config`);
      } catch (error) {
        this.logger.error(`Error parsing AB testing experiments: ${error.message}`);
      }
    }
  }

  /**
   * Get recommendation algorithm variant for a user
   */
  getRecommendationAlgorithm(userId: string): string {
    return this.getExperimentVariant(userId, 'recommendation_algorithm');
  }

  /**
   * Get experiment variant for a user
   */
  getExperimentVariant(userId: string, experimentName: string): string {
    // Get available variants
    const variants = this.experiments[experimentName];
    if (!variants || variants.length === 0) {
      // Return default if no variants defined
      return experimentName === 'recommendation_algorithm' 
        ? 'hybrid' 
        : null;
    }
    
    // Use consistent hashing to assign variant
    const hash = createHash('md5')
      .update(`${userId}:${experimentName}`)
      .digest('hex');
    
    // Convert hash to number and get modulo of variants length
    const hashNum = parseInt(hash.substring(0, 8), 16);
    const variantIndex = hashNum % variants.length;
    
    // Record exposure asynchronously
    this.recordExposure(userId, experimentName, variants[variantIndex])
      .catch(err => this.logger.error(`Error recording experiment exposure: ${err.message}`));
    
    return variants[variantIndex];
  }

  /**
   * Record experiment exposure for analytics
   */
  private async recordExposure(
    userId: string,
    experimentName: string,
    variant: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const exposureKey = `experiment:exposure:${experimentName}:${userId}`;
      
      // Record the current variant for the user
      await this.redis.set(exposureKey, variant);
      
      // Increment exposure count for this variant
      const countKey = `experiment:count:${experimentName}:${variant}`;
      await this.redis.incr(countKey);
      
      // Add to exposure log (limited to recent entries)
      const logKey = `experiment:log:${experimentName}`;
      const logEntry = JSON.stringify({
        userId,
        variant,
        timestamp: now
      });
      
      await this.redis.lpush(logKey, logEntry);
      await this.redis.ltrim(logKey, 0, 999); // Keep last 1000 exposures
      
    } catch (error) {
      this.logger.error(`Error recording experiment exposure: ${error.message}`, error.stack);
    }
  }

  /**
   * Record conversion for an experiment
   */
  async recordConversion(
    userId: string,
    experimentName: string,
    conversionType: string
  ): Promise<void> {
    try {
      // Get the variant assigned to this user
      const exposureKey = `experiment:exposure:${experimentName}:${userId}`;
      const variant = await this.redis.get(exposureKey);
      
      if (!variant) {
        this.logger.warn(`No exposure found for user ${userId} in experiment ${experimentName}`);
        return;
      }
      
      const now = new Date().toISOString();
      
      // Increment conversion count for this variant
      const countKey = `experiment:conversion:${experimentName}:${variant}:${conversionType}`;
      await this.redis.incr(countKey);
      
      // Add to conversion log
      const logKey = `experiment:conversion:log:${experimentName}`;
      const logEntry = JSON.stringify({
        userId,
        variant,
        conversionType,
        timestamp: now
      });
      
      await this.redis.lpush(logKey, logEntry);
      await this.redis.ltrim(logKey, 0, 999); // Keep last 1000 conversions
      
    } catch (error) {
      this.logger.error(`Error recording experiment conversion: ${error.message}`, error.stack);
    }
  }

  /**
   * Get experiment metrics
   */
  async getExperimentMetrics(experimentName: string): Promise<any> {
    try {
      const variants = this.experiments[experimentName];
      if (!variants || variants.length === 0) {
        return { error: 'Experiment not found' };
      }
      
      const metrics = {};
      
      // Collect metrics for each variant
      for (const variant of variants) {
        // Get exposure count
        const exposureKey = `experiment:count:${experimentName}:${variant}`;
        const exposures = parseInt(await this.redis.get(exposureKey) || '0');
        
        // Get conversion counts
        const conversionPattern = `experiment:conversion:${experimentName}:${variant}:*`;
        const conversionKeys = await this.redis.keys(conversionPattern);
        
        const conversions = {};
        for (const key of conversionKeys) {
          const conversionType = key.split(':').pop();
          conversions[conversionType] = parseInt(await this.redis.get(key) || '0');
        }
        
        // Calculate conversion rates
        const conversionRates = {};
        for (const [type, count] of Object.entries(conversions)) {
          conversionRates[type] = exposures > 0 
            ? (count as number) / exposures
            : 0;
        }
        
        metrics[variant] = {
          exposures,
          conversions,
          conversionRates
        };
      }
      
      return {
        experimentName,
        variants,
        metrics,
        startDate: await this.redis.get(`experiment:start:${experimentName}`) || 'unknown'
      };
      
    } catch (error) {
      this.logger.error(`Error getting experiment metrics: ${error.message}`, error.stack);
      return { error: error.message };
    }
  }
}
