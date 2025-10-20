import { Router } from 'express';
import multer from 'multer';
import { usersController } from '../controllers/users.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  auditUserCreate,
  auditUserUpdate,
  auditUserPatch,
  auditUserDelete,
} from '../middleware/audit.middleware';
import {
  createUserValidator,
  updateUserValidator,
  patchUserValidator,
  userIdValidator,
  getUsersValidator,
  sanitizeUserInput,
  xssProtection,
} from '../validators/users.validator';

/**
 * Users routes configuration.
 * Defines all CRUD endpoints for user management with proper validation and middleware.
 */
const router = Router();

/**
 * Multer configuration for avatar file uploads.
 * Handles multipart/form-data file uploads with validation.
 */
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB to accommodate 5MB files + multipart overhead
    files: 1, // Single file only
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    // Accept only image files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only jpg, png, gif, and webp files are allowed.'
        )
      );
    }
  },
});

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user account (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's unique email address
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: User's last name
 *               role:
 *                 type: string
 *                 enum: [admin, user, readonly]
 *                 description: User role determining permissions
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Temporary password (optional, auto-generated if not provided)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the user account is active
 *               emailVerified:
 *                 type: boolean
 *                 default: false
 *                 description: Whether the user's email is verified
 *           example:
 *             email: "newuser@example.com"
 *             firstName: "John"
 *             lastName: "Doe"
 *             role: "user"
 *             password: "TempPassword123!"
 *             isActive: true
 *             emailVerified: false
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get paginated list of users
 *     description: Get paginated list of users with search and filtering (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for email, firstName, or lastName
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user, readonly]
 *         description: Filter by user role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *           default: all
 *         description: Filter by user status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *             example:
 *               data:
 *                 - id: "123e4567-e89b-12d3-a456-426614174000"
 *                   email: "admin@example.com"
 *                   firstName: "Admin"
 *                   lastName: "User"
 *                   role: "admin"
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 1
 *                 totalPages: 1
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  getUsersValidator,
  usersController.getUsers
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Get user by ID with role-based access control (admin can access any user, users can only access their own profile)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *             example:
 *               id: "123e4567-e89b-12d3-a456-426614174000"
 *               email: "user@example.com"
 *               firstName: "John"
 *               lastName: "Doe"
 *               role: "user"
 *               tenantId: null
 *               createdAt: "2024-01-01T00:00:00.000Z"
 *               updatedAt: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Invalid user ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied (can only access own profile unless admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  AuthMiddleware.authenticate,
  userIdValidator,
  usersController.getUserById
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user (full replacement)
 *     description: Update user with full replacement of data (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: User's last name
 *               role:
 *                 type: string
 *                 enum: [admin, user, readonly]
 *                 description: User role determining permissions
 *               isActive:
 *                 type: boolean
 *                 description: Whether the user account is active
 *               emailVerified:
 *                 type: boolean
 *                 description: Whether the user's email is verified
 *           example:
 *             email: "updated.user@example.com"
 *             firstName: "Updated"
 *             lastName: "User"
 *             role: "user"
 *             isActive: true
 *             emailVerified: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Partially update user
 *     description: Partially update user data (admin can update all fields, users can only update their own profile with limited fields)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: User's last name
 *               role:
 *                 type: string
 *                 enum: [admin, user, readonly]
 *                 description: User role determining permissions (admin only)
 *               isActive:
 *                 type: boolean
 *                 description: Whether the user account is active (admin only)
 *               emailVerified:
 *                 type: boolean
 *                 description: Whether the user's email is verified (admin only)
 *           example:
 *             firstName: "Updated First Name"
 *             lastName: "Updated Last Name"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or no fields provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied (can only update own profile unless admin, or trying to update admin-only fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     description: Soft delete user account (admin only) - marks user as inactive rather than permanently deleting
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: User deleted successfully (no content)
 *       400:
 *         description: Invalid user ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete user (e.g., cannot delete own admin account)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  userIdValidator,
  auditUserDelete,
  usersController.deleteUser
);

/**
 * @swagger
 * /api/v1/users/avatar:
 *   post:
 *     summary: Upload user avatar
 *     description: Upload and update the authenticated user's avatar image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (jpg, png, gif, webp - max 5MB)
 *           example:
 *             avatar: "[binary file data]"
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Avatar uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     avatarUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://cdn.example.com/avatars/user-123/avatar.jpg"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - no file uploaded or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: File too large (exceeds 5MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       415:
 *         description: Unsupported media type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/avatar',
  AuthMiddleware.authenticate,
  avatarUpload.single('avatar'),
  usersController.uploadAvatar
);

/**
 * @swagger
 * /api/v1/users/avatar:
 *   delete:
 *     summary: Delete user avatar
 *     description: Delete the authenticated user's avatar image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Avatar deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found or no avatar to delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/avatar',
  AuthMiddleware.authenticate,
  usersController.deleteAvatar
);

export { router as usersRoutes };
