import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail({}, { message: 'Email должен быть валидным' })
  readonly email!: string;

  @ApiProperty({ example: 'Secure@Password123' })
  @IsString()
  readonly password!: string;
}
