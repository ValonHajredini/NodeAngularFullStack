/**
 * CRUD Operations Pattern Example
 *
 * This example demonstrates a complete CRUD implementation following
 * the project's clean architecture patterns.
 *
 * Features:
 * - Full type safety with shared types
 * - Comprehensive error handling
 * - Input validation with Joi
 * - Pagination and filtering
 * - JSDoc documentation
 *
 * Use this pattern for any entity that needs basic CRUD operations.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { AsyncHandler } from '../../utils/async-handler.utils.js';
import { ApiError } from '../../utils/api-error.utils.js';
import { validateRequest } from '../../middleware/validation.middleware.js';

// Example: Task Management CRUD

/**
 * Task entity interface (would be in packages/shared)
 */
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigneeId: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateTaskRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assigneeId: string;
  dueDate: string; // ISO date string
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  dueDate?: string;
}

interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  filters?: {
    status?: string;
    priority?: string;
    assigneeId?: string;
  };
}

/**
 * Validation Schemas
 */
const createTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Task title must be at least 3 characters long',
    'string.max': 'Task title cannot exceed 100 characters',
    'any.required': 'Task title is required'
  }),
  description: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Task description must be at least 10 characters long',
    'string.max': 'Task description cannot exceed 500 characters',
    'any.required': 'Task description is required'
  }),
  priority: Joi.string().valid('low', 'medium', 'high').required().messages({
    'any.only': 'Priority must be one of: low, medium, high',
    'any.required': 'Task priority is required'
  }),
  assigneeId: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid assignee ID format',
    'any.required': 'Assignee ID is required'
  }),
  dueDate: Joi.date().iso().greater('now').required().messages({
    'date.greater': 'Due date must be in the future',
    'any.required': 'Due date is required'
  })
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  status: Joi.string().valid('todo', 'in_progress', 'completed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  assigneeId: Joi.string().uuid().optional(),
  dueDate: Joi.date().iso().optional()
}).min(1).message('At least one field must be provided for update');

const listTasksSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('todo', 'in_progress', 'completed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  assigneeId: Joi.string().uuid().optional(),
  search: Joi.string().min(2).optional()
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid task ID format',
    'any.required': 'Task ID is required'
  })
});

/**
 * Task Service - Business Logic Layer
 */
class TaskService {
  // In-memory storage for demo (use database repository in real app)
  private tasks: Task[] = [
    {
      id: '1',
      title: 'Sample Task',
      description: 'This is a sample task for demonstration',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'user-1',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  /**
   * Get tasks with filtering and pagination.
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @param filters - Filter criteria
   * @returns Paginated and filtered tasks
   */
  async getTasks(
    page: number = 1,
    limit: number = 10,
    filters: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
    } = {}
  ): Promise<TaskListResponse> {
    let filteredTasks = [...this.tasks];

    // Apply filters
    if (filters.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }

    if (filters.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }

    if (filters.assigneeId) {
      filteredTasks = filteredTasks.filter(task => task.assigneeId === filters.assigneeId);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    return {
      tasks: paginatedTasks,
      total: filteredTasks.length,
      page,
      limit,
      filters
    };
  }

  /**
   * Get a single task by ID.
   * @param id - Task ID
   * @returns Task data
   * @throws ApiError when task not found
   */
  async getTaskById(id: string): Promise<Task> {
    const task = this.tasks.find(t => t.id === id);

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    return task;
  }

  /**
   * Create a new task.
   * @param taskData - Task creation data
   * @returns Created task
   */
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    const newTask: Task = {
      id: uuidv4(),
      title: taskData.title,
      description: taskData.description,
      status: 'todo', // Default status
      priority: taskData.priority,
      assigneeId: taskData.assigneeId,
      dueDate: new Date(taskData.dueDate),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.push(newTask);
    return newTask;
  }

  /**
   * Update an existing task.
   * @param id - Task ID
   * @param updateData - Task update data
   * @returns Updated task
   * @throws ApiError when task not found
   */
  async updateTask(id: string, updateData: UpdateTaskRequest): Promise<Task> {
    const taskIndex = this.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      throw new ApiError(404, 'Task not found');
    }

    const updatedTask: Task = {
      ...this.tasks[taskIndex],
      ...updateData,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : this.tasks[taskIndex].dueDate,
      updatedAt: new Date()
    };

    this.tasks[taskIndex] = updatedTask;
    return updatedTask;
  }

  /**
   * Delete a task.
   * @param id - Task ID
   * @throws ApiError when task not found
   */
  async deleteTask(id: string): Promise<void> {
    const taskIndex = this.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      throw new ApiError(404, 'Task not found');
    }

    this.tasks.splice(taskIndex, 1);
  }

