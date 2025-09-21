import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  auditUserCreate,
  auditUserUpdate,
  auditUserPatch,
  auditUserDelete
} from '../middleware/audit.middleware';
import {
  createUserValidator,
  updateUserValidator,
  patchUserValidator,
  userIdValidator,
  getUsersValidator,
  sanitizeUserInput,
  xssProtection
} from '../validators/users.validator';

/**
 * Users routes configuration.
 * Defines all CRUD endpoints for user management with proper validation and middleware.
 */
const router = Router();

/**
 * @route POST /users
 * @desc Create a new user (admin only)
 * @access Admin
 * @validation createUserValidator
 * @middleware sanitizeUserInput, xssProtection
 */
router.post(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  sanitizeUserInput,
  xssProtection,
  createUserValidator,
  auditUserCreate,
  usersController.createUser
);

/**
 * @route GET /users
 * @desc Get paginated list of users with search and filtering (admin only)
 * @access Admin
 * @validation getUsersValidator
 * @query
 *   - page: number (optional, default: 1)
 *   - limit: number (optional, default: 20, max: 100)
 *   - search: string (optional, searches email, firstName, lastName)
 *   - role: string (optional, filters by role: admin|user|readonly)
 *   - status: string (optional, filters by status: active|inactive|all)
 */
router.get(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  getUsersValidator,
  usersController.getUsers
);

/**
 * @route GET /users/:id
 * @desc Get user by ID with role-based access control
 * @access Admin (any user) | User (own profile only)
 * @validation userIdValidator
 * @params
 *   - id: UUID (required, user ID)
 */
router.get(
  '/:id',
  AuthMiddleware.authenticate,
  userIdValidator,
  usersController.getUserById
);

/**
 * @route PUT /users/:id
 * @desc Update user (full replacement) - admin only
 * @access Admin
 * @validation userIdValidator, updateUserValidator
 * @middleware sanitizeUserInput, xssProtection
 * @params
 *   - id: UUID (required, user ID)
 * @body
 *   - email: string (required, valid email)
 *   - firstName: string (required, 1-50 chars)
 *   - lastName: string (required, 1-50 chars)
 *   - role: string (required, admin|user|readonly)
 *   - isActive: boolean (optional)
 *   - emailVerified: boolean (optional)
 */
router.put(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  userIdValidator,
  sanitizeUserInput,
  xssProtection,
  updateUserValidator,
  auditUserUpdate,
  usersController.updateUser
);

/**
 * @route PATCH /users/:id
 * @desc Partially update user
 * @access Admin (all fields) | User (own profile, limited fields)
 * @validation userIdValidator, patchUserValidator
 * @middleware sanitizeUserInput, xssProtection
 * @params
 *   - id: UUID (required, user ID)
 * @body (at least one field required)
 *   - email: string (optional, valid email)
 *   - firstName: string (optional, 1-50 chars)
 *   - lastName: string (optional, 1-50 chars)
 *   - role: string (optional, admin|user|readonly) [admin only]
 *   - isActive: boolean (optional) [admin only]
 *   - emailVerified: boolean (optional) [admin only]
 */
router.patch(
  '/:id',
  AuthMiddleware.authenticate,
  userIdValidator,
  sanitizeUserInput,
  xssProtection,
  patchUserValidator,
  auditUserPatch,
  usersController.patchUser
);

/**
 * @route DELETE /users/:id
 * @desc Soft delete user (admin only)
 * @access Admin
 * @validation userIdValidator
 * @params
 *   - id: UUID (required, user ID)
 * @returns 204 No Content on success
 */
router.delete(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  userIdValidator,
  auditUserDelete,
  usersController.deleteUser
);

export { router as usersRoutes };