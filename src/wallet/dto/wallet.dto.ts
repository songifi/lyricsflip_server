import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { WalletStatus } from '../entities/wallet.entity';

export class CreateWalletDto {  
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    address: string[];

    @ApiProperty()
    @IsNumber()
    balance: number;
  
    @ApiProperty()
    @IsEnum(WalletStatus)
    status: string;
  }
  
  export class UpdateWalletDto {
    @ApiProperty()
    @IsArray()
    address?: string[];
  
    @ApiProperty()
    @IsNumber()
    balance?: number;
  
    @ApiProperty()
    @IsEnum(WalletStatus)
    status?: string;
  }
  