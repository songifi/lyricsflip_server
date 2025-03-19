import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  CreatelyricDto,
  QuerylyricDto,
  UpdatelyricDto,
} from 'src/dto/lyric.dto';
import { Lyric, lyric, type lyricDocument } from 'src/schemas/lyric.schema';
import { CategoryService } from '../category/category.service';

@Injectable()
export class lyricService {
  constructor(
    @InjectModel(lyric.name) 
    private lyricModel: Model<lyricDocument>, 
    private categoryService: CategoryService,

  ) {}

  async create(createlyricDto: CreatelyricDto): Promise<lyric> {
    const createdlyric = new this.lyricModel(createlyricDto);
    return createdlyric.save();
  }

  async findAll(
    queryDto: QuerylyricDto,
  ): Promise<{ data: lyric[]; total: number }> {
    const {
      title,
      artist,
      album,
      releaseYear,
      genre,
      decade,
      search,
      limit,
      skip,
      withLyrics,
    } = queryDto;

    // Convert limit & skip to numbers with default values
    const parsedLimit = Number(limit) || 10;
    const parsedSkip = Number(skip) || 0;

    // Build query
    const query: any = {};

    if (title) query.title = { $regex: title, $options: 'i' };
    if (artist) query.artist = { $regex: artist, $options: 'i' };
    if (album) query.album = { $regex: album, $options: 'i' };
    if (releaseYear) query.releaseYear = releaseYear;
    if (genre) query.genre = genre;
    if (decade) query.decade = decade;

    // Text search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Create base query
    let baseQuery = this.lyricModel.find(query);

    // Add text score if using text search
    if (search) {
      baseQuery = baseQuery
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      baseQuery = baseQuery.sort({ createdAt: -1 });
    }

    // Apply projection correctly
    if (!withLyrics) {
      baseQuery = baseQuery.select('-lyrics.content');
    }

    // Execute query with pagination
    const data = await baseQuery.limit(parsedLimit).skip(parsedSkip).exec();

    // Get total count for pagination
    const total = await this.lyricModel.countDocuments(query).exec();

    return { data, total };
  }

  async findOne(id: string): Promise<lyric> {
    const lyric = await this.lyricModel.findById(id).exec();
    if (!lyric) {
      throw new NotFoundException(`lyric not found`);
    }
    return lyric;
  }

  async update(id: string, updatelyricDto: UpdatelyricDto): Promise<lyric> {
    const updatedlyric = await this.lyricModel
      .findByIdAndUpdate(id, updatelyricDto, { new: true })
      .exec();

    if (!updatedlyric) {
      throw new NotFoundException(`lyric not found`);
    }

    return updatedlyric;
  }

  async delete(id: string): Promise<void> {
    const result = await this.lyricModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`lyric not found`);
    }
  }

  async findByIds(ids: string[]): Promise<lyric[]> {
    return this.lyricModel.find({ _id: { $in: ids } }).exec();
  }


  
  async addCategory(lyricId: string, categoryId: string, type: 'genres' | 'decades' | 'tags'): Promise<Lyric> {
    const lyric = await this.lyricModel.findById(lyricId);
    if (!lyric) {
      throw new NotFoundException(`Lyric with ID "${lyricId}" not found`);
    }

    // Check if the category is already added
    if (!lyric[type].includes(categoryId)) {
      lyric[type].push(categoryId);
      await lyric.save();
      
      // Increment the usage count for the category
      await this.categoryService.incrementUsageCount(categoryId);
    }

    return lyric;
  }

  async removeCategory(lyricId: string, categoryId: string, type: 'genres' | 'decades' | 'tags'): Promise<Lyric> {
    const lyric = await this.lyricModel.findById(lyricId);
    if (!lyric) {
      throw new NotFoundException(`Lyric with ID "${lyricId}" not found`);
    }

    // Check if the category is present
    if (lyric[type].includes(categoryId)) {
      lyric[type] = lyric[type].filter(id => id.toString() !== categoryId);
      await lyric.save();
      
      // Decrement the usage count for the category
      await this.categoryService.decrementUsageCount(categoryId);
    }

    return lyric;
  }

  async findByCategory(categoryId: string, type?: 'genres' | 'decades' | 'tags'): Promise<Lyric[]> {
    const query: any = {};
    
    if (type) {
      query[type] = categoryId;
    } else {
      // Search in all category types if type is not specified
      query.$or = [
        { genres: categoryId },
        { decades: categoryId },
        { tags: categoryId }
      ];
    }
    
    return this.lyricModel.find(query)
      .populate('genres')
      .populate('decades')
      .populate('tags')
      .exec();
  }




  
async searchByCategories(
  genreIds: string[] = [],
  decadeIds: string[] = [],
  tagIds: string[] = [],
  searchTerm?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: Lyric[]; total: number; page: number; limit: number }> {
  const query: any = {};
  const conditions = [];
  
  // Add genre conditions if provided
  if (genreIds.length > 0) {
    conditions.push({ genres: { $in: genreIds } });
  }
  
  // Add decade conditions if provided
  if (decadeIds.length > 0) {
    conditions.push({ decades: { $in: decadeIds } });
  }
  
  // Add tag conditions if provided
  if (tagIds.length > 0) {
    conditions.push({ tags: { $in: tagIds } });
  }
  
  // Add search term condition if provided
  if (searchTerm) {
    conditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { artist: { $regex: searchTerm, $options: 'i' } },
        { lyrics: { $regex: searchTerm, $options: 'i' } }
      ]
    });
  }
  
  // Combine all conditions with AND logic
  if (conditions.length > 0) {
    query.$and = conditions;
  }
  
  const skip = (page - 1) * limit;
  
  // Execute query with pagination
  const [data, total] = await Promise.all([
    this.lyricModel.find(query)
      .populate('genres')
      .populate('decades')
      .populate('tags')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    this.lyricModel.countDocuments(query)
  ]);
  
  return {
    data,
    total,
    page,
    limit
  };
}
}
