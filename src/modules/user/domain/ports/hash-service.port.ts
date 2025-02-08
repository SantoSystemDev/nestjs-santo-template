// src/modules/user/domain/ports/hash-service.port.ts
export abstract class HashServicePort {
  abstract hash(password: string): string;
  abstract compare(password: string, hashedPassword: string): boolean;
}
