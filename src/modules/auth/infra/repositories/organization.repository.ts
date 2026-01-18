import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/database/prisma.service';
import {
  CreateOrganizationDto,
  OrganizationFilters,
  OrganizationRepositoryPort,
  UpdateOrganizationDto,
} from '@auth/domain/ports/organization-repository.port';
import { OrganizationModel } from '@auth/domain/models/organization.model';

@Injectable()
export class OrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrganizationDto): Promise<OrganizationModel> {
    const model = OrganizationModel.create(data);

    const organization = await this.prisma.organizations.create({
      data: {
        name: model.name,
        slug: model.slug,
        isActive: model.isActive,
      },
    });

    return new OrganizationModel(organization);
  }

  async findById(id: string): Promise<OrganizationModel | null> {
    const organization = await this.prisma.organizations.findUnique({
      where: { id },
    });

    return organization ? new OrganizationModel(organization) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationModel | null> {
    const organization = await this.prisma.organizations.findUnique({
      where: { slug },
    });

    return organization ? new OrganizationModel(organization) : null;
  }

  async findAll(filters?: OrganizationFilters): Promise<OrganizationModel[]> {
    const organizations = await this.prisma.organizations.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });

    return organizations.map((org) => new OrganizationModel(org));
  }

  async update(
    id: string,
    data: UpdateOrganizationDto,
  ): Promise<OrganizationModel> {
    const organization = await this.prisma.organizations.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });

    return new OrganizationModel(organization);
  }
}
