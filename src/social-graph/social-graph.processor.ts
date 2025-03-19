import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SocialGraphService } from './social-graph.service';

@Processor('social-graph')
export class SocialGraphProcessor {
  private readonly logger = new Logger(SocialGraphProcessor.name);
  
  constructor(private readonly socialGraphService: SocialGraphService) {}

  @Process('update-social-graph')
  async handleSocialGraphUpdate(job: Job) {
    this.logger.debug(`Processing social graph update job ${job.id}`);
    
    try {
      await this.socialGraphService.updateSocialGraph();
      this.logger.debug(`Social graph update job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Error in social graph update job ${job.id}: ${error.message}`, 
        error.stack
      );
      throw error;
    }
  }

  @Process('update-communities')
  async handleCommunitiesUpdate(job: Job) {
    this.logger.debug(`Processing communities update job ${job.id}`);
    
    try {
      // This will trigger the community detection as part of the social graph update
      await this.socialGraphService.updateSocialGraph();
      this.logger.debug(`Communities update job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Error in communities update job ${job.id}: ${error.message}`, 
        error.stack
      );
      throw error;
    }
  }
}
