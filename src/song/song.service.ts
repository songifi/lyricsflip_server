import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { CreateSongDto, QuerySongDto, UpdateSongDto } from "src/dto/song.dto";
import { Song, type SongDocument } from "src/schemas/song.chema";


@Injectable()
export class SongService {
  constructor(@InjectModel(Song.name) private songModel: Model<SongDocument>) {}

  async create(createSongDto: CreateSongDto): Promise<Song> {
    const createdSong = new this.songModel(createSongDto);
    return createdSong.save();
  }

  async findAll(queryDto: QuerySongDto): Promise<{ data: Song[]; total: number }> {
    const { title, artist, album, releaseYear, genre, decade, search, limit, skip, withLyrics } = queryDto;
  
    // Convert limit & skip to numbers with default values
    const parsedLimit = Number(limit) || 10; 
    const parsedSkip = Number(skip) || 0;    
  
    // Build query
    const query: any = {};
  
    if (title) query.title = { $regex: title, $options: "i" };
    if (artist) query.artist = { $regex: artist, $options: "i" };
    if (album) query.album = { $regex: album, $options: "i" };
    if (releaseYear) query.releaseYear = releaseYear;
    if (genre) query.genre = genre;
    if (decade) query.decade = decade;
  
    // Text search if provided
    if (search) {
      query.$text = { $search: search };
    }
  
    // Create base query
    let baseQuery = this.songModel.find(query);
  
    // Add text score if using text search
    if (search) {
      baseQuery = baseQuery.select({ score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } });
    } else {
      baseQuery = baseQuery.sort({ createdAt: -1 });
    }
  
    // Apply projection correctly
    if (!withLyrics) {
      baseQuery = baseQuery.select("-lyrics.content"); 
    }
  
    // Execute query with pagination
    const data = await baseQuery.limit(parsedLimit).skip(parsedSkip).exec();
  
    // Get total count for pagination
    const total = await this.songModel.countDocuments(query).exec();
  
    return { data, total };
  }
  

  async findOne(id: string): Promise<Song> {
    const song = await this.songModel.findById(id).exec();
    if (!song) {
      throw new NotFoundException(`Song not found`);
    }
    return song;
  }

  async update(id: string, updateSongDto: UpdateSongDto): Promise<Song> {
    const updatedSong = await this.songModel.findByIdAndUpdate(id, updateSongDto, { new: true }).exec();

    if (!updatedSong) {
      throw new NotFoundException(`Song not found`);
    }

    return updatedSong;
  }

  async delete(id: string): Promise<void> {
    const result = await this.songModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Song not found`);
    }
  }

  async findByIds(ids: string[]): Promise<Song[]> {
    return this.songModel.find({ _id: { $in: ids } }).exec();
  }
}
