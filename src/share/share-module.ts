// src/modules/share/share.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShareService } from './share.service';
import { ShareController } from './share.controller';
import { Share, ShareSchema } from './schemas/share.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Share.name, schema: ShareSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
