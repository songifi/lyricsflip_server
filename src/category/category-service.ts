import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, In, Like, FindOptionsWhere } from 'typeorm';
import { Category, CategoryType } from './category.entity';
import { CategoryStatistics } from './category-statistics.entity';
import { Song } from '../song/song.entity';
import { CreateCategoryDto, UpdateCategoryDto, CategoryFilterDto } from './category.dto';
import { CacheService } from '../common/cache.service';
import { AuthService } from '../auth/auth.service';
import { User } from '../user/user.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(CategoryStatistics)
    private categoryStatsRepository: Repository<CategoryStatistics>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    private connection: Connection,
    private cacheService: CacheService,
    private authService: AuthService,
  ) {
    // Initialize predefined genres and decades
    this.initializePredefinedCategories();
  }

  /**
   * Initialize predefined genre and decade categories if they don't exist
   */
  private async initializePredefinedCategories(): Promise<void> {
    const genres = [
      'Rock', 'Pop', 'Hip-Hop', 'R&B', 'Country', 'Jazz', 'Blues',
      'Electronic', 'Classical', 'Folk', 'Reggae', 'Metal', 'Punk',
      'Soul', 'Funk', 'Disco', 'Alternative', 'Indie', 'K-Pop', 'J-Pop'
    ];

    const decades = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

    // Create genre categories
    await Promise.all(
      genres.map(async (genreName) => {
        const existingGenre = await this.categoryRepository.findOne({
          where: { name: genreName, type: CategoryType.GENRE }
        });

        if (!existingGenre) {
          const genre = this.categoryRepository.create({
            name: genreName,
            type: CategoryType.GENRE,
            description: `${genreName} music genre`,
            tags: [genreName.toLowerCase()],
          });
          await this.categoryRepository.save(genre);
          this.logger.log(`Created genre category: ${genreName}`);
        }
      })
    );

    // Create decade categories
    await Promise.all(
      decades.map(async (decadeName) => {
        const existingDecade = await this.categoryRepository.findOne({
          where: { name: decadeName, type: CategoryType.DECADE }
        });

        if (!existingDecade) {
          const decade = this.categoryRepository.create({
            name: decadeName,
            type: CategoryType.DECADE,
            description: `Music from the ${decadeName}`,
            tags: [decadeName.toLowerCase()],
          });
          await this.categoryRepository.save(decade);
          this.logger.log(`Created decade category: ${decadeName}`);
        }
      })
    );
  }

  /**
   * Create a new category
   */
  async create(createCategoryDto: CreateCategoryDto, currentUser: User): Promise<Category> {
    // Check user permissions for creating categories
    if (!this.authService.canManageCategories(currentUser)) {
      throw new ForbiddenException('You do not have permission to create categories');
    }

    // Check if category with same name already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name }
    });

    if (existingCategory) {
      throw new ConflictException(`Category with name "${createCategoryDto.name}" already exists`);
    }

    // Start a transaction
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create a new category
      const category = this.categoryRepository.create(createCategoryDto);
      
      // Save the category
      const savedCategory = await queryRunner.manager.save(category);
      
      // Create initial statistics
      const statistics = this.categoryStatsRepository.create({
        category: savedCategory,
        songCount: 0,
        totalListens: 0,
        totalLikes: 0,
      });
      
      await queryRunner.manager.save(statistics);
      
      // Commit transaction
      await queryRunner.commitTransaction();

      // Clear cache
      await this.cacheService.invalidate(`categories:*`);
      
      return savedCategory;
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create category: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Find all categories with optional filtering
   */
  async findAll(filterDto: CategoryFilterDto): Promise<Category[]> {
    const cacheKey = `categories:${JSON.stringify(filterDto)}`;
    
    // Try to get from cache first
    const cachedCategories = await this.cacheService.get<Category[]>(cacheKey);
    if (cachedCategories) {
      return cachedCategories;
    }

    // Build where clause for filtering
    const where: FindOptionsWhere<Category> = {};
    
    if (filterDto.type) {
      where.type = filterDto.type;
    }
    
    if (filterDto.isActive !== undefined) {
      where.isActive = filterDto.isActive;
    }
    
    if (filterDto.search) {
      where.name = Like(`%${filterDto.search}%`);
    }
    
    const categories = await this.categoryRepository.find({
      where,
      relations: ['statistics'],
      order: { name: 'ASC' }
    });
    
    // Filter by tags if provided
    let filteredCategories = categories;
    if (filterDto.tags) {
      const tagList = filterDto.tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredCategories = categories.filter(category => 
        category.tags && category.tags.some(tag => tagList.includes(tag))
      );
    }
    
    // Cache the result
    await this.cacheService.set(cacheKey, filteredCategories, 60 * 15); // Cache for 15 minutes
    
    return filteredCategories;
  }

  /**
   * Find a category by ID
   */
  async findOne(id: string): Promise<Category> {
    const cacheKey = `category:${id}`;
    
    // Try to get from cache first
    const cachedCategory = await this.cacheService.get<Category>(cacheKey);
    if (cachedCategory) {
      return cachedCategory;
    }

    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['statistics', 'songs'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // Cache the result
    await this.cacheService.set(cacheKey, category, 60 * 15); // Cache for 15 minutes
    
    return category;
  }

  /**
   * Update a category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto, currentUser: User): Promise<Category> {
    // Check user permissions for updating categories
    if (!this.authService.canManageCategories(currentUser)) {
      throw new ForbiddenException('You do not have permission to update categories');
    }

    // Get the existing category
    const category = await this.findOne(id);

    // Check for name conflicts
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name }
      });

      if (existingCategory) {
        throw new ConflictException(`Category with name "${updateCategoryDto.name}" already exists`);
      }
    }

    // Update the category
    Object.assign(category, updateCategoryDto);
    
    // Save the updated category
    const updatedCategory = await this.categoryRepository.save(category);
    
    // Invalidate cache
    await this.cacheService.invalidate(`category:${id}`);
    await this.cacheService.invalidate(`categories:*`);
    
    return updatedCategory;
  }

  /**
   * Delete a category
   */
  async remove(id: string, currentUser: User): Promise<void> {
    // Check user permissions for deleting categories
    if (!this.authService.canManageCategories(currentUser)) {
      throw new ForbiddenException('You do not have permission to delete categories');
    }

    // Get the category first to verify it exists
    const category = await this.findOne(id);
    
    // Start a transaction
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Delete statistics first
      await queryRunner.manager.delete(CategoryStatistics, { category: { id } });
      
      // Delete the category
      await queryRunner.manager.remove(category);
      
      // Commit transaction
      await queryRunner.commitTransaction();
      
      // Invalidate cache
      await this.cacheService.invalidate(`category:${id}`);
      await this.cacheService.invalidate(`categories:*`);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to delete category: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Add a song to a category
   */
  async addSongToCategory(categoryId: string, songId: string, currentUser: User): Promise<Category> {
    // Check user permissions
    if (!this.authService.canManageSongs(currentUser)) {
      throw new ForbiddenException('You do not have permission to add songs to categories');
    }

    // Get the category and song
    const category = await this.findOne(categoryId);
    const song = await this.songRepository.findOne({
      where: { id: songId },
      relations: ['categories'],
    });

    if (!song) {
      throw new NotFoundException(`Song with ID "${songId}" not found`);
    }

    // Check if the song is already in the category
    const isSongInCategory = song.categories?.some(cat => cat.id === categoryId);
    if (isSongInCategory) {
      throw new ConflictException(`Song is already in the category`);
    }

    // Start a transaction
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Add song to category
      if (!category.songs) {
        category.songs = [];
      }
      category.songs.push(song);
      
      // Update category
      await queryRunner.manager.save(category);
      
      // Update category statistics
      const statistics = await this.categoryStatsRepository.findOne({
        where: { category: { id: categoryId } }
      });
      
      if (statistics) {
        statistics.songCount += 1;
        await queryRunner.manager.save(statistics);
      }
      
      // Commit transaction
      await queryRunner.commitTransaction();
      
      // Invalidate cache
      await this.cacheService.invalidate(`category:${categoryId}`);
      
      return this.findOne(categoryId);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to add song to category: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Remove a song from a category
   */
  async removeSongFromCategory(categoryId: string, songId: string, currentUser: User): Promise<Category> {
    // Check user permissions
    if (!this.authService.canManageSongs(currentUser)) {
      throw new ForbiddenException('You do not have permission to remove songs from categories');
    }

    // Get the category
    const category = await this.findOne(categoryId);
    
    // Check if the song is in the category
    const songIndex = category.songs?.findIndex(song => song.id === songId);
    if (songIndex === -1 || songIndex === undefined) {
      throw new BadRequestException(`Song is not in the category`);
    }

    // Start a transaction
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Remove song from category
      category.songs.splice(songIndex, 1);
      
      // Update category
      await queryRunner.manager.save(category);
      
      // Update category statistics
      const statistics = await this.categoryStatsRepository.findOne({
        where: { category: { id: categoryId } }
      });
      
      if (statistics && statistics.songCount > 0) {
        statistics.songCount -= 1;
        await queryRunner.manager.save(statistics);
      }
      
      // Commit transaction
      await queryRunner.commitTransaction();
      
      // Invalidate cache
      await this.cacheService.invalidate(`category:${categoryId}`);
      
      return this.findOne(categoryId);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to remove song from category: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Get songs in a category
   */
  async getSongsInCategory(categoryId: string, page = 1, limit = 20): Promise<{ songs: Song[], total: number }> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['songs'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    const songs = category.songs || [];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      songs: songs.slice(startIndex, endIndex),
      total: songs.length
    };
  }

  /**
   * Add a tag to a category
   */
  async addTagToCategory(categoryId: string, tag: string, currentUser: User): Promise<Category> {
    // Check user permissions
    if (!this.authService.canManageCategories(currentUser)) {
      throw new ForbiddenException('You do not have permission to add tags to categories');
    }

    // Get the category
    const category = await this.findOne(categoryId);
    
    // Add tag
    category.addTag(tag.toLowerCase().trim());
    
    // Save the category
    await this.categoryRepository.save(category);
    
    // Invalidate cache
    await this.cacheService.invalidate(`category:${categoryId}`);
    await this.cacheService.invalidate(`categories:*`);
    
    return category;
  }

  /**
   * Remove a tag from a category
   */
  async removeTagFromCategory(categoryId: string, tag: string, currentUser: User): Promise<Category> {
    // Check user permissions
    if (!this.authService.canManageCategories(currentUser)) {
      throw new ForbiddenException('You do not have permission to remove tags from categories');
    }

    // Get the category
    const category = await this.findOne(categoryId);
    
    // Remove tag
    category.removeTag(tag.toLowerCase().trim());
    
    // Save the category
    await this.categoryRepository.save(category);
    
    // Invalidate cache
    await this.cacheService.invalidate(`category:${categoryId}`);
    await this.cacheService.invalidate(`categories:*`);
    
    return category;
  }

  /**
   * Categorize a song automatically based on its metadata
   * This is a helper method that could be called from SongService
   */
  async categorizeSong(song: Song): Promise<void> {
    // No transaction needed as this is called from another service that should handle transactions
    
    // Categorize by genre if available
    if (song.metadata && song.metadata.genre) {
      const genreName = song.metadata.genre;
      const genre = await this.categoryRepository.findOne({
        where: { name: Like(`%${genreName}%`), type: CategoryType.GENRE },
        relations: ['songs'],
      });
      
      if (genre) {
        // Add song to genre if not already added
        const isSongInGenre = genre.songs?.some(s => s.id === song.id);
        if (!isSongInGenre) {
          if (!genre.songs) {
            genre.songs = [];
          }
          genre.songs.push(song);
          await this.categoryRepository.save(genre);
          
          // Update statistics
          await this.updateCategoryStats(genre.id);
        }
      }
    }
    
    // Categorize by decade if year is available
    if (song.metadata && song.metadata.year) {
      const year = parseInt(song.metadata.year);
      if (!isNaN(year)) {
        const decade = Math.floor(year / 10) * 10;
        const decadeName = `${decade}s`;
        
        const decadeCategory = await this.categoryRepository.findOne({
          where: { name: decadeName, type: CategoryType.DECADE },
          relations: ['songs'],
        });
        
        if (decadeCategory) {
          // Add song to decade if not already added
          const isSongInDecade = decadeCategory.songs?.some(s => s.id === song.id);
          if (!isSongInDecade) {
            if (!decadeCategory.songs) {
              decadeCategory.songs = [];
            }
            decadeCategory.songs.push(song);
            await this.categoryRepository.save(decadeCategory);
            
            // Update statistics
            await this.updateCategoryStats(decadeCategory.id);
          }
        }
      }
    }
  }

  /**
   * Update category statistics
   */
  async updateCategoryStats(categoryId: string): Promise<CategoryStatistics> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['songs', 'statistics'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    const songs = category.songs || [];
    
    // Get statistics record or create if it doesn't exist
    let statistics = category.statistics?.[0];
    if (!statistics) {
      statistics = this.categoryStatsRepository.create({
        category,
        songCount: 0,
        totalListens: 0,
        totalLikes: 0,
      });
    }
    
    // Update statistics
    statistics.songCount = songs.length;
    statistics.totalListens = songs.reduce((total, song) => total + (song.listens || 0), 0);
    statistics.totalLikes = songs.reduce((total, song) => total + (song.likes || 0), 0);
    
    // Save statistics
    return this.categoryStatsRepository.save(statistics);
  }

  /**
   * Get popular categories based on song count, listens, or likes
   */
  async getPopularCategories(type?: CategoryType, limit = 10): Promise<Category[]> {
    const cacheKey = `popular-categories:${type || 'all'}:${limit}`;
    
    // Try to get from cache first
    const cachedCategories = await this.cacheService.get<Category[]>(cacheKey);
    if (cachedCategories) {
      return cachedCategories;
    }

    // Build query
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.statistics', 'statistics')
      .orderBy('statistics.songCount', 'DESC')
      .addOrderBy('statistics.totalListens', 'DESC')
      .take(limit);
    
    if (type) {
      query.where('category.type = :type', { type });
    }
    
    const categories = await query.getMany();
    
    // Cache the result
    await this.cacheService.set(cacheKey, categories, 60 * 60); // Cache for 1 hour
    
    return categories;
  }
}