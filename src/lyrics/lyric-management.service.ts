import { Injectable } from '@nestjs/common';
import { lyric, lyricDocument } from 'src/schemas/lyric.schema';
import { LyricExtractionOptionsDto } from 'src/dto/lyric.dto';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class LyricsManagementService {
  constructor() {}

  // this fn will Extract partial lyrics for game rounds
public extractPartialLyrics(
    lyrics: string,
    options: LyricExtractionOptionsDto,
  ): string[] {
    if (!lyrics) return [];

    const lines = lyrics.split('\n').filter((line) => line.trim() !== '');
    let extractedLines: string[] = [];

    const minLines = options.minLines || 1;
    const maxLines = options.maxLines || Math.min(20, lines.length);

    if (options.includeChorus) {
      const chorus = lines.filter((line) =>
        line.toLowerCase().includes('chorus'),
      );
      extractedLines = [...extractedLines, ...chorus];
    }

    extractedLines = [...extractedLines, ...lines.slice(0, maxLines)];
    extractedLines = extractedLines.slice(0, maxLines);

    return extractedLines;
  }

  // this fn classifies lyrics according to difficulty levels
 public classifyDifficulty(lyrics: string): 'easy' | 'medium' | 'hard' {
    if (!lyrics) return 'easy';

    const wordCount = lyrics.split(/\s+/).length;

    if (wordCount < 50) return 'easy';
    if (wordCount < 150) return 'medium';
    return 'hard';
  }

  // this fn will format and sanitize lyrics
  public formatAndSanitizeLyrics(lyrics: string): string {
    if (!lyrics) return '';

    //  remove HTML tags and sanitize
    const cleanLyrics = sanitizeHtml(lyrics, {
      allowedTags: [],
      allowedAttributes: {},
    });

    // this is to normalize spacing
    return cleanLyrics.replace(/\s+/g, ' ').trim();
  }

  // Batch processing
  public async processBatchLyrics(
    lyricsList: lyricDocument[],
  ): Promise<lyricDocument[]> {
    return lyricsList.map((lyric) => {
      lyric.lyrics.content = this.formatAndSanitizeLyrics(lyric.lyrics.content);
      lyric['difficulty'] = this.classifyDifficulty(lyric.lyrics.content);
      return lyric;
    });
  }
}
