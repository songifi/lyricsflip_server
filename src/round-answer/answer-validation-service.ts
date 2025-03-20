// src/modules/round-answer/answer-validation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoundAnswer } from './schemas/round-answer.schema';
import { GameRound } from '../game-round/schemas/game-round.schema';
import { Song } from '../song/schemas/song.schema';
import { UpdateAnswerScoreDto } from './dto/update-answer-score.dto';

@Injectable()
export class AnswerValidationService {
  private readonly logger = new Logger(AnswerValidationService.name);

  constructor(
    @InjectModel(RoundAnswer.name) private roundAnswerModel: Model<RoundAnswer>,
    @InjectModel(GameRound.name) private gameRoundModel: Model<GameRound>,
    @InjectModel(Song.name) private songModel: Model<Song>,
  ) {}

  /**
   * Validate an answer against correct options
   */
  async validateAnswer(answerId: string): Promise<UpdateAnswerScoreDto> {
    // Get the answer
    const answer = await this.roundAnswerModel.findById(answerId);
    if (!answer) {
      throw new Error('Answer not found');
    }

    // Get the round
    const round = await this.gameRoundModel.findById(answer.roundId);
    if (!round) {
      throw new Error('Game round not found');
    }

    // Get the song for this round
    const song = await this.songModel.findById(round.songId);
    if (!song) {
      throw new Error('Song not found');
    }

    // Get the correct answer(s) based on the round configuration
    const correctAnswers = this.getCorrectAnswers(round, song);

    // Calculate response time factor (faster = higher score)
    const maxTimeMs = round.timeLimit * 1000; // convert seconds to ms
    const responseTimeFactor = Math.max(0, 1 - (answer.responseTimeMs / maxTimeMs));

    // Validate the answer
    const validationResult = this.checkAnswer(answer.answer, correctAnswers, round.answerType);

    // Calculate score
    let score = 0;
    if (validationResult.isCorrect) {
      // Base score (can be configured per round/difficulty)
      const baseScore = round.baseScore || 100;
      
      // Apply response time factor (faster answers get higher scores)
      score = Math.round(baseScore * (0.5 + (0.5 * responseTimeFactor)));
      
      // Apply difficulty multiplier if present
      if (round.difficultyMultiplier) {
        score = Math.round(score * round.difficultyMultiplier);
      }
      
      // Apply partial credit if applicable
      if (validationResult.partialCredit) {
        score = Math.round(score * validationResult.partialCredit);
      }
    }

    return {
      score,
      isCorrect: validationResult.isCorrect,
    };
  }

  /**
   * Get correct answers based on round configuration
   */
  private getCorrectAnswers(round: GameRound, song: Song): string[] {
    // This will depend on your game's specific logic
    // For example:
    switch (round.questionType) {
      case 'artistName':
        return [song.artist, ...song.alternateArtistNames || []];
      case 'songTitle':
        return [song.title, ...song.alternateTitles || []];
      case 'lyrics':
        // For lyric questions, the correct answer might be in the round data
        return round.correctAnswers || [song.title];
      case 'album':
        return [song.album];
      case 'year':
        return [song.releaseYear.toString()];
      default:
        return round.correctAnswers || [];
    }
  }

  /**
   * Check if an answer is correct
   */
  private checkAnswer(
    userAnswer: string, 
    correctAnswers: string[], 
    answerType: string = 'exact'
  ): { isCorrect: boolean; partialCredit?: number } {
    // Normalize answers for comparison
    const normalizedUserAnswer = this.normalizeAnswer(userAnswer);
    const normalizedCorrectAnswers = correctAnswers.map(answer => this.normalizeAnswer(answer));
    
    // Different matching strategies based on answerType
    switch (answerType) {
      case 'exact':
        // Exact match (after normalization)
        return {
          isCorrect: normalizedCorrectAnswers.includes(normalizedUserAnswer),
        };
        
      case 'fuzzy':
        // Fuzzy matching (e.g., allowing some typos)
        for (const correctAnswer of normalizedCorrectAnswers) {
          const similarity = this.calculateSimilarity(normalizedUserAnswer, correctAnswer);
          if (similarity >= 0.8) { // 80% similarity threshold
            return {
              isCorrect: true,
              partialCredit: similarity,
            };
          }
        }
        return { isCorrect: false };
        
      case 'contains':
        // Check if user answer contains any correct answer or vice versa
        for (const correctAnswer of normalizedCorrectAnswers) {
          if (normalizedUserAnswer.includes(correctAnswer) || 
              correctAnswer.includes(normalizedUserAnswer)) {
            // Calculate partial credit based on length ratio
            const partialCredit = Math.min(
              normalizedUserAnswer.length / correctAnswer.length,
              correctAnswer.length / normalizedUserAnswer.length
            );
            return {
              isCorrect: true,
              partialCredit: Math.max(0.7, partialCredit), // Minimum 70% credit
            };
          }
        }
        return { isCorrect: false };
        
      case 'multiple-choice':
        // For multiple choice, just check exact match (answer should be the option ID)
        return {
          isCorrect: normalizedCorrectAnswers.includes(normalizedUserAnswer),
        };
        
      default:
        return { isCorrect: false };
    }
  }

  /**
   * Normalize answer for comparison
   */
  private normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ''); // Remove punctuation
  }

  /**
   * Calculate similarity between two strings (Levenshtein distance)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        );
      }
    }
    
    const distance = track[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength > 0 ? 1 - distance / maxLength : 1;
  }

  /**
   * Batch validate all answers for a round
   */
  async validateRoundAnswers(roundId: string): Promise<number> {
    // Get all answers for this round
    const answers = await this.roundAnswerModel.find({ roundId });
    let updatedCount = 0;
    
    // Validate each answer
    for (const answer of answers) {
      try {
        const validationResult = await this.validateAnswer(answer._id);
        
        // Update the answer with validation result
        await this.roundAnswerModel.findByIdAndUpdate(
          answer._id,
          { 
            score: validationResult.score,
            isCorrect: validationResult.isCorrect,
          },
        );
        
        updatedCount++;
      } catch (error) {
        this.logger.error(`Error validating answer ${answer._id}: ${error.message}`);
      }
    }
    
    return updatedCount;
  }
}
