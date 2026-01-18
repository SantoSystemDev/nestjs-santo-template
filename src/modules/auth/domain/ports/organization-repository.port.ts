import { OrganizationModel } from '../models/organization.model';

export interface CreateOrganizationDto {
  name: string;
  slug?: string;
  isActive?: boolean;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
  isActive?: boolean;
}

export interface OrganizationFilters {
  isActive?: boolean;
}

export interface OrganizationRepositoryPort {
  create(data: CreateOrganizationDto): Promise<OrganizationModel>;
  findById(id: string): Promise<OrganizationModel | null>;
  findBySlug(slug: string): Promise<OrganizationModel | null>;
  findAll(filters?: OrganizationFilters): Promise<OrganizationModel[]>;
  update(id: string, data: UpdateOrganizationDto): Promise<OrganizationModel>;
}
