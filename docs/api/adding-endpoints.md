# Adding New API Endpoints

## Overview

This guide provides step-by-step instructions for adding new API endpoints to the
NodeAngularFullStack application, following established patterns and best practices.

## Step-by-Step Guide

### 1. Define Shared Types

First, define your data types in the shared package to ensure type safety across frontend and
backend.

```typescript
// packages/shared/src/types/product.types.ts

/**
 * Product entity representing a catalog item.
 */
export interface Product {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Product name */
  name: string;
  /** Product description */
  description: string;
  /** Product price in decimal format */
  price: number;
  /** Category identifier */
  categoryId: string;
  /** Category name (populated from join) */
  categoryName?: string;
  /** Tenant identifier for multi-tenancy */
  tenantId: string;
  /** User who created the product */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Request payload for creating a new product.
 */
export interface CreateProductRequest {
  /** Product name (1-255 characters) */
  name: string;
  /** Product description (optional, max 1000 characters) */
  description?: string;
  /** Product price (must be positive) */
  price: number;
  /** Category identifier (must exist) */
  categoryId: string;
}

/**
 * Request payload for updating a product.
 */
export interface UpdateProductRequest {
  /** Updated product name */
  name?: string;
  /** Updated product description */
  description?: string;
  /** Updated product price */
  price?: number;
  /** Updated category identifier */
  categoryId?: string;
}

/**
 * API response for product operations.
 */
export interface ProductResponse {
  /** Operation success status */
  success: boolean;
  /** Product data */
  data: Product;
  /** Response metadata */
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * API response for product list operations.
 */
export interface ProductListResponse {
  /** Operation success status */
  success: boolean;
  /** Array of products */
  data: Product[];
  /** Pagination metadata */
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  /** Response metadata */
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
```

### 2. Create Database Migration

Create a migration file for your new table structure.

```sql
-- database/migrations/20240115120000_create_products_table.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT products_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT products_price_positive CHECK (price > 0),

    -- Foreign keys
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_products_creator FOREIGN KEY (created_by) REFERENCES users(id),

    -- Unique constraint per tenant
    UNIQUE(name, tenant_id)
);

-- Indexes for performance
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('english', name));

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access products from their tenant
CREATE POLICY products_tenant_isolation ON products
    FOR ALL
    TO authenticated
    USING (
        tenant_id = COALESCE(
            current_setting('app.current_tenant', true)::UUID,
            (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user', true)::UUID)
        )
    );

-- Trigger for automatic updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE products IS 'Product catalog with multi-tenant support and full-text search';
COMMENT ON COLUMN products.tenant_id IS 'Tenant isolation key for multi-tenancy';
COMMENT ON COLUMN products.price IS 'Product price in decimal format (supports up to 99,999,999.99)';
COMMENT ON COLUMN products.name IS 'Product name with unique constraint per tenant';
```

### 3. Create Repository Layer

Implement the data access layer with proper SQL queries and error handling.

