import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/infra/adapters/credentials';
import { AuthenticatedUser } from '@shared/decorators';
import { JwtPayloadModel } from '@auth/domain/models';
import { RoleEnum } from '@user/domain/enums/role.enum';
import { OrganizationService } from '@organization/application/services';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from '@organization/application/dtos';

@Controller('/organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrganizationDto,
    @AuthenticatedUser() user: JwtPayloadModel,
  ) {
    if (!user.roles.includes(RoleEnum.SUPER_ADMIN)) {
      throw new ForbiddenException('Only SUPER_ADMIN can create organizations');
    }

    return await this.organizationService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@AuthenticatedUser() user: JwtPayloadModel) {
    if (!user.roles.includes(RoleEnum.SUPER_ADMIN)) {
      throw new ForbiddenException('Only SUPER_ADMIN can list organizations');
    }

    return await this.organizationService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') id: string,
    @AuthenticatedUser() user: JwtPayloadModel,
  ) {
    if (!user.roles.includes(RoleEnum.SUPER_ADMIN)) {
      throw new ForbiddenException('Only SUPER_ADMIN can view organizations');
    }

    return await this.organizationService.findById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @AuthenticatedUser() user: JwtPayloadModel,
  ) {
    if (!user.roles.includes(RoleEnum.SUPER_ADMIN)) {
      throw new ForbiddenException('Only SUPER_ADMIN can update organizations');
    }

    return await this.organizationService.update(id, dto);
  }
}
