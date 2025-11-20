import bcrypt from 'bcryptjs';
import { UsersService } from '../../../src/services/users.service';
import { usersRepository } from '../../../src/repositories/users.repository';

// Mock the repository
jest.mock('../../../src/repositories/users.repository');
jest.mock('bcryptjs');

/**
 * Unit tests for UsersService.
 * Tests service business logic without database dependencies.
 */
describe('UsersService', () => {
  let usersService: UsersService;

  beforeEach(() => {
    usersService = new UsersService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'PlainPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user' as const,
      };

      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: 'user-id',
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (usersRepository.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await usersService.createUser(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('PlainPassword123!', 12);
      expect(usersRepository.create).toHaveBeenCalledWith({
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      });

      // Should return user without password hash
      expect(result).toEqual({
        id: 'user-id',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should use default role when not provided', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'PlainPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: 'user-id',
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user',
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (usersRepository.create as jest.Mock).mockResolvedValue(createdUser);

      await usersService.createUser(userData);

      expect(usersRepository.create).toHaveBeenCalledWith({
        email: userData.email,
        passwordHash: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user', // Default role
      });
    });

    it('should propagate repository errors', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'PlainPassword123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user' as const,
      };

      const repositoryError = new Error('Email already exists');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (usersRepository.create as jest.Mock).mockRejectedValue(repositoryError);

      await expect(usersService.createUser(userData)).rejects.toThrow(
        'Email already exists'
      );
    });
  });

  describe('getUserById', () => {
    it('should return user without password hash', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findById as jest.Mock).mockResolvedValue(user);

      const result = await usersService.getUserById('user-id');

      expect(usersRepository.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null when user not found', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await usersService.getUserById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user without password hash', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        tenantId: 'tenant-id',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      const result = await usersService.getUserByEmail(
        'test@example.com',
        'tenant-id'
      );

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
        'tenant-id'
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null when user not found', async () => {
      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await usersService.getUserByEmail(
        'nonexistent@example.com'
      );

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
      };

      const updatedUser = {
        id: 'user-id',
        email: updateData.email,
        passwordHash: 'hashedPassword',
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        role: 'user',
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(null); // Email not taken
      (usersRepository.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await usersService.updateUser('user-id', updateData);

      expect(usersRepository.update).toHaveBeenCalledWith(
        'user-id',
        updateData
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw error when no valid fields provided', async () => {
      await expect(usersService.updateUser('user-id', {})).rejects.toThrow(
        'No valid fields provided for update'
      );
    });

    it('should check email uniqueness when updating email', async () => {
      const updateData = { email: 'existing@example.com' };
      const existingUser = {
        id: 'other-user-id',
        email: 'existing@example.com',
        passwordHash: 'hash',
        firstName: 'Other',
        lastName: 'User',
        role: 'user',
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(
        existingUser
      );

      await expect(
        usersService.updateUser('user-id', updateData)
      ).rejects.toThrow('Email already exists');
    });

    it('should allow email update for same user', async () => {
      const updateData = { email: 'same@example.com' };
      const sameUser = {
        id: 'user-id',
        email: 'same@example.com',
        passwordHash: 'hash',
        firstName: 'Same',
        lastName: 'User',
        role: 'user',
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findByEmail as jest.Mock).mockResolvedValue(sameUser);
      (usersRepository.update as jest.Mock).mockResolvedValue(sameUser);

      const result = await usersService.updateUser('user-id', updateData);

      expect(usersRepository.update).toHaveBeenCalledWith(
        'user-id',
        updateData
      );
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        tenantId: undefined,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findById as jest.Mock).mockResolvedValue(user);
      (usersRepository.softDelete as jest.Mock).mockResolvedValue(true);

      const result = await usersService.deleteUser('user-id');

      expect(usersRepository.findById).toHaveBeenCalledWith('user-id');
      expect(usersRepository.softDelete).toHaveBeenCalledWith('user-id');
      expect(result).toBe(true);
    });

    it('should throw error when user not found', async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(usersService.deleteUser('nonexistent-id')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('getUsers', () => {
    it('should return paginated users without password hashes', async () => {
      const users = [
        {
          id: 'user1',
          email: 'user1@example.com',
          passwordHash: 'hash1',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          tenantId: undefined,
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user2',
          email: 'user2@example.com',
          passwordHash: 'hash2',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'admin',
          tenantId: undefined,
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const repositoryResult = {
        users,
        total: 2,
        page: 1,
        limit: 20,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      };

      (usersRepository.findWithPagination as jest.Mock).mockResolvedValue(
        repositoryResult
      );

      const result = await usersService.getUsers({
        page: 1,
        limit: 20,
        search: 'john',
        role: 'user',
      });

      expect(usersRepository.findWithPagination).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'john',
        role: 'user',
      });

      expect(result.users).toHaveLength(2);
      result.users.forEach((user) => {
        expect(user).not.toHaveProperty('passwordHash');
      });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should validate and sanitize pagination parameters', async () => {
      const repositoryResult = {
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      };

      (usersRepository.findWithPagination as jest.Mock).mockResolvedValue(
        repositoryResult
      );

      // Test with invalid parameters
      await usersService.getUsers({
        page: -1, // Should be corrected to 1
        limit: 150, // Should be capped to 100
      });

      expect(usersRepository.findWithPagination).toHaveBeenCalledWith({
        page: 1, // Corrected
        limit: 100, // Capped
      });
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      (usersRepository.emailExists as jest.Mock).mockResolvedValue(true);

      const result = await usersService.emailExists('existing@example.com');

      expect(usersRepository.emailExists).toHaveBeenCalledWith(
        'existing@example.com',
        undefined
      );
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      (usersRepository.emailExists as jest.Mock).mockResolvedValue(false);

      const result = await usersService.emailExists(
        'nonexistent@example.com',
        'tenant-id'
      );

      expect(usersRepository.emailExists).toHaveBeenCalledWith(
        'nonexistent@example.com',
        'tenant-id'
      );
      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password with new hash', async () => {
      const newPassword = 'NewSecurePass123!';
      const hashedPassword = 'newHashedPassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (usersRepository.updatePassword as jest.Mock).mockResolvedValue(
        undefined
      );

      await usersService.updatePassword('user-id', newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(usersRepository.updatePassword).toHaveBeenCalledWith(
        'user-id',
        hashedPassword
      );
    });
  });

  describe('validateUserAccess', () => {
    it('should allow admin access to any user', () => {
      const result = usersService.validateUserAccess(
        'admin-id',
        'any-user-id',
        'admin'
      );
      expect(result).toBe(true);
    });

    it('should allow users to access their own data', () => {
      const result = usersService.validateUserAccess(
        'user-id',
        'user-id',
        'user'
      );
      expect(result).toBe(true);
    });

    it('should deny users access to other users data', () => {
      const result = usersService.validateUserAccess(
        'user-id',
        'other-user-id',
        'user'
      );
      expect(result).toBe(false);
    });

    it('should deny readonly users access to other users data', () => {
      const result = usersService.validateUserAccess(
        'readonly-id',
        'other-user-id',
        'readonly'
      );
      expect(result).toBe(false);
    });
  });
});
