
// src/category/schemas/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CategoryType = 'genre' | 'decade' | 'tag';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ['genre', 'decade', 'tag'] })
  type: CategoryType;

  @Prop({ trim: true })
  description: string;

  @Prop({ default: false })
  isSystem: boolean;

  @Prop({ default: 0 })
  usageCount: number;
  
  @Prop({ type: String, default: null })
  icon: string;
  
  @Prop({ type: [{ type: String }], default: [] })
  relatedCategories: string[];

  
  // Virtual field for songs count (not stored in database)
  songsCount: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ name: 1, type: 1 }, { unique: true });
CategorySchema.index({ type: 1 });

// A virtual field for songs (not stored in document)
CategorySchema.virtual('songs', {
  ref: 'Lyric',
  localField: '_id',
  foreignField: 'categories',
});