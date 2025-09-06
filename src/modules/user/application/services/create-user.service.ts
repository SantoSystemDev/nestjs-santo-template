import { HashService } from '@auth/application/services';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DomainError } from '@shared/errors';
import { CreateUserCommand } from '@user/application/commands';
import {
  AdminNotFoundError,
  EmailAlreadyInUseError,
  InsufficientPermissionsError,
  UserNotFoundError,
} from '@user/domain/errors';
import { UserModel } from '@user/domain/models';
import { UserRepositoryPort } from '@user/domain/ports';

@Injectable()
export class CreateUserService {
  private readonly logger = new Logger(CreateUserService.name);

  constructor(
    private readonly repository: UserRepositoryPort,
    private readonly hashService: HashService,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserModel> {
    this.logger.log(
      `Creating new user - Requested by adminId: ${command.adminId}`,
    );

    try {
      return await this.createUserInternal(command);
    } catch (error) {
      return this.handleCreateUserError(error);
    }
  }

  private async createUserInternal(
    command: CreateUserCommand,
  ): Promise<UserModel> {
    // Verificar permissões e disponibilidade do email
    await this.validateBusinessRules(command.adminId, command.email);

    // Hash da senha
    const hashedPassword = this.hashService.hash(command.password);
    this.logger.log('Password hashed successfully');

    // Criar usuário usando factory method com validações
    const newUser = UserModel.create({
      email: command.email,
      password: hashedPassword,
      fullName: command.fullName,
      roles: command.roles,
      phoneNumber: command.phoneNumber,
    });

    // Persistir no repositório
    const savedUser = await this.repository.createUser(newUser);
    this.logger.log(`User created successfully - userId: ${savedUser.id}`);

    return savedUser;
  }

  private async validateBusinessRules(
    adminId: string,
    email: string,
  ): Promise<void> {
    this.logger.log(`Verifying admin permissions - adminId: ${adminId}`);

    const [adminUser, existingUser] = await Promise.all([
      this.repository.findById(adminId),
      this.repository.findByEmail(email),
    ]);

    // Usar métodos estáticos do modelo de domínio para validações
    UserModel.validateAdminPermissions(adminUser);
    UserModel.validateEmailAvailability(existingUser, email);
  }

  private handleCreateUserError(error: any): never {
    if (error instanceof DomainError) {
      this.logger.error(
        `User creation failed with domain error: ${error.message}`,
      );
      throw this.convertDomainError(error);
    }

    if (error instanceof Error) {
      this.logger.error(`User creation failed: ${error.message}`);
    }

    throw error;
  }

  private convertDomainError(error: DomainError): Error {
    // Erros de autorização/permissão
    if (error instanceof InsufficientPermissionsError) {
      return new ForbiddenException(error.message);
    }

    // Erros de usuário não encontrado (contexto de admin não encontrado)
    if (error instanceof AdminNotFoundError) {
      return new UnauthorizedException(error.message);
    }

    // Erros de usuário não encontrado
    if (error instanceof UserNotFoundError) {
      return new NotFoundException(error.message);
    }

    // Erros de conflito
    if (error instanceof EmailAlreadyInUseError) {
      return new ConflictException(error.message);
    }

    // Fallback para erros não categorizados
    return new BadRequestException(error.message);
  }
}
