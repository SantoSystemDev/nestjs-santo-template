export class OrganizationModel {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: Partial<OrganizationModel>) {
    Object.assign(this, data);
  }

  static create(data: {
    name: string;
    slug?: string;
    isActive?: boolean;
  }): OrganizationModel {
    const slug = data.slug || OrganizationModel.generateSlug(data.name);

    return new OrganizationModel({
      ...data,
      slug,
      isActive: data.isActive ?? true,
    });
  }

  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
