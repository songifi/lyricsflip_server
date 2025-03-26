import { ICommand } from '../../common/events/interfaces';

export interface TranslateAdditionalLanguagesPayload {
  lyricsId: string;
  songId: string;
  sourceLanguage: string;
  targetLanguages: string[];
  initiatedBy: string;
}

export class TranslateAdditionalLanguagesCommand implements ICommand {
  readonly name = 'translate-additional-languages';
  
  constructor(public readonly payload: TranslateAdditionalLanguagesPayload) {}
}