import * as bcrypt from 'bcryptjs';
import {
  usersRepository,
  User,
  CreateUserData,
  UpdateUserData,
} from '../repositories/users.repository';
import { storageService } from './storage.service';

/**
 * User creation request interface.
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user' | 'readonly';
  tenantId?: string;
}

/**
 * User update request interface.
 */
export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'readonly';
  isActive?: boolean;
  emailVerified?: boolean;
}

/**
 * User service for business logic operations.
 * Handles user management with proper validation and security.
 */
export class UsersService {
  /**
   * Creates a new user with hashed password.
   * @param userData - User creation data
   * @returns Promise containing the created user (without password hash)
   * @throws {Error} When user creation fails or email already exists
   * @example
   * const user = await usersService.createUser({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   role: 'user'
   * });
   */
  async createUser(
    userData: CreateUserRequest
  ): Promise<Omit<User, 'passwordHash'>> {
    const { password, ...restData } = userData;

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const createData: CreateUserData = {
      ...restData,
      passwordHash,
      role: userData.role || 'user',
    };

    const user = await usersRepository.create(createData);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Gets a user by ID.
   * @param id - User ID
   * @returns Promise containing the user (without password hash) or null
   * @example
   * const user = await usersService.getUserById('user-uuid');
   */
  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await usersRepository.findById(id);

    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Gets a user by email.
   * @param email - User email
   * @param tenantId - Optional tenant ID
   * @returns Promise containing the user (without password hash) or null
   * @example
   * const user = await usersService.getUserByEmail('user@example.com');
   */
  async getUserByEmail(
    email: string,
    tenantId?: string
  ): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await usersRepository.findByEmail(email, tenantId);

    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Updates a user's information.
   * @param id - User ID to update
   * @param updateData - Data to update
   * @returns Promise containing the updated user (without password hash)
   * @throws {Error} When user update fails or user not found
   * @example
   * const updatedUser = await usersService.updateUser('user-uuid', {
   *   firstName: 'Jane',
   *   lastName: 'Smith'
   * });
   */
  async updateUser(
    id: string,
    updateData: UpdateUserRequest
  ): Promise<Omit<User, 'passwordHash'>> {
    // Validate that at least one field is being updated
    const validFields = [
      'email',
      'firstName',
      'lastName',
      'role',
      'isActive',
      'emailVerified',
    ];
    const hasValidUpdate = validFields.some(
      (field) => updateData[field as keyof UpdateUserRequest] !== undefined
    );

    if (!hasValidUpdate) {
      throw new Error('No valid fields provided for update');
    }

    // If email is being updated, check for uniqueness
    if (updateData.email) {
      const existingUser = await usersRepository.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already exists');
      }
    }

    const user = await usersRepository.update(id, updateData as UpdateUserData);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Soft deletes a user.
   * @param id - User ID to delete
   * @returns Promise containing boolean indicating success
   * @throws {Error} When user deletion fails
   * @example
   * const deleted = await usersService.deleteUser('user-uuid');
   */
  async deleteUser(id: string): Promise<boolean> {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return await usersRepository.softDelete(id);
  }

  /**
   * Gets paginated users with search and filter capabilities.
   * @param options - Pagination and filter options
   * @returns Promise containing paginated user results (without password hashes)
   * @example
   * const result = await usersService.getUsers({
   *   page: 1,
   *   limit: 20,
   *   search: 'john',
   *   role: 'user'
   * });
   */
  async getUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    tenantId?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<{
    users: Omit<User, 'passwordHash'>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Validate and sanitize pagination parameters
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20)); // Max 100 items per page

    const result = await usersRepository.findWithPagination({
      ...options,
      page,
      limit,
    });

    // Remove password hashes from all users
    const users = result.users.map((user) => {
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
    };
  }

  /**
   * Checks if an email exists in the system.
   * @param email - Email to check
   * @param tenantId - Optional tenant ID
   * @returns Promise containing boolean indicating if email exists
   * @example
   * const exists = await usersService.emailExists('user@example.com');
   */
  async emailExists(email: string, tenantId?: string): Promise<boolean> {
    return await usersRepository.emailExists(email, tenantId);
  }

