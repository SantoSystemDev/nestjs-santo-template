import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRepositoryPort } from '@auth/domain/ports/organization-repository.port';
import { AUTH_REPOSITORY_TOKENS } from '@auth/infra/repositories/auth.repository.tokens';
import { OrganizationModel } from '@auth/domain/models';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @Inject(AUTH_REPOSITORY_TOKENS.ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepositoryPort,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<OrganizationModel> {
    this.logger.log('Creating new organization');

    if (dto.slug) {
      const existing = await this.organizationRepository.findBySlug(dto.slug);
      if (existing) {
        throw new ConflictException('Organization with this slug already exists');
      }
    }

    const organization = OrganizationModel.create({
      name: dto.name,
      slug: dto.slug,
      isActive: dto.isActive ?? true,
    });

    const created = await this.organizationRepository.create(organization);
    this.logger.log(`Organization created successfully - id: ${created.id}`);

    return created;
  }

  async findAll(): Promise<OrganizationModel[]> {
    this.logger.log('Fetching all organizations');
    return await this.organizationRepository.findAll();
  }

  async findById(id: string): Promise<OrganizationModel> {
    this.logger.log(`Fetching organization by id: ${id}`);
    const organization = await this.organizationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationModel> {
    this.logger.log(`Updating organization: ${id}`);

    const existing = await this.organizationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Organization not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.organizationRepository.findBySlug(dto.slug);
      if (slugExists) {
        throw new ConflictException('Organization with this slug already exists');
      }
    }

    const updated = await this.organizationRepository.update(id, dto);
    this.logger.log(`Organization updated successfully - id: ${id}`);

    return updated;
  }
}
