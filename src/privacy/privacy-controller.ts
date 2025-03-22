// src/privacy/privacy.controller.ts

import { 
  Controller, 
  Get, 
  Put, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivacyService } from './privacy.service';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';
import { ApplyPrivacyTemplateDto } from './dto/privacy-template.dto';
import { RespondToFollowRequestDto } from './dto/follow-request.dto';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('settings')
  async getPrivacySettings(@Request() req) {
    return this.privacyService.getPrivacySettings(req.user.id);
  }

  @Put('settings')
  async updatePrivacySettings(
    @Request() req,
    @Body() updateDto: UpdatePrivacySettingsDto
  ) {
    return this.privacyService.updatePrivacySettings(req.user.id, updateDto);
  }

  @Post('templates/apply')
  async applyPrivacyTemplate(
    @Request() req,
    @Body() templateDto: ApplyPrivacyTemplateDto
  ) {
    return this.privacyService.applyPrivacyTemplate(req.user.id, templateDto);
  }

  @Get('templates')
  async getAvailableTemplates() {
    return {
      templates: this.privacyService.getAvailableTemplates()
    };
  }

  @Get('follow-requests')
  async getFollowRequests(@Request() req) {
    return this.privacyService.getPendingFollowRequests(req.user.id);
  }

  @Post('follow-requests/:id/approve')
  async approveFollowRequest(
    @Request() req,
    @Param('id') requestId: string
  ) {
    return this.privacyService.approveFollowRequest(req.user.id, requestId);
  }

  @Post('follow-requests/:id/reject')
  async rejectFollowRequest(
    @Request() req,
    @Param('id') requestId: string
  ) {
    return this.privacyService.rejectFollowRequest(req.user.id, requestId);
  }
}
