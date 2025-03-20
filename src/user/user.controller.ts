import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch, 
  Delete, 
  UsePipes, 
  ValidationPipe 
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from '../user/dto/create-user.dto';

@Controller('users') // Defines the route for this controller
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Create a new user
   * @param createUserDto - DTO containing user data
   * @returns Created user data
   */
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true })) // Ensures only valid data is passed
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  /**
   * Retrieve all users
   * @returns List of users
   */
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  /**
   * Retrieve a user by ID
   * @param id - User ID
   * @returns User details
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  /**
   * Update user information
   * @param id - User ID
   * @param updateUserDto - Updated user data
   * @returns Updated user details
   */
  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true })) // Ensures only valid data is passed
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  /**
   * Delete a user by ID
   * @param id - User ID
   * @returns Deleted user data
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
