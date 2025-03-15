import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  CreatelyricDto,
  QuerylyricDto,
  UpdatelyricDto,
} from 'src/dto/lyric.dto';
import { lyric, type lyricDocument } from 'src/schemas/lyric.schema';

@Injectable()
export class lyricService {
  constructor(
    @InjectModel(lyric.name) 
    private lyricModel: Model<lyricDocument>, 

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
}
