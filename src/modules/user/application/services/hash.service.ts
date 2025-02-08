import { HashServicePort } from '@modules/user/domain/ports';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService implements HashServicePort {
  hash(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  compare(password: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(password, hashedPassword);
  }
}
