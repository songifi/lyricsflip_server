import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Version,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto, UpdateWalletDto } from '../dto/wallet.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post(':userId')
  @Version('1')
  @ApiOperation({ summary: 'Create new wallet' })
  @ApiResponse({
    status: 201,
    description: 'Wallet successfully created.',
    type: CreateWalletDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async createWallet(
    @Param('userId') userId: string,
    @Body() payload: CreateWalletDto,
  ) {
    try {
      const wallet = await this.walletService.createWallet(userId, payload);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Wallet Created successfully',
        data: wallet,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get all wallets' })
  @ApiResponse({
    status: 200,
    description: 'Return all wallets.',
  })
  @ApiResponse({ status: 404, description: 'Wallets not found.' })
  async getAllWallets() {
    try {
      const wallets = await this.walletService.getAllWallets();
      return {
        statusCode: HttpStatus.OK,
        message: 'All wallet fetched',
        data: wallets,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':userId/wallets')
  @Version('1')
  @ApiOperation({ summary: 'Get wallets by user id' })
  @ApiParam({
    name: 'userId',
    description: 'The user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the wallets.',
  })
  @ApiResponse({ status: 404, description: 'Wallets not found.' })
  @Get(':id')
  async getAUserWallets(@Param('userId') userId: string) {
    try {
      const wallets = await this.walletService.getAUserWallets(userId);
      return {
        statusCode: HttpStatus.OK,
        message: 'A user wallets fetched',
        data: wallets,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get wallet by id' })
  @ApiParam({
    name: 'id',
    description: 'The wallet ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the wallet.',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found.' })
  async getAWallet(@Param('id') id: string) {
    try {
      const wallet = await this.walletService.getAWallet(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'A wallet returned',
        data: wallet,
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update wallet' })
  @ApiParam({
    name: 'id',
    description: 'The wallet ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet successfully updated.',
    type: UpdateWalletDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async updateWallet(
    @Param('id') id: string,
    @Body() payload: UpdateWalletDto,
  ): Promise<any> {
    try {
      const updatedWallet = await this.walletService.updateWallet(id, payload);
      return {
        statusCode: HttpStatus.OK,
        message: 'Wallet Updated successfully',
        data: updatedWallet,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete wallet by id' })
  @ApiParam({
    name: 'id',
    description: 'The wallet ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Delete the wallet.',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found.' })
  async remove(@Param('id') id: string) {
    await this.walletService.deleteWallet(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Wallet Deleted',
    };
  }
}
