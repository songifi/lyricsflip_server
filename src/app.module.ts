import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.validation';
import { UserModule } from './user/user.module';
import { LyricModule } from './lyrics/lyric.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'], // Fallback to `.env`
      validate,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
        connectionFactory: (connection) => {
          connection.on('connected', () => console.log('MongoDB connected'));
          connection.on('error', (err) =>
            console.error('MongoDB connection error:', err),
          );
          return connection;
        },
      }),
    }),
    LyricModule,
    UserModule,
    WalletModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}