
// src/category/category.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryType } from 'src/schemas/category.schema';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      const createdCategory = new this.categoryModel(createCategoryDto);
      return await createdCategory.save();
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new ConflictException(`Category with name "${createCategoryDto.name}" already exists for type "${createCategoryDto.type}"`);
      }
      throw error;
    }
  }

  async findAll(type?: CategoryType): Promise<Category[]> {
    const query = type ? { type } : {};
    return this.categoryModel.find(query).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  async findByName(name: string, type: CategoryType): Promise<Category> {
    const category = await this.categoryModel.findOne({ name, type }).exec();
    if (!category) {
      throw new NotFoundException(`Category with name "${name}" and type "${type}" not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const existingCategory = await this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, { new: true })
      .exec();
    
    if (!existingCategory) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    
    return existingCategory;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
  }

  async incrementUsageCount(id: string): Promise<void> {
    await this.categoryModel.findByIdAndUpdate(id, { $inc: { usageCount: 1 } }).exec();
  }

  async decrementUsageCount(id: string): Promise<void> {
    await this.categoryModel.findByIdAndUpdate(
      id, 
      { $inc: { usageCount: -1 } },
      { new: true }
    ).exec();
  }

  async seedDefaultCategories(): Promise<void> {
    const defaultCategories = [
      // Genres
      { name: 'Rock', type: 'genre', description: 'Rock music', isSystem: true },
      { name: 'Pop', type: 'genre', description: 'Pop music', isSystem: true },
      { name: 'Hip-Hop', type: 'genre', description: 'Hip-Hop music', isSystem: true },
      { name: 'R&B', type: 'genre', description: 'R&B music', isSystem: true },
      { name: 'Country', type: 'genre', description: 'Country music', isSystem: true },
      { name: 'Jazz', type: 'genre', description: 'Jazz music', isSystem: true },
      { name: 'Electronic', type: 'genre', description: 'Electronic music', isSystem: true },
      
      // Decades
      { name: '60s', type: 'decade', description: 'Songs from the 1960s', isSystem: true },
      { name: '70s', type: 'decade', description: 'Songs from the 1970s', isSystem: true },
      { name: '80s', type: 'decade', description: 'Songs from the 1980s', isSystem: true },
      { name: '90s', type: 'decade', description: 'Songs from the 1990s', isSystem: true },
      { name: '2000s', type: 'decade', description: 'Songs from the 2000s', isSystem: true },
      { name: '2010s', type: 'decade', description: 'Songs from the 2010s', isSystem: true },
      { name: '2020s', type: 'decade', description: 'Songs from the 2020s', isSystem: true },
      
      // Common Tags
      { name: 'Classic', type: 'tag', description: 'Classic songs', isSystem: true },
      { name: 'Party', type: 'tag', description: 'Party songs', isSystem: true },
      { name: 'Love', type: 'tag', description: 'Love songs', isSystem: true },
      { name: 'Breakup', type: 'tag', description: 'Breakup songs', isSystem: true },
      { name: 'Motivational', type: 'tag', description: 'Motivational songs', isSystem: true },
    ];

    for (const category of defaultCategories) {
      try {
        const existing = await this.categoryModel.findOne({
          name: category.name,
          type: category.type,
        });
        
        if (!existing) {
          await this.categoryModel.create(category);
        }
      } catch (error) {
        console.error(`Failed to seed category: ${category.name}`, error);
      }
    }
  }
}
