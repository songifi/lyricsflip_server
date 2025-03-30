import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export enum ContentType {
  SONG = 'song',
  PLAYLIST = 'playlist',
  USER = 'user',
}

export class CreateLikeDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  contentType: ContentType;

  @IsMongoId()
  @IsNotEmpty()
  contentId: string;
}
