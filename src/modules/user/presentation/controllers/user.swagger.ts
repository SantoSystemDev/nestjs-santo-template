import { UserResponseDto } from '@modules/user/application/dtos';
import { HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function ApiUserPost(): MethodDecorator {
  return function (target: any, propertyKey: any, descriptor: any): void {
    ApiOperation({
      summary: 'SignUp User',
      description:
        'Creates a new user. Only users with the ADMIN role can perform this action.',
    })(target, propertyKey, descriptor);

    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'User registered successfully',
      type: UserResponseDto,
    })(target, propertyKey, descriptor);

    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Email already in use',
      content: {
        'application/json': {
          example: {
            statusCode: HttpStatus.CONFLICT,
            message: 'Email already in use',
            error: 'Conflict',
          },
        },
      },
    })(target, propertyKey, descriptor);

    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'You do not have permission to perform this action',
      content: {
        'application/json': {
          example: {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'You do not have permission to perform this action',
            error: 'Unauthorized',
          },
        },
      },
    })(target, propertyKey, descriptor);
  };
}
