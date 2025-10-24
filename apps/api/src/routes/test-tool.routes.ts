import { Router } from 'express';
import { TestToolController } from '../controllers/test-tool.controller';
import { authMiddleware } from '../middleware/auth.middleware';
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

// Initialize controller (dependency injection happens in main app setup)
const controller = new TestToolController(/* service will be injected */);

const router = Router();

/**
 * @route   GET /api/tools/test-tool
 * @desc    Get all Test Tool records
 * @access  Private (requires authentication)
 */
router.get('/', authMiddleware, controller.getAll);

/**
 * @route   GET /api/tools/test-tool/:id
 * @desc    Get Test Tool record by ID
 * @access  Private (requires authentication)
 */
router.get('/:id', authMiddleware, controller.getById);

/**
 * @route   POST /api/tools/test-tool
 * @desc    Create new Test Tool record
 * @access  Private (requires authentication)
 */
router.post('/', authMiddleware, validateTestToolCreate, controller.create);

/**
 * @route   PUT /api/tools/test-tool/:id
 * @desc    Update Test Tool record
 * @access  Private (requires authentication)
 */
router.put('/:id', authMiddleware, validateTestToolUpdate, controller.update);

/**
 * @route   DELETE /api/tools/test-tool/:id
 * @desc    Delete Test Tool record
 * @access  Private (requires authentication)
 */
router.delete('/:id', authMiddleware, controller.delete);

export default router;