  /**
   * Get task statistics.
   * @returns Task statistics
   */
  async getTaskStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const total = this.tasks.length;

    const byStatus = this.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = this.tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus, byPriority };
  }
}

/**
 * Task Controller - Presentation Layer
 */
class TaskController {
  private taskService = new TaskService();

  /**
   * Get all tasks with filtering and pagination.
   */
  getTasks = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, status, priority, assigneeId, search } = req.query;

    const result = await this.taskService.getTasks(
      Number(page) || 1,
      Number(limit) || 10,
      { status: status as string, priority: priority as string, assigneeId: assigneeId as string, search: search as string }
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Tasks retrieved successfully'
    });
  });

  /**
   * Get a single task by ID.
   */
  getTask = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const task = await this.taskService.getTaskById(id);

    res.status(200).json({
      success: true,
      data: { task },
      message: 'Task retrieved successfully'
    });
  });

  /**
   * Create a new task.
   */
  createTask = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const taskData: CreateTaskRequest = req.body;
    const task = await this.taskService.createTask(taskData);

    res.status(201).json({
      success: true,
      data: { task },
      message: 'Task created successfully'
    });
  });

  /**
   * Update an existing task.
   */
  updateTask = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const updateData: UpdateTaskRequest = req.body;
    const task = await this.taskService.updateTask(id, updateData);

    res.status(200).json({
      success: true,
      data: { task },
      message: 'Task updated successfully'
    });
  });

  /**
   * Delete a task.
   */
  deleteTask = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    await this.taskService.deleteTask(id);

    res.status(200).json({
      success: true,
      data: null,
      message: 'Task deleted successfully'
    });
  });

  /**
   * Get task statistics.
   */
  getTaskStats = AsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const stats = await this.taskService.getTaskStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Task statistics retrieved successfully'
    });
  });
}

/**
 * Task Routes - Route Definitions
 */
export const taskRoutes = Router();
const taskController = new TaskController();

// GET /api/tasks - Get all tasks with filtering and pagination
taskRoutes.get('/', validateRequest(listTasksSchema, 'query'), taskController.getTasks);

// GET /api/tasks/stats - Get task statistics
taskRoutes.get('/stats', taskController.getTaskStats);

// GET /api/tasks/:id - Get single task by ID
taskRoutes.get('/:id', validateRequest(idParamSchema, 'params'), taskController.getTask);

// POST /api/tasks - Create new task
taskRoutes.post('/', validateRequest(createTaskSchema), taskController.createTask);

// PUT /api/tasks/:id - Update task
taskRoutes.put(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateTaskSchema),
  taskController.updateTask
);

// DELETE /api/tasks/:id - Delete task
taskRoutes.delete('/:id', validateRequest(idParamSchema, 'params'), taskController.deleteTask);

/**
 * Usage Example:
 *
 * 1. Register routes in your main router:
 *    router.use('/tasks', taskRoutes);
 *
 * 2. API Endpoints will be available at:
 *    - GET    /api/tasks              (list with filtering)
 *    - GET    /api/tasks/stats        (statistics)
 *    - GET    /api/tasks/:id          (get single)
 *    - POST   /api/tasks              (create)
 *    - PUT    /api/tasks/:id          (update)
 *    - DELETE /api/tasks/:id          (delete)
 *
 * 3. Example requests:
 *    - GET /api/tasks?page=1&limit=10&status=todo&priority=high
 *    - POST /api/tasks with JSON body
 *    - PUT /api/tasks/123 with partial JSON body
 */