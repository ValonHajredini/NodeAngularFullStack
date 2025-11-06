import { Request, Response, NextFunction } from 'express';
import { TestToolService } from '../services/test-tool.service';
import { TestToolRepository } from '../repositories/test-tool.repository';
import { pool } from '../config/database.config';

/**
 * Test Tool Controller
 *
 * Handles HTTP requests for Test Tool operations.
 * Delegates business logic to TestToolService.
 */
export class TestToolController {
  constructor(private service: TestToolService) {}

  /**
   * GET /api/tools/test-tool
   * Get all Test Tool records.
   */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const records = await this.service.getAll();
      res.json({
        message: 'Test Tool records retrieved successfully',
        data: records,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/tools/test-tool/:id
   * Get Test Tool record by ID.
   */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const record = await this.service.getById(id);

      if (!record) {
        res.status(404).json({
          error: `Test Tool record with ID '${id}' not found`,
        });
        return;
      }

      res.json({
        message: 'Test Tool record retrieved successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/tools/test-tool
   * Create new Test Tool record.
   */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const record = await this.service.create(req.body);
      res.status(201).json({
        message: 'Test Tool record created successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/tools/test-tool/:id
   * Update Test Tool record.
   */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const record = await this.service.update(id, req.body);
      res.json({
        message: 'Test Tool record updated successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/tools/test-tool/:id
   * Delete Test Tool record.
   */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.json({
        message: 'Test Tool record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

// Dependency injection: Initialize repository, service, and controller
const testToolRepository = new TestToolRepository(pool);
const testToolService = new TestToolService(testToolRepository);
export const testToolController = new TestToolController(testToolService);
