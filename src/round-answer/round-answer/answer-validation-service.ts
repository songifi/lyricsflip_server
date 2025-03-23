import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameRoundService } from '../game-round/game-round.service';
import { SongService } from '../song/song.service';
import * as sanitizeHtml from 'sanitize-html';

interface ValidationResult {
  isCorrect: boolean;
  score: number;
  details: Record<string, any>;
}

@Injectable()
export class AnswerValidationService {
  private readonly logger = new Logger(AnswerValidationService.name);
  private readonly forbiddenWords: string[];
  private readonly maxAnswerLength: number;
  private readonly minAnswerLength: number;

  constructor(
    private configService: ConfigService,
    private gameRoundService: GameRoundService,
    private songService: SongService,
  ) {
    // Load configuration
    this.forbiddenWords = this.configService.get<string>('FORBIDDEN_WORDS', '')
      .split(',')
      .map(word => word.trim().toLowerCase());
    
    this.maxAnswerLength = this.configService.get<number>('MAX_ANSWER_LENGTH', 2000);
    this.minAnswerLength = this.configService.get<number>('MIN_ANSWER_LENGTH', 1);
  }

  /**
   * Validate answer content for length, forbidden words, etc.
   * @param answerText The answer text to validate
   * @returns Array of validation error messages (empty if valid)
   */
  validateAnswerContent(answerText: string): string[] {
    const errors: string[] = [];
    
    // Check for empty answer
    if (!answerText || answerText.trim().length === 0) {
      errors.push('Answer cannot be empty');
      return errors;
    }
    
    // Check length
    if (answerText.length > this.maxAnswerLength) {
      errors.push(`Answer exceeds maximum length of ${this.maxAnswerLength} characters`);
    }
    
    if (answerText.length < this.minAnswerLength) {
      errors.push(`Answer must be at least ${this.minAnswerLength} characters long`);
    }
    
    // Check for forbidden words
    const lowerAnswer = answerText.toLowerCase();
    for (const word of this.forbiddenWords) {
      if (lowerAnswer.includes(word)) {
        errors.push('Answer contains inappropriate content');
        break;
      }
    }
    
    // Check for potentially harmful content
    if (this.containsScriptTags(answerText)) {
      errors.push('Answer contains disallowed HTML content');
    }
    
    return errors;
  }

  /**
   * Sanitize answer text to remove any potentially dangerous content
   * @param answerText The answer text to sanitize
   * @returns Sanitized answer text
   */
  sanitizeAnswerText(answerText: string): string {
    return sanitizeHtml(answerText, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape'
    });
  }

  /**
   * Check if text contains script tags or other potentially harmful content
   * @param text The text to check
   * @returns True if potentially harmful content found
   */
  private containsScriptTags(text: string): boolean {
    const scriptRegex = /<script[^>]*>[\s\S]*?<\/script>|javascript:|on\w+=/i;
    return scriptRegex.test(text);
  }

  /**
   * Auto-validate an answer based on round criteria
   * @param answerText The answer text to validate
   * @param roundId The round ID for context
   * @returns Validation result
   */
  async autoValidateAnswer(answerText: string, roundId: string): Promise<ValidationResult> {
    try {
      // Get round and associated song
      const round = await this.gameRoundService.findOne(roundId);
      const song = await this.songService.findOne(round.songId);
      
      // Basic validation first
      const validationErrors = this.validateAnswerContent(answerText);
      if (validationErrors.length > 0) {
        return {
          isCorrect: false,
          score: 0,
          details: {
            errors: validationErrors,
            message: 'Answer failed validation'
          }
        };
      }
      
      // Basic text matching (could be more sophisticated in real implementation)
      const correctLyrics = song.lyrics || '';
      const isExactMatch = this.compareAnswerToLyrics(answerText, correctLyrics);
      
      // Calculate similarity score
      const similarityScore = this.calculateSimilarityScore(answerText, correctLyrics);
      
      // Determine if answer is correct based on similarity threshold
      const isCorrect = isExactMatch || similarityScore > 80;
      
      // Calculate score based on similarity (0-100)
      const score = Math.round(similarityScore);
      
      return {
        isCorrect,
        score,
        details: {
          similarityScore,
          exactMatch: isExactMatch,
          message: isCorrect ? 'Answer matches lyrics' : 'Answer does not match lyrics closely enough'
        }
      };
    } catch (error) {
      this.logger.error(`Error auto-validating answer: ${error.message}`, error.stack);
      
      // Return default failed validation
      return {
        isCorrect: false,
        score: 0,
        details: {
          error: 'Validation error occurred',
          message: 'Could not validate answer'
        }
      };
    }
  }

  /**
   * Compare answer text to correct lyrics
   * @param answerText The user's answer
   * @param correctLyrics The correct lyrics
   * @returns True if exact match (ignoring case and whitespace)
   */
  private compareAnswerToLyrics(answerText: string, correctLyrics: string): boolean {
    const normalizedAnswer = answerText.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedLyrics = correctLyrics.toLowerCase().trim().replace(/\s+/g, ' ');
    
    return normalizedAnswer === normalizedLyrics;
  }

  /**
   * Calculate similarity score between answer and correct lyrics
   * @param answerText The user's answer
   * @param correctLyrics The correct lyrics
   * @returns Similarity score (0-100)
   */
  private calculateSimilarityScore(answerText: string, correctLyrics: string): number {
    // Normalize texts
    const normalizedAnswer = answerText.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedLyrics = correctLyrics.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Simple implementation using Levenshtein distance
    // In a real app, consider using more sophisticated algorithms
    const distance = this.levenshteinDistance(normalizedAnswer, normalizedLyrics);
    const maxLength = Math.max(normalizedAnswer.length, normalizedLyrics.length);
    
    if (maxLength === 0) return 100; // Both strings empty
    
    // Convert distance to similarity score (0-100)
    const similarity = Math.max(0, 100 - (distance / maxLength * 100));
    
    return similarity;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param a First string
   * @param b Second string
   * @returns Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[b.length][a.length];
  }
}
