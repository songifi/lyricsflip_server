import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { WalletStatus } from '../schemas/wallet.schema';

export class CreateWalletDto {
  @ApiProperty({example: ['0x24323']})
  @IsArray()
  @IsNotEmpty()
  address: string[];

  @ApiProperty({example: 80.0})
  @IsNumber()
  balance: number;

  @ApiProperty({example: WalletStatus.ACTIVE})
  @IsEnum(WalletStatus)
  status: string;
}

export class UpdateWalletDto {
  @ApiProperty({example: ['0x24323']})
  @IsArray()
  address?: string[]; 

  @ApiProperty({example: 80.0})
  @IsNumber()
  balance?: number;

  @ApiProperty({example: WalletStatus.ACTIVE})
  @IsEnum(WalletStatus)
  status?: string;
}
