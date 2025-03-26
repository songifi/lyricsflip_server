import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../../../common/events/decorators';
import { IEventHandler } from '../../../common/events/interfaces';
import { LyricsCreatedEvent } from '../lyrics.events';
import { SearchService } from '../../../search/search.service';

@Injectable()
@EventsHandler(LyricsCreatedEvent)
export class LyricsCreatedHandler implements IEventHandler<LyricsCreatedEvent> {
  private readonly logger = new Logger(LyricsCreatedHandler.name);

  constructor(
    private readonly searchService: SearchService,
  ) {}

  async handle(event: LyricsCreatedEvent): Promise<void> {
    this.logger.debug(
      `Handling LyricsCreatedEvent for lyrics id: ${event.payload.id}`
    );

    try {
      // Index the lyrics in search engine
      await this.searchService.indexLyrics({
        id: event.payload.id,
        content: event.payload.content,
        language: event.payload.language,
        songId: event.payload.songId,
      });

      this.logger.debug(
        `Successfully indexed lyrics ${event.payload.id} in search engine`
      );
    } catch (error) {
      this.logger.error(
        `Failed to index lyrics: ${error.message}`,
        error.stack
      );
      // In a real implementation, you might want to implement retry logic
      // or move the failed event to a dead-letter queue
    }
  }
}