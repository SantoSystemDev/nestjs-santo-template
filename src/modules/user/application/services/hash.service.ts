import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService {
  private readonly logger = new Logger(HashService.name);

  hash(password: string): string {
    this.logger.log('Hashing password');
    return bcrypt.hashSync(password.trim(), 10);
  }

  compare(password: string, hashedPassword: string): boolean {
    this.logger.log('Comparing passwords');
    return bcrypt.compareSync(password, hashedPassword);
  }
}
