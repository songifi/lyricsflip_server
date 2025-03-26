import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TranslateAdditionalLanguagesCommand } from '../translate-additional-languages.command';
import { LyricsService } from '../../lyrics.service';
import { TranslationService } from '../../../translation/translation.service';

@Injectable()
@CommandHandler(TranslateAdditionalLanguagesCommand)
export class TranslateAdditionalLanguagesHandler 
  implements ICommandHandler<TranslateAdditionalLanguagesCommand> {
  
  private readonly logger = new Logger(TranslateAdditionalLanguagesHandler.name);
  
  constructor(
    private readonly lyricsService: LyricsService,
    private readonly translationService: TranslationService,
  ) {}
  
  async execute(command: TranslateAdditionalLanguagesCommand): Promise<void> {
    this.logger.debug(
      `Executing TranslateAdditionalLanguagesCommand for lyrics ${command.payload.lyricsId}`
    );
    
    try {
      // Get original lyrics content
      const lyrics = await this.lyricsService.findOne(command.payload.lyricsId);
      
      if (!lyrics) {
        this.logger.warn(`Lyrics not found: ${command.payload.lyricsId}`);
        return;
      }
      
      // Process translations in parallel
      await Promise.all(
        command.payload.targetLanguages.map(async (targetLanguage) => {
          try {
            // Check if translation already exists
            const existingTranslation = await this.lyricsService.findTranslation(
              command.payload.lyricsId,
              targetLanguage
            );
            
            if (existingTranslation) {
              this.logger.debug(
                `Translation already exists for language ${targetLanguage}`
              );
              return;
            }
            
            // Request translation
            const translatedContent = await this.translationService.translateText(
              lyrics.content,
              command.payload.sourceLanguage,
              targetLanguage
            );
            
            // Save translation
            await this.lyricsService.createTranslation({
              originalLyricsId: command.payload.lyricsId,
              content: translatedContent,
              language: targetLanguage,
              songId: command.payload.songId,
              isAutomaticTranslation: true,
            });
            
            this.logger.debug(
              `Successfully created translation for language ${targetLanguage}`
            );
          } catch (error) {
            this.logger.error(
              `Failed to translate lyrics to ${targetLanguage}: ${error.message}`,
              error.stack
            );
            // Continue with other languages even if one fails
          }
        })
      );
    } catch (error) {
      this.logger.error(
        `Error executing translation command: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}