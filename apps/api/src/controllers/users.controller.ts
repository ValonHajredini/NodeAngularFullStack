import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { usersService, CreateUserRequest, UpdateUserRequest } from '../services/users.service';
import { AuthUser } from '../types/auth.types';

/**
 * Users controller handling HTTP requests for user management operations.
 * Manages CRUD operations for users with proper authentication and authorization.
 */
export class UsersController {
  /**
   * Creates a new user (admin only).
   * @route POST /api/v1/users
   * @param req - Express request object with user creation data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with created user data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   * @throws {ApiError} 409 - Email already exists
   * @example
   * POST /api/v1/users
   * Authorization: Bearer <admin-token>
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123!",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "role": "user"
   * }
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userData: CreateUserRequest = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role: req.body.role || 'user',
        tenantId: (req.user as AuthUser)?.tenantId
      };

      const user = await usersService.createUser(userData);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error.message.includes('Email already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Email already exists'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Gets paginated list of users (admin only).
   * @route GET /api/v1/users
   * @param req - Express request object with query parameters
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with paginated user list
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   * @example
   * GET /api/v1/users?page=1&limit=20&search=john&role=user
   * Authorization: Bearer <admin-token>
   */
  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as 'active' | 'inactive' | 'all';

      const result = await usersService.getUsers({
        page,
        limit: Math.min(limit, 100), // Max 100 items per page
        search,
        role,
        status,
        tenantId: (req.user as AuthUser)?.tenantId
      });

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: result.users,
          pagination: result.pagination
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Gets a user by ID with role-based access control.
   * @route GET /api/v1/users/:id
   * @param req - Express request object with user ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with user data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Insufficient permissions
   * @throws {ApiError} 404 - User not found
   * @example
   * GET /api/v1/users/user-uuid
   * Authorization: Bearer <token>
   */
  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const requestingUserId = (req.user as AuthUser)?.id;
      const requestingUserRole = (req.user as AuthUser)?.role;

      // Check access permissions
      if (!requestingUserId || !requestingUserRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate access permissions
      const hasAccess = usersService.validateUserAccess(requestingUserId, id, requestingUserRole);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to access this user'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = await usersService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Updates a user (full replacement).
   * @route PUT /api/v1/users/:id
   * @param req - Express request object with user update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated user data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   * @throws {ApiError} 404 - User not found
   * @throws {ApiError} 409 - Email already exists
   * @example
   * PUT /api/v1/users/user-uuid
   * Authorization: Bearer <admin-token>
   * {
   *   "email": "newemail@example.com",
   *   "firstName": "Jane",
   *   "lastName": "Smith",
   *   "role": "admin"
   * }
   */
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { id } = req.params;
      const updateData: UpdateUserRequest = {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role: req.body.role,
        isActive: req.body.isActive,
        emailVerified: req.body.emailVerified
      };

      const updatedUser = await usersService.updateUser(id, updateData);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error.message.includes('User not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error.message.includes('Email already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Email already exists'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error.message.includes('No valid fields')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields provided for update'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Partially updates a user.
   * @route PATCH /api/v1/users/:id
   * @param req - Express request object with partial user update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated user data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Insufficient permissions
   * @throws {ApiError} 404 - User not found
   * @throws {ApiError} 409 - Email already exists
   * @example
   * PATCH /api/v1/users/user-uuid
   * Authorization: Bearer <token>
   * {
   *   "firstName": "Jane"
   * }
   */
  patchUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { id } = req.params;
      const requestingUserId = (req.user as AuthUser)?.id;
      const requestingUserRole = (req.user as AuthUser)?.role;

      // Check access permissions
      if (!requestingUserId || !requestingUserRole) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // For non-admin users, only allow self-updates and limit fields
      const hasAccess = usersService.validateUserAccess(requestingUserId, id, requestingUserRole);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to update this user'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updateData: UpdateUserRequest = {};

      // Regular users can only update their own basic profile fields
      if (requestingUserRole !== 'admin' && requestingUserId === id) {
        if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
        if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
        if (req.body.email !== undefined) updateData.email = req.body.email;
      } else if (requestingUserRole === 'admin') {
        // Admin can update all fields
        if (req.body.email !== undefined) updateData.email = req.body.email;
        if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
        if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
        if (req.body.role !== undefined) updateData.role = req.body.role;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
        if (req.body.emailVerified !== undefined) updateData.emailVerified = req.body.emailVerified;
      }

      const updatedUser = await usersService.updateUser(id, updateData);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error.message.includes('User not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error.message.includes('Email already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Email already exists'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (error.message.includes('No valid fields')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields provided for update'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Soft deletes a user (admin only).
   * @route DELETE /api/v1/users/:id
   * @param req - Express request object with user ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with deletion confirmation
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   * @throws {ApiError} 404 - User not found
   * @example
   * DELETE /api/v1/users/user-uuid
   * Authorization: Bearer <admin-token>
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const deleted = await usersService.deleteUser(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found or already deleted'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('User not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      next(error);
    }
  };
}

// Export singleton instance
export const usersController = new UsersController();