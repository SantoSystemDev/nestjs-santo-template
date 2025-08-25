import { HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserResponseDto } from '@user/presentation/dtos';

export function UserApiResponsePost(): MethodDecorator {
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

export function UserApiResponsePut(): MethodDecorator {
  return function (target: any, propertyKey: any, descriptor: any): void {
    ApiOperation({
      summary: 'Update User',
      description:
        'Updates an existing user. Only users with the ADMIN role can perform this action.',
    })(target, propertyKey, descriptor);

    ApiResponse({
      status: HttpStatus.OK,
      description: 'User updated successfully',
      type: UserResponseDto,
    })(target, propertyKey, descriptor);

    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      content: {
        'application/json': {
          example: {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'User not found',
            error: 'Not Found',
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

export function UserApiResponseDelete(): MethodDecorator {
  return function (target: any, propertyKey: any, descriptor: any): void {
    ApiOperation({
      summary: 'Delete User',
      description:
        'Deletes an existing user. Only users with the ADMIN role can perform this action.',
    })(target, propertyKey, descriptor);

    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'User deleted successfully',
    })(target, propertyKey, descriptor);

    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'User not found',
      content: {
        'application/json': {
          example: {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'User not found',
            error: 'Not Found',
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
