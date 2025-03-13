import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWalletDto, UpdateWalletDto } from '../dto/wallet.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet } from '../schemas/wallet.schema';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async createWallet(userId: string, payload: CreateWalletDto): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User Not Found');
    }
    const wallet = new this.walletModel({ ...payload, userId: user._id });
    const data = await wallet.save();
    return data;
  }

  async getAWallet(id: string) {
    const wallet = await this.walletModel.findById(id).populate('userId');
    if (!wallet) {
      throw new NotFoundException('Wallet Not Found');
    }
    return wallet;
  }

  async getAllWallets(): Promise<any> {
    const wallets = await this.walletModel.find().populate('userId');
    if (!wallets || wallets.length === 0) {
      return [];
    }
    return wallets;
  }

  async getAUserWallets(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User Not Found');
    }
    const wallets = await this.walletModel
      .find({ userId: user._id })
      .populate('userId');
    if (!wallets || wallets.length === 0) {
      return [];
    }
    return wallets;
  }

  async updateWallet(id: string, payload: UpdateWalletDto): Promise<any> {
    const wallet = await this.walletModel.findByIdAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true, runValidators: true },
    );

    if (!wallet) {
      throw new NotFoundException('Wallet Not Found');
    }

    return wallet;
  }

  async deleteWallet(id: string): Promise<{ message: string }> {
    const wallet = await this.walletModel.findById(id);

    if (!wallet) {
      throw new NotFoundException('Wallet Not Found');
    }

    await this.walletModel.deleteOne({ _id: id });

    return { message: 'Wallet successfully deleted' };
  }
}
