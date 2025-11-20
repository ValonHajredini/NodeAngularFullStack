import { Router } from 'express';
import { testToolController } from '../controllers/test-tool.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  validateTestToolCreate,
  validateTestToolUpdate,
} from '../validators/test-tool.validator';

/**
 * Test Tool Routes
 *
 * Express router for Test Tool API endpoints.
 * All routes protected by authentication middleware.
 */

const router = Router();

/**
 * @route   GET /api/tools/test-tool
 * @desc    Get all Test Tool records
 * @access  Private (requires authentication)
 */
router.get('/', AuthMiddleware.authenticate, testToolController.getAll);

/**
 * @route   GET /api/tools/test-tool/:id
 * @desc    Get Test Tool record by ID
 * @access  Private (requires authentication)
 */
router.get('/:id', AuthMiddleware.authenticate, testToolController.getById);

/**
 * @route   POST /api/tools/test-tool
 * @desc    Create new Test Tool record
 * @access  Private (requires authentication)
 */
router.post(
  '/',
  AuthMiddleware.authenticate,
  validateTestToolCreate,
  testToolController.create
);

/**
 * @route   PUT /api/tools/test-tool/:id
 * @desc    Update Test Tool record
 * @access  Private (requires authentication)
 */
router.put(
  '/:id',
  AuthMiddleware.authenticate,
  validateTestToolUpdate,
  testToolController.update
);

/**
 * @route   DELETE /api/tools/test-tool/:id
 * @desc    Delete Test Tool record
 * @access  Private (requires authentication)
 */
router.delete('/:id', AuthMiddleware.authenticate, testToolController.delete);

export const testToolRoutes = router;
