import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number/special character',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}

export class SignInDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number/special character',
  })
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number/special character',
  })
  newPassword: string;

  @IsOptional()
  @IsBoolean()
  revokeOtherSessions?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class VerifyEmailDto {
  // The token is typically passed in the URL/headers by Better Auth
  // This DTO is mainly for documentation purposes
}
