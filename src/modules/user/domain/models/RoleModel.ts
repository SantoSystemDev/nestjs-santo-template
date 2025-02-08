export class RoleModel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;

  constructor(data: Partial<RoleModel>) {
    Object.assign(this, data);
  }
}
