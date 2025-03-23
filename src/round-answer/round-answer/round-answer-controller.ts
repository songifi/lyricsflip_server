import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoundAnswerService } from './round-answer.service';
import {
  CreateAnswerDto,
  UpdateAnswerDto,
  ValidateAnswerDto,
  AnswerFilterDto,
  BulkValidateAnswersDto,
  AnswerStatisticsDto,
} from './round-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/user.entity';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('round-answers')
@Controller('round-answers')
@UseInterceptors(ClassSerializerInterceptor)
export class RoundAnswerController {
  constructor(private readonly answerService: RoundAnswerService) {}

  @Post()
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new answer' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The answer has been successfully submitted.',
  })
  submit(@Body() createAnswerDto: CreateAnswerDto, @GetUser() user: User) {
    return this.answerService.submitAnswer(createAnswerDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find all answers with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all answers matching the filter criteria.',
  })
  findAll(@Query() filterDto: AnswerFilterDto, @GetUser() user: User) {
    // Non-admins can only view their own answers
    if (!user.roles?.includes('admin')) {
      filterDto.userId = user.id;
    }
    
    return this.answerService.findAll(filterDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find an answer by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the answer with the specified ID.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Answer not found.',
  })
  findOne(@Param('id') id: string) {
    return this.answerService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an answer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The answer has been successfully updated.',
  })
  update(
    @Param('id') id: string,
    @Body() updateAnswerDto: UpdateAnswerDto,
    @GetUser() user: User,
  ) {
    return this.answerService.updateAnswer(id, updateAnswerDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an answer' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The answer has been successfully deleted.',
  })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.answerService.deleteAnswer(id, user);
  }

  @Put(':id/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate an answer (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The answer has been successfully validated.',
  })
  validate(
    @Param('id') id: string,
    @Body() validateAnswerDto: ValidateAnswerDto,
    @GetUser() user: User,
  ) {
    return this.answerService.validateAnswer(id, validateAnswerDto, user);
  }

  @Post('bulk-validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk validate multiple answers (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The answers have been successfully validated.',
  })
  bulkValidate(
    @Body() bulkValidateDto: BulkValidateAnswersDto,
    @GetUser() user: User,
  ) {
    return this.answerService.bulkValidateAnswers(bulkValidateDto, user);
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get answer revision history' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the revision history for the answer.',
  })
  getHistory(@Param('id') id: string, @GetUser() user: User) {
    return this.answerService.getAnswerHistory(id, user);
  }

  @Post('statistics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get answer statistics for a round' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns statistics for answers in the specified round.',
  })
  getStatistics(
    @Body() statsDto: AnswerStatisticsDto, 
    @GetUser() user: User
  ) {
    return this.answerService.getAnswerStatistics(statsDto, user);
  }

  @Get('round/:roundId/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find user answers for a specific round' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all answers for the specified user in the round.',
  })
  findUserAnswers(
    @Param('roundId') roundId: string,
    @Param('userId') userId: string,
    @GetUser() user: User,
  ) {
    // Non-admins can only view their own answers
    if (!user.roles?.includes('admin') && user.id !== userId) {
      userId = user.id;
    }
    
    return this.answerService.findUserAnswersForRound(roundId, userId);
  }

  @Post('round/:roundId/auto-validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Auto-validate pending answers for a round (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The answers have been auto-validated.',
  })
  autoValidate(@Param('roundId') roundId: string) {
    return this.answerService.autoValidateAnswers(roundId);
  }
}
