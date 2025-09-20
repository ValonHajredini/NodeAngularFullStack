import { Request, Response, NextFunction } from 'express';

/**
 * Express async request handler type
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wrapper for async route handlers to properly catch and forward errors.
 * Eliminates the need for try-catch blocks in every async route handler.
 *
 * @param fn - Async route handler function
 * @returns Express middleware function that handles async errors
 *
 * @example
 * router.get('/users', AsyncHandler(async (req, res) => {
 *   const users = await userService.getAll();
 *   res.json(users);
 * }));
 */
export const AsyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};