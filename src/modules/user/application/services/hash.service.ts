import { Injectable, Logger } from '@nestjs/common';
import { HashServicePort } from '@user/domain/ports';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService implements HashServicePort {
  private readonly logger = new Logger(HashService.name);

  hash(password: string): string {
    this.logger.debug('Hashing password');
    return bcrypt.hashSync(password.trim(), 10);
  }

  compare(password: string, hashedPassword: string): boolean {
    this.logger.debug('Comparing passwords');
    return bcrypt.compareSync(password, hashedPassword);
  }
}