  /**
   * Updates a user's password.
   * @param id - User ID
   * @param newPassword - New password (will be hashed)
   * @returns Promise resolving when password is updated
   * @throws {Error} When update fails or user not found
   * @example
   * await usersService.updatePassword('user-uuid', 'NewSecurePass123!');
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await usersRepository.updatePassword(id, passwordHash);
  }

  /**
   * Validates user access permissions.
   * @param userId - User making the request
   * @param targetUserId - User being accessed
   * @param userRole - Role of the requesting user
   * @returns Boolean indicating if access is allowed
   * @example
   * const hasAccess = usersService.validateUserAccess('user1', 'user2', 'admin');
   */
  validateUserAccess(
    userId: string,
    targetUserId: string,
    userRole: string
  ): boolean {
    // Admin users can access any user
    if (userRole === 'admin') {
      return true;
    }

    // Regular users can only access their own data
    return userId === targetUserId;
  }

  /**
   * Updates a user's avatar by uploading a new image to cloud storage.
   * @param userId - User ID to update avatar for
   * @param file - File buffer containing the avatar image
   * @param originalName - Original filename of the uploaded file
   * @param mimeType - MIME type of the file
   * @param tenantId - Optional tenant ID for multi-tenant mode
   * @returns Promise containing the updated user with new avatar URL
   * @throws {Error} When user not found, file upload fails, or validation fails
   * @example
   * const updatedUser = await usersService.updateAvatar(
   *   'user-uuid',
   *   fileBuffer,
   *   'avatar.jpg',
   *   'image/jpeg'
   * );
   */
  async updateAvatar(
    userId: string,
    file: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<Omit<User, 'passwordHash'>> {
    // Check if user exists
    const existingUser = await usersRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    try {
      // Generate unique filename for avatar
      const timestamp = Date.now();
      const extension = originalName.split('.').pop() || 'jpg';
      const fileName = `avatars/${userId}/${timestamp}-${userId}.${extension}`;

      // Upload file to storage
      const avatarUrl = await storageService.uploadFile(
        file,
        fileName,
        mimeType
      );

      // Delete old avatar if it exists
      if (existingUser.avatarUrl) {
        try {
          // Extract filename from old avatar URL
          const oldFileName = this.extractFileNameFromUrl(
            existingUser.avatarUrl
          );
          if (oldFileName) {
            await storageService.deleteFile(oldFileName);
          }
        } catch (error) {
          // Log error but don't fail the entire operation
          console.warn(
            `Failed to delete old avatar for user ${userId}:`,
            error
          );
        }
      }

      // Update user record with new avatar URL
      const updatedUser = await usersRepository.updateAvatar(userId, avatarUrl);

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(
        `Avatar update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Removes a user's avatar by deleting the image from cloud storage.
   * @param userId - User ID to remove avatar for
   * @returns Promise containing the updated user with null avatar URL
   * @throws {Error} When user not found or deletion fails
   * @example
   * const updatedUser = await usersService.removeAvatar('user-uuid');
   */
  async removeAvatar(userId: string): Promise<Omit<User, 'passwordHash'>> {
    // Check if user exists
    const existingUser = await usersRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    try {
      // Delete avatar from storage if it exists
      if (existingUser.avatarUrl) {
        const fileName = this.extractFileNameFromUrl(existingUser.avatarUrl);
        if (fileName) {
          await storageService.deleteFile(fileName);
        }
      }

      // Update user record to remove avatar URL
      const updatedUser = await usersRepository.updateAvatar(userId, null);

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(
        `Avatar removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extracts the filename from a storage URL for deletion purposes.
   * @param url - Full URL to the stored file
   * @returns Filename or null if extraction fails
   * @private
   */
  private extractFileNameFromUrl(url: string): string | null {
    try {
      // Extract filename from DigitalOcean Spaces URL
      // Format: https://bucketname.region.digitaloceanspaces.com/path/to/file.ext
      const urlParts = url.split('/');
      const pathParts = urlParts.slice(3); // Remove https, empty, and domain parts
      return pathParts.join('/');
    } catch (error) {
      console.warn('Failed to extract filename from URL:', url, error);
      return null;
    }
  }
}

// Export singleton instance
export const usersService = new UsersService();
