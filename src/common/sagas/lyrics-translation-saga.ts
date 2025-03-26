import { Injectable, Logger } from '@nestjs/common';
import { ICommand, IEvent } from 'src/common/events/interfaces';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Saga } from '../../common/events/decorators';
import { EventBusService } from '../../common/events/event-bus.service';
import { 
  LyricsTranslatedEvent,
  LyricsVerifiedEvent
} from '../events/lyrics.events';
import { TranslateAdditionalLanguagesCommand } from '../commands/translate-additional-languages.command';

@Injectable()
export class LyricsTranslationSaga {
  private readonly logger = new Logger(LyricsTranslationSaga.name);
  
  constructor(private readonly eventBus: EventBusService) {}

  // When lyrics are verified, check if we should translate them to additional languages
  @Saga()
  verifiedLyricsTranslation = (events$: Observable<IEvent>): Observable<ICommand> => {
    return events$.pipe(
      filter(event => event instanceof LyricsVerifiedEvent),
      map((event: LyricsVerifiedEvent) => {
        this.logger.debug(
          `Saga: Processing LyricsVerifiedEvent for lyrics ${event.payload.id}`
        );
        
        // Create a command to trigger translations to additional languages
        // for high-priority content (e.g., popular songs)
        return new TranslateAdditionalLanguagesCommand({
          lyricsId: event.payload.id,
          songId: event.payload.songId,
          sourceLanguage: 'en', // This would come from the lyrics entity
          targetLanguages: ['es', 'fr', 'de'], // This could be configurable
          initiatedBy: 'system',
        });
      }),
    );
  }

  // When a translation is completed, check quality and potentially trigger human review
  @Saga()
  translationQualityCheck = (events$: Observable<IEvent>): Observable<ICommand> => {
    return events$.pipe(
      filter(event => event instanceof LyricsTranslatedEvent),
      filter(event => {
        // Only process automatic translations
        const translatedEvent = event as LyricsTranslatedEvent;
        return !translatedEvent.payload.translatorId; // null translatorId means automatic translation
      }),
      map((event: LyricsTranslatedEvent) => {
        this.logger.debug(
          `Saga: Processing LyricsTranslatedEvent for lyrics ${event.payload.id}`
        );
        
        // In a real implementation, you would return a command to
        // trigger quality check or human review
        return null; // Placeholder for the actual command
      }),
      filter(command => !!command), // Filter out null commands
    );
  }
}