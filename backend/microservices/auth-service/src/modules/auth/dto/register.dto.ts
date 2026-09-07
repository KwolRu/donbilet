import { IsString, MinLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail({}, { message: 'Email должен быть валидным' })
  readonly email!: string;

  @ApiProperty({
    example: 'Secure@Password123',
    description: 'min 8 символов: строчные и прописные буквы, цифра, спецсимвол (!@#$%^&*_-=+)',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  readonly password!: string;

  @ApiProperty({ example: 'Артём' })
  @IsString()
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  readonly name!: string;

  @ApiProperty({ example: 'Моя мастерская', description: 'Название рабочего пространства (workspace)' })
  @IsString()
  @MinLength(2, { message: 'Название workspace должно содержать минимум 2 символа' })
  readonly workspaceName!: string;
}