```typescript
// apps/api/src/repositories/product.repository.ts

import { Pool, PoolClient } from 'pg';
import { Product, CreateProductRequest, UpdateProductRequest } from '@shared/types/product.types';
import { PaginationOptions, PaginationResult } from '../types/pagination.types';

/**
 * Product repository handling database operations.
 * Implements data access patterns with tenant isolation and performance optimization.
 */
export class ProductRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Finds all products for a specific tenant with pagination.
   * @param tenantId - Tenant identifier
   * @param options - Pagination and search options
   * @returns Promise<PaginationResult<Product>> Paginated products
   */
  async findByTenant(
    tenantId: string,
    options: PaginationOptions & { search?: string }
  ): Promise<PaginationResult<Product>> {
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramCount = 1;

    // Add search functionality
    if (search) {
      paramCount++;
      whereClause += ` AND (
        p.name ILIKE $${paramCount} OR
        p.description ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;

    // Data query with joins and pagination
    const dataQuery = `
      SELECT
        p.*,
        c.name as category_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([
      this.db.query(countQuery, params.slice(0, -2)),
      this.db.query(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows.map(this.mapRowToProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Finds a product by ID and tenant.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<Product | null> Product or null if not found
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Product | null> {
    const query = `
      SELECT
        p.*,
        c.name as category_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1 AND p.tenant_id = $2
    `;

    const result = await this.db.query(query, [id, tenantId]);
    return result.rows.length > 0 ? this.mapRowToProduct(result.rows[0]) : null;
  }

  /**
   * Creates a new product within a transaction.
   * @param productData - Product creation data
   * @returns Promise<Product> Created product
   */
  async create(
    productData: CreateProductRequest & { tenantId: string; createdBy: string }
  ): Promise<Product> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate category exists and belongs to the same tenant
      const categoryCheck = await client.query(
        'SELECT id FROM categories WHERE id = $1 AND tenant_id = $2',
        [productData.categoryId, productData.tenantId]
      );

      if (categoryCheck.rows.length === 0) {
        throw new Error('Category not found or does not belong to tenant');
      }

      // Insert product
      const insertQuery = `
        INSERT INTO products (
          name, description, price, category_id, tenant_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        productData.name,
        productData.description || null,
        productData.price,
        productData.categoryId,
        productData.tenantId,
        productData.createdBy,
      ];

      const result = await client.query(insertQuery, values);

      await client.query('COMMIT');
      return this.mapRowToProduct(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates a product by ID and tenant.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @param updateData - Update data
   * @returns Promise<Product | null> Updated product or null if not found
   */
  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    updateData: UpdateProductRequest
  ): Promise<Product | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if product exists and belongs to tenant
      const existingProduct = await client.query(
        'SELECT id FROM products WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (existingProduct.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Validate category if being updated
      if (updateData.categoryId) {
        const categoryCheck = await client.query(
          'SELECT id FROM categories WHERE id = $1 AND tenant_id = $2',
          [updateData.categoryId, tenantId]
        );

        if (categoryCheck.rows.length === 0) {
          throw new Error('Category not found or does not belong to tenant');
        }
      }

      // Build dynamic update query
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (setClauses.length === 0) {
        await client.query('ROLLBACK');
        return this.findByIdAndTenant(id, tenantId);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id, tenantId);

      const updateQuery = `
        UPDATE products
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      await client.query('COMMIT');
      return result.rows.length > 0 ? this.mapRowToProduct(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a product by ID and tenant.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<boolean> True if deleted, false if not found
   */
  async deleteByIdAndTenant(id: string, tenantId: string): Promise<boolean> {
    const query = `
      UPDATE products
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [id, tenantId]);
    return result.rowCount > 0;
  }

  /**
   * Checks if a product name exists within a tenant (for duplicate validation).
   * @param name - Product name
   * @param tenantId - Tenant identifier
   * @param excludeId - Product ID to exclude from check (for updates)
   * @returns Promise<boolean> True if name exists
   */
  async nameExistsInTenant(name: string, tenantId: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT 1 FROM products
      WHERE LOWER(name) = LOWER($1) AND tenant_id = $2 AND deleted_at IS NULL
    `;
    const params: any[] = [name, tenantId];

    if (excludeId) {
      query += ' AND id != $3';
      params.push(excludeId);
    }

    const result = await this.db.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Maps database row to Product object.
   * @param row - Database row
   * @returns Product object
   */
  private mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      categoryId: row.category_id,
      categoryName: row.category_name,
      tenantId: row.tenant_id,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Converts camelCase to snake_case for database columns.
   * @param str - camelCase string
   * @returns snake_case string
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
```

### 4. Create Service Layer

Implement business logic and validation in the service layer.

```typescript
// apps/api/src/services/product.service.ts

import { ProductRepository } from '../repositories/product.repository';
import { Product, CreateProductRequest, UpdateProductRequest } from '@shared/types/product.types';
import { PaginationOptions, PaginationResult } from '../types/pagination.types';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors';
import { Logger } from '../utils/logger';

/**
 * Product service containing business logic for product operations.
 * Handles validation, business rules, and coordinates with repository layer.
 */
export class ProductService {
  private readonly logger = Logger.create('ProductService');

  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * Retrieves paginated products for a specific tenant.
   * @param tenantId - Tenant identifier
   * @param options - Pagination and search options
   * @returns Promise<PaginationResult<Product>> Paginated products
   */
  async findAllByTenant(
    tenantId: string,
    options: PaginationOptions & { search?: string }
  ): Promise<PaginationResult<Product>> {
    this.logger.info('Finding products by tenant', { tenantId, options });

    // Validate pagination parameters
    const { page = 1, limit = 20 } = options;

    if (page < 1) {
      throw new ValidationError('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    const result = await this.productRepository.findByTenant(tenantId, {
      ...options,
      page,
      limit,
    });

    this.logger.info('Found products', {
      tenantId,
      count: result.data.length,
      total: result.pagination.total,
    });

    return result;
  }

  /**
   * Retrieves a product by ID and tenant.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<Product> Product
   * @throws NotFoundError if product not found
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Product> {
    this.logger.info('Finding product by ID', { id, tenantId });

    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new ValidationError('Invalid product ID format');
    }

    const product = await this.productRepository.findByIdAndTenant(id, tenantId);

    if (!product) {
      this.logger.warn('Product not found', { id, tenantId });
      throw new NotFoundError('Product not found');
    }

    this.logger.info('Found product', { id: product.id, name: product.name });
    return product;
  }

  /**
   * Creates a new product with comprehensive validation.
   * @param productData - Product creation data
   * @param tenantId - Tenant identifier
   * @param createdBy - User creating the product
   * @returns Promise<Product> Created product
   * @throws ValidationError if data is invalid
   * @throws ConflictError if product name already exists
   */
  async create(
    productData: CreateProductRequest,
    tenantId: string,
    createdBy: string
  ): Promise<Product> {
    this.logger.info('Creating product', { productData, tenantId, createdBy });

    // Validate required fields
    await this.validateProductData(productData);

    // Check for duplicate names within tenant
    const nameExists = await this.productRepository.nameExistsInTenant(productData.name, tenantId);

    if (nameExists) {
      this.logger.warn('Product name already exists', { name: productData.name, tenantId });
      throw new ConflictError('Product name already exists in this tenant');
    }

    const product = await this.productRepository.create({
      ...productData,
      tenantId,
      createdBy,
    });

    this.logger.info('Product created successfully', {
      id: product.id,
      name: product.name,
      tenantId,
    });

    return product;
  }

  /**
   * Updates a product with validation.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @param updateData - Update data
   * @returns Promise<Product> Updated product
   * @throws NotFoundError if product not found
   * @throws ValidationError if data is invalid
   * @throws ConflictError if updated name already exists
   */
  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    updateData: UpdateProductRequest
  ): Promise<Product> {
    this.logger.info('Updating product', { id, tenantId, updateData });

    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new ValidationError('Invalid product ID format');
    }

    // Validate update data
    await this.validateProductUpdateData(updateData);

    // Check for duplicate names if name is being updated
    if (updateData.name) {
      const nameExists = await this.productRepository.nameExistsInTenant(
        updateData.name,
        tenantId,
        id
      );

      if (nameExists) {
        this.logger.warn('Product name already exists', {
          name: updateData.name,
          tenantId,
          excludeId: id,
        });
        throw new ConflictError('Product name already exists in this tenant');
      }
    }

    const product = await this.productRepository.updateByIdAndTenant(id, tenantId, updateData);

    if (!product) {
      this.logger.warn('Product not found for update', { id, tenantId });
      throw new NotFoundError('Product not found');
    }

    this.logger.info('Product updated successfully', {
      id: product.id,
      name: product.name,
    });

    return product;
  }

  /**
   * Soft deletes a product.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<void>
   * @throws NotFoundError if product not found
   */
  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    this.logger.info('Deleting product', { id, tenantId });

    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new ValidationError('Invalid product ID format');
    }

    const deleted = await this.productRepository.deleteByIdAndTenant(id, tenantId);

    if (!deleted) {
      this.logger.warn('Product not found for deletion', { id, tenantId });
      throw new NotFoundError('Product not found');
    }

    this.logger.info('Product deleted successfully', { id, tenantId });
  }

  /**
   * Validates product creation data.
   * @param productData - Product data to validate
   * @throws ValidationError if validation fails
   */
  private async validateProductData(productData: CreateProductRequest): Promise<void> {
    const errors: string[] = [];

    // Validate name
    if (!productData.name?.trim()) {
      errors.push('Product name is required');
    } else if (productData.name.length > 255) {
      errors.push('Product name cannot exceed 255 characters');
    }

    // Validate description
    if (productData.description && productData.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    // Validate price
    if (typeof productData.price !== 'number' || productData.price <= 0) {
      errors.push('Price must be a positive number');
    } else if (productData.price > 99999999.99) {
      errors.push('Price cannot exceed 99,999,999.99');
    }

    // Validate category ID
    if (!productData.categoryId) {
      errors.push('Category ID is required');
    } else if (!this.isValidUUID(productData.categoryId)) {
      errors.push('Category ID must be a valid UUID');
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', { errors });
    }
  }

  /**
   * Validates product update data.
   * @param updateData - Update data to validate
   * @throws ValidationError if validation fails
   */
  private async validateProductUpdateData(updateData: UpdateProductRequest): Promise<void> {
    const errors: string[] = [];

    // Validate name if provided
    if (updateData.name !== undefined) {
      if (!updateData.name?.trim()) {
        errors.push('Product name cannot be empty');
      } else if (updateData.name.length > 255) {
        errors.push('Product name cannot exceed 255 characters');
      }
    }

    // Validate description if provided
    if (updateData.description !== undefined && updateData.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }

    // Validate price if provided
    if (updateData.price !== undefined) {
      if (typeof updateData.price !== 'number' || updateData.price <= 0) {
        errors.push('Price must be a positive number');
      } else if (updateData.price > 99999999.99) {
        errors.push('Price cannot exceed 99,999,999.99');
      }
    }

    // Validate category ID if provided
    if (updateData.categoryId !== undefined && !this.isValidUUID(updateData.categoryId)) {
      errors.push('Category ID must be a valid UUID');
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', { errors });
    }
  }

  /**
   * Validates UUID format.
   * @param uuid - String to validate
   * @returns boolean True if valid UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
```

### 5. Create Controller Layer

Implement HTTP request handling in the controller layer.

```typescript
// apps/api/src/controllers/product.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { CreateProductRequest, UpdateProductRequest } from '@shared/types/product.types';
import { AsyncHandler } from '../utils/async-handler';
import { AuthenticatedRequest } from '../types/auth.types';
import { Logger } from '../utils/logger';

/**
 * Product controller handling HTTP requests for product operations.
 * Implements REST API patterns with proper error handling and validation.
 */
export class ProductController {
  private readonly logger = Logger.create('ProductController');

  constructor(private readonly productService: ProductService) {}

  /**
   * Retrieves paginated products for the authenticated tenant.
   * @route GET /api/v1/products
   * @access Private (requires authentication)
   */
  getProducts = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    this.logger.info('Get products request', {
      tenantId,
      page,
      limit,
      search,
      userId: req.user!.id,
    });

    const result = await this.productService.findAllByTenant(tenantId, {
      page,
      limit,
      search,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  });

  /**
   * Retrieves a specific product by ID.
   * @route GET /api/v1/products/:id
   * @access Private (requires authentication)
   */
  getProduct = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    this.logger.info('Get product request', {
      id,
      tenantId,
      userId: req.user!.id,
    });

    const product = await this.productService.findByIdAndTenant(id, tenantId);

    res.json({
      success: true,
      data: product,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  });

  /**
   * Creates a new product.
   * @route POST /api/v1/products
   * @access Private (requires authentication)
   */
  createProduct = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const productData: CreateProductRequest = req.body;
    const tenantId = req.user!.tenantId;
    const createdBy = req.user!.id;

    this.logger.info('Create product request', {
      productData,
      tenantId,
      createdBy,
    });

    const product = await this.productService.create(productData, tenantId, createdBy);

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  });

  /**
   * Updates an existing product.
   * @route PUT /api/v1/products/:id
   * @access Private (requires authentication)
   */
  updateProduct = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateProductRequest = req.body;
    const tenantId = req.user!.tenantId;

    this.logger.info('Update product request', {
      id,
      updateData,
      tenantId,
      userId: req.user!.id,
    });

    const product = await this.productService.updateByIdAndTenant(id, tenantId, updateData);

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  });

  /**
   * Soft deletes a product.
   * @route DELETE /api/v1/products/:id
   * @access Private (requires authentication)
   */
  deleteProduct = AsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    this.logger.info('Delete product request', {
      id,
      tenantId,
      userId: req.user!.id,
    });

    await this.productService.deleteByIdAndTenant(id, tenantId);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  });
}
```

### 6. Create Validation Schemas

Define request validation using Joi.

```typescript
// apps/api/src/validators/product.validators.ts

import Joi from 'joi';

/**
 * Validation schema for creating a new product.
 */
export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Product name is required',
    'string.min': 'Product name must be at least 1 character',
    'string.max': 'Product name cannot exceed 255 characters',
    'any.required': 'Product name is required',
  }),

  description: Joi.string().trim().max(1000).allow('').optional().messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),

  price: Joi.number().positive().precision(2).max(99999999.99).required().messages({
    'number.positive': 'Price must be greater than 0',
    'number.base': 'Price must be a valid number',
    'number.max': 'Price cannot exceed 99,999,999.99',
    'any.required': 'Price is required',
  }),

  categoryId: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'Category ID must be a valid UUID',
    'any.required': 'Category ID is required',
  }),
});

/**
 * Validation schema for updating a product.
 */
export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional().messages({
    'string.empty': 'Product name cannot be empty',
    'string.min': 'Product name must be at least 1 character',
    'string.max': 'Product name cannot exceed 255 characters',
  }),

  description: Joi.string().trim().max(1000).allow('').optional().messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),

  price: Joi.number().positive().precision(2).max(99999999.99).optional().messages({
    'number.positive': 'Price must be greater than 0',
    'number.base': 'Price must be a valid number',
    'number.max': 'Price cannot exceed 99,999,999.99',
  }),

  categoryId: Joi.string().uuid({ version: 'uuidv4' }).optional().messages({
    'string.guid': 'Category ID must be a valid UUID',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

/**
 * Validation schema for query parameters.
 */
export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be greater than 0',
  }),

  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),

  search: Joi.string().trim().max(255).optional().messages({
    'string.max': 'Search term cannot exceed 255 characters',
  }),
});
```

### 7. Create Routes

Define the HTTP routes and wire up middleware.

```typescript
// apps/api/src/routes/product.routes.ts

import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validators/product.validators';
import { database } from '../utils/database';

const router = Router();

// Initialize dependencies using dependency injection pattern
const productRepository = new ProductRepository(database);
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

// Apply middleware to all routes
router.use(authMiddleware); // Require authentication
router.use(rateLimitMiddleware); // Apply rate limiting

/**
 * @route GET /api/v1/products
 * @desc Get paginated products for authenticated tenant
 * @access Private
 */
router.get('/', validateRequest(productQuerySchema, 'query'), productController.getProducts);

/**
 * @route GET /api/v1/products/:id
 * @desc Get specific product by ID
 * @access Private
 */
router.get('/:id', productController.getProduct);

/**
 * @route POST /api/v1/products
 * @desc Create a new product
 * @access Private
 */
router.post('/', validateRequest(createProductSchema), productController.createProduct);

/**
 * @route PUT /api/v1/products/:id
 * @desc Update a product
 * @access Private
 */
router.put('/:id', validateRequest(updateProductSchema), productController.updateProduct);

/**
 * @route DELETE /api/v1/products/:id
 * @desc Soft delete a product
 * @access Private
 */
router.delete('/:id', productController.deleteProduct);

export { router as productRoutes };
```

### 8. Register Routes in Main App

Add the new routes to your main application.

```typescript
// apps/api/src/app.ts

import express from 'express';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { productRoutes } from './routes/product.routes'; // New import

const app = express();

// ... existing middleware setup

// Register routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes); // New route registration

// ... rest of app setup

export { app };
```

### 9. Update OpenAPI Documentation

Add your new endpoints to the Swagger specification.

```typescript
// apps/api/src/config/swagger.config.ts

// Add to paths object:
'/products': {
  get: {
    summary: 'Get paginated products',
    description: 'Retrieve paginated list of products for authenticated tenant',
    tags: ['Products'],
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: 'query',
        name: 'page',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number for pagination'
      },
      {
        in: 'query',
        name: 'limit',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page'
      },
      {
        in: 'query',
        name: 'search',
        schema: { type: 'string', maxLength: 255 },
        description: 'Search term for product name or description'
      }
    ],
    responses: {
      '200': {
        description: 'Products retrieved successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ProductListResponse' }
          }
        }
      }
    }
  },
  post: {
    summary: 'Create a new product',
    description: 'Create a new product in the authenticated tenant',
    tags: ['Products'],
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateProductRequest' }
        }
      }
    },
    responses: {
      '201': {
        description: 'Product created successfully',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ProductResponse' }
          }
        }
      }
    }
  }
},

// Add to components.schemas:
Product: {
  type: 'object',
  required: ['id', 'name', 'price', 'categoryId', 'tenantId'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    price: { type: 'number', format: 'decimal', minimum: 0.01, maximum: 99999999.99 },
    categoryId: { type: 'string', format: 'uuid' },
    categoryName: { type: 'string' },
    tenantId: { type: 'string', format: 'uuid' },
    createdBy: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
}
```

### 10. Write Tests

Create comprehensive tests for your new endpoints.

```typescript
// apps/api/tests/integration/products.test.ts

import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDb, cleanupTestDb } from '../helpers/database';
import { createTestUser, getAuthToken } from '../helpers/auth';

describe('Products API', () => {
  let authToken: string;
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    await setupTestDb();
    const user = await createTestUser();
    authToken = await getAuthToken(user);
    userId = user.id;
    tenantId = user.tenantId;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('POST /api/v1/products', () => {
    it('should create a new product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        categoryId: 'valid-category-uuid',
      };

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.price).toBe(productData.price);
      expect(response.body.data.tenantId).toBe(tenantId);
    });
  });

  // ... more tests
});
```

## Best Practices Summary

1. **Type Safety**: Always define shared types first
2. **Validation**: Implement comprehensive input validation
3. **Error Handling**: Use custom error types and proper HTTP status codes
4. **Security**: Implement tenant isolation and authentication
5. **Testing**: Write comprehensive unit and integration tests
6. **Documentation**: Update OpenAPI specs and maintain JSDoc comments
7. **Logging**: Add structured logging for debugging and monitoring
8. **Transactions**: Use database transactions for data consistency
9. **Performance**: Add appropriate indexes and implement pagination
10. **Monitoring**: Include request tracing and performance metrics

This guide provides a complete blueprint for adding new API endpoints while maintaining consistency
with the existing architecture and patterns.
