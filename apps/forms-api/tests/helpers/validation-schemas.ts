/**
 * Joi validation schemas for API response testing.
 * Ensures all API responses conform to expected structure and data types.
 */

import Joi from 'joi';

/**
 * User object schema validation.
 */
export const userSchema = Joi.object({
  id: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  role: Joi.string().valid('admin', 'user', 'readonly').required(),
  tenantId: Joi.string().uuid().allow(null),
  isActive: Joi.boolean().default(true),
  createdAt: Joi.string().isoDate().required(),
  updatedAt: Joi.string().isoDate().required(),
  deletedAt: Joi.string().isoDate().allow(null)
});

/**
 * Authentication response schema.
 */
export const authResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    user: userSchema.required(),
    token: Joi.string().required(),
    refreshToken: Joi.string().required(),
    expiresIn: Joi.number().integer().positive().required()
  }).required(),
  message: Joi.string().optional()
});

/**
 * Standard success response schema.
 */
export const successResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.any().required(),
  message: Joi.string().optional(),
  timestamp: Joi.string().isoDate().optional()
});

/**
 * Error response schema.
 */
export const errorResponseSchema = Joi.object({
  success: Joi.boolean().valid(false).required(),
  error: Joi.object({
    code: Joi.string().required(),
    message: Joi.string().required(),
    details: Joi.object().optional(),
    timestamp: Joi.string().isoDate().required(),
    requestId: Joi.string().optional(),
    path: Joi.string().optional(),
    method: Joi.string().optional()
  }).required()
});

/**
 * Paginated response schema.
 */
export const paginatedResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    users: Joi.array().items(userSchema).required(),
    pagination: Joi.object({
      page: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      total: Joi.number().integer().min(0).required(),
      pages: Joi.number().integer().min(0).required(),
      hasNext: Joi.boolean().required(),
      hasPrev: Joi.boolean().required()
    }).required()
  }).required()
});

/**
 * User profile response schema.
 */
export const userProfileResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: userSchema.required()
});

/**
 * User creation response schema.
 */
export const userCreationResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: userSchema.required(),
  message: Joi.string().optional()
});

/**
 * User update response schema.
 */
export const userUpdateResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: userSchema.required(),
  message: Joi.string().optional()
});

/**
 * User deletion response schema.
 */
export const userDeletionResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    id: Joi.string().uuid().required(),
    deleted: Joi.boolean().valid(true).required()
  }).required(),
  message: Joi.string().optional()
});

/**
 * Token refresh response schema.
 */
export const tokenRefreshResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    token: Joi.string().required(),
    refreshToken: Joi.string().required(),
    expiresIn: Joi.number().integer().positive().required()
  }).required()
});

/**
 * Password reset request response schema.
 */
export const passwordResetRequestResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    message: Joi.string().required(),
    resetTokenExpiry: Joi.string().isoDate().optional()
  }).required()
});

/**
 * Logout response schema.
 */
export const logoutResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    message: Joi.string().required()
  }).required()
});

/**
 * Health check response schema.
 */
export const healthCheckResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    status: Joi.string().valid('healthy').required(),
    timestamp: Joi.string().isoDate().required(),
    uptime: Joi.number().positive().required(),
    database: Joi.object({
      status: Joi.string().valid('connected', 'disconnected').required(),
      latency: Joi.number().min(0).optional()
    }).required(),
    memory: Joi.object({
      used: Joi.number().positive().required(),
      total: Joi.number().positive().required(),
      percentage: Joi.number().min(0).max(100).required()
    }).optional()
  }).required()
});

/**
 * Audit log entry schema.
 */
export const auditLogSchema = Joi.object({
  id: Joi.string().uuid().required(),
  action: Joi.string().required(),
  entityType: Joi.string().required(),
  entityId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().required(),
  changes: Joi.object().optional(),
  metadata: Joi.object().optional(),
  timestamp: Joi.string().isoDate().required(),
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().optional()
});

/**
 * Audit logs response schema.
 */
export const auditLogsResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  data: Joi.object({
    logs: Joi.array().items(auditLogSchema).required(),
    pagination: Joi.object({
      page: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      total: Joi.number().integer().min(0).required(),
      pages: Joi.number().integer().min(0).required(),
      hasNext: Joi.boolean().required(),
      hasPrev: Joi.boolean().required()
    }).required()
  }).required()
});

/**
 * Generic validation helper function.
 */
export const validateResponse = (schema: Joi.ObjectSchema, response: any): { error?: Joi.ValidationError; value: any } => {
  return schema.validate(response, { allowUnknown: false, stripUnknown: false });
};

/**
 * Assert response matches schema with detailed error information.
 */
export const assertValidResponse = (schema: Joi.ObjectSchema, response: any, context?: string): void => {
  const { error, value } = validateResponse(schema, response);

  if (error) {
    const contextMsg = context ? ` in ${context}` : '';
    throw new Error(`Response validation failed${contextMsg}: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
};