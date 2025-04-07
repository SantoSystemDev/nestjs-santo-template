import * as bcrypt from 'bcrypt';
import { HashService } from './hash.service';

jest.mock('bcrypt', () => ({
  hashSync: jest.fn(),
  compareSync: jest.fn(),
}));

describe(HashService.name, () => {
  let service: HashService;

  beforeAll(() => {
    service = new HashService();
  });

  describe('hash method', () => {
    it('should hash the password correctly', () => {
      // Arrange
      const password = 'password123';
      const hashedPassword = 'hashedPassword';

      // Mock do hashSync
      (bcrypt.hashSync as jest.Mock).mockReturnValue(hashedPassword);

      // Act
      const result = service.hash(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hashSync).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('compare method', () => {
    it('should return true when passwords match', () => {
      // Arrange
      const password = 'password123';
      const hashedPassword = 'hashedPassword';

      // Mock do compareSync
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      // Act
      const result = service.compare(password, hashedPassword);

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false when passwords do not match', () => {
      // Arrange
      const password = 'password123';
      const hashedPassword = 'hashedPassword';

      // Mock do compareSync
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      // Act
      const result = service.compare(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(password, hashedPassword);
    });
  });
});
