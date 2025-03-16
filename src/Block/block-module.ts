// src/modules/block/block.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';
import { Block, BlockSchema } from './schemas/block.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Block.name, schema: BlockSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BlockController],
  providers: [BlockService],
  exports: [BlockService],
})
export class BlockModule {}
