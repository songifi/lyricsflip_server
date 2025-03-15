import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { BlacklistedToken } from 'src/schemas/blacklist.schema';
import { UserDocument } from 'src/schemas/user.schema';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthenticationService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_TIME = 30 * 60 * 1000; // 30 minutes
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectModel('Blacklist')
    private readonly blacklistModel: Model<BlacklistedToken>,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException('Account is locked. Try again later.');
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    await this.userService.resetFailedAttempts(user.id);

    return user;
  }

  private async handleFailedLogin(user: any) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + this.LOCK_TIME);
    }

    await user.save();
  }

  async generateTokens(
    user: UserDocument,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user._id as string,
      email: user.email,
      roles: user.roles,
    };

    const opt = {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
    };
    const refreshOpt = {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
    };
    const accessToken = this.jwtService.sign(payload, opt);
    const refreshToken = this.jwtService.sign(payload, refreshOpt);

    await this.userService.updateRefreshToken(user._id as string, refreshToken);
    return { accessToken, refreshToken };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.userService.findById(decoded.sub);

      if (!user || user.refreshTokens.includes(refreshToken) === false) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.userService.clearRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    await this.blacklistModel.create({ token, expiresAt });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.blacklistModel.findOne({ token }).exec();
    return !!blacklisted;
  }

  @Cron('0 0 * * *') // Runs every midnight
  async removeExpiredTokens() {
    await this.blacklistModel.deleteMany({ expiresAt: { $lt: new Date() } });
  }
}
