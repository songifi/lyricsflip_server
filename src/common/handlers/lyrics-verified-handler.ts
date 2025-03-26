import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../../../common/events/decorators';
import { IEventHandler } from '../../../common/events/interfaces';
import { LyricsVerifiedEvent } from '../lyrics.events';
import { NotificationService } from '../../../notification/notification.service';
import { AnalyticsService } from '../../../analytics/analytics.service';

@Injectable()
@EventsHandler(LyricsVerifiedEvent)
export class LyricsVerifiedHandler implements IEventHandler<LyricsVerifiedEvent> {
  private readonly logger = new Logger(LyricsVerifiedHandler.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async handle(event: LyricsVerifiedEvent): Promise<void> {
    this.logger.debug(
      `Handling LyricsVerifiedEvent for lyrics id: ${event.payload.id}`
    );

    try {
      // Execute multiple operations in parallel
      await Promise.all([
        // Send notification to the contributor
        this.sendContributorNotification(event),
        
        // Update analytics for verified lyrics
        this.updateAnalytics(event),
      ]);

      this.logger.debug(
        `Successfully processed verification of lyrics ${event.payload.id}`
      );
    } catch (error) {
      this.logger.error(
        `Error processing lyrics verification: ${error.message}`,
        error.stack
      );
    }
  }

  private async sendContributorNotification(event: LyricsVerifiedEvent): Promise<void> {
    try {
      // In a real implementation, you would fetch the contributor ID
      // from the lyrics repository or include it in the event payload
      await this.notificationService.send({
        type: 'LYRICS_VERIFIED',
        recipientId: 'contributor-id', // This would be dynamically determined
        data: {
          lyricsId: event.payload.id,
          songId: event.payload.songId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${error.message}`,
        error.stack
      );
      // Just log the error, don't fail the entire handler
    }
  }

  private async updateAnalytics(event: LyricsVerifiedEvent): Promise<void> {
    try {
      await this.analyticsService.trackEvent('lyrics_verified', {
        lyricsId: event.payload.id,
        songId: event.payload.songId,
        verifiedById: event.payload.verifiedById,
        timestamp: event.metadata.timestamp,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update analytics: ${error.message}`,
        error.stack
      );
      // Just log the error, don't fail the entire handler
    }
  }
}