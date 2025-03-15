// import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';
import { Decade, Genre } from 'src/enum/lyric.enum';
export type lyricDocument = lyric & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class lyric {
  @Prop({ required: true, trim: true, index: true })
  title!: string;

  @Prop({ required: true, trim: true, index: true })
  artist!: string;

  @Prop({ required: false, trim: true })
  album!: string;

  @Prop({
    required: false,
    min: 1900,
    max: new Date().getFullYear(),
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value for release year',
    },
  })
  releaseYear!: number;

  @Prop({
    required: false,
    enum: Genre,
  })
  genre!: string;

  @Prop({
    required: false,
    type: {
      content: { type: String, required: true },
      language: { type: String, required: false, default: 'en' },
    },
  })
  lyrics!: {
    content: string;
    language: string;
  };

  @Prop({
    required: false,
    enum: Decade,
    set: function (this: lyricDocument) {
      if (this.releaseYear) {
        const decade = Math.floor(this.releaseYear / 10) * 10;
        return `${decade}s`;
      }
      return undefined;
    },
  })
  decade!: string;
}

export const lyricschema = SchemaFactory.createForClass(lyric);

// Add text indexes for search optimization
lyricschema.index({
  title: 'text',
  artist: 'text',
  album: 'text',
  'lyrics.content': 'text',
});

// Pre-save hook to set decade based on releaseYear
lyricschema.pre('save', function (next) {
  if (this.releaseYear && !this.decade) {
    const decade = Math.floor(this.releaseYear / 10) * 10;
    this.decade = `${decade}s`;
  }
  next();
});
