# Extension Points Guide

## Overview

This guide provides detailed instructions for extending and customizing the NodeAngularFullStack
boilerplate for specific project needs. Each section includes step-by-step instructions, code
examples, and best practices.

## Frontend Extensions

### Adding New Angular Features

#### 1. Creating a New Feature Module

**Step-by-step process:**

```bash
# 1. Create feature directory structure
mkdir -p apps/web/src/app/features/products/{components,pages,services,types}

# 2. Create route component
touch apps/web/src/app/features/products/pages/product-list.page.ts
touch apps/web/src/app/features/products/pages/product-detail.page.ts

# 3. Create feature-specific components
touch apps/web/src/app/features/products/components/product-card/product-card.component.ts
touch apps/web/src/app/features/products/components/product-form/product-form.component.ts

# 4. Create feature service
touch apps/web/src/app/features/products/services/product.service.ts

# 5. Create routing configuration
touch apps/web/src/app/features/products/products.routes.ts
```

**Example Implementation:**

```typescript
// apps/web/src/app/features/products/types/product.types.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: string;
}

// apps/web/src/app/features/products/services/product.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, CreateProductRequest } from '../types/product.types';

/**
 * Service for managing product operations.
 * Handles CRUD operations for products with proper error handling.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/products';

  /**
   * Retrieves all products for the current tenant.
   * @returns Observable<Product[]> Array of products
   */
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }

  /**
   * Retrieves a specific product by ID.
   * @param id - Product identifier
   * @returns Observable<Product> Product details
   */
  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  /**
   * Creates a new product.
   * @param product - Product creation data
   * @returns Observable<Product> Created product
   */
  createProduct(product: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  /**
   * Updates an existing product.
   * @param id - Product identifier
   * @param product - Updated product data
   * @returns Observable<Product> Updated product
   */
  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, product);
  }

  /**
   * Deletes a product.
   * @param id - Product identifier
   * @returns Observable<void>
   */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

// apps/web/src/app/features/products/pages/product-list.page.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../services/product.service';
import { ProductCardComponent } from '../components/product-card/product-card.component';
import { Product } from '../types/product.types';

/**
 * Product list page component.
 * Displays a grid of products with search and filtering capabilities.
 */
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Products</h1>
        <button
          routerLink="/products/new"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Product
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-8">Loading products...</div>
      } @else if (error()) {
        <div class="text-red-600 text-center py-8">{{ error() }}</div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (product of products(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
      }
    </div>
  `,
})
export class ProductListPage {
  private readonly productService = inject(ProductService);

  products = signal<Product[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadProducts();
  }

  private loadProducts() {
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load products');
        this.loading.set(false);
        console.error('Error loading products:', err);
      },
    });
  }
}

// apps/web/src/app/features/products/products.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const productRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/product-list.page').then((m) => m.ProductListPage),
      },
      {
        path: 'new',
        loadComponent: () => import('./pages/product-form.page').then((m) => m.ProductFormPage),
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/product-detail.page').then((m) => m.ProductDetailPage),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./pages/product-form.page').then((m) => m.ProductFormPage),
      },
    ],
  },
];
```

#### 2. Integrating with Main Application

```typescript
// apps/web/src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ... existing routes
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes').then((m) => m.productRoutes),
  },
];
```

### Adding Custom UI Components

#### 1. Creating Reusable Components

```typescript
// apps/web/src/app/shared/components/data-table/data-table.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  template?: (value: any, row: T) => string;
}

export interface TableAction<T> {
  label: string;
  icon?: string;
  action: (row: T) => void;
  disabled?: (row: T) => boolean;
}

/**
 * Generic data table component with sorting, filtering, and actions.
 * Supports custom column templates and row actions.
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            @for (column of columns; track column.key) {
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  *ngIf="column.sortable"
                  (click)="onSort(column.key)"
                  class="group inline-flex"
                >
                  {{ column.label }}
                  <span class="ml-2 flex-none rounded text-gray-400 group-hover:visible"> ↕ </span>
                </button>
                <span *ngIf="!column.sortable">{{ column.label }}</span>
              </th>
            }
            @if (actions && actions.length > 0) {
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            }
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          @for (row of sortedData(); track trackByFn(row)) {
            <tr class="hover:bg-gray-50">
              @for (column of columns; track column.key) {
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  @if (column.template) {
                    [innerHTML]="column.template(row[column.key], row)"
                  } @else {
                    {{ row[column.key] }}
                  }
                </td>
              }
              @if (actions && actions.length > 0) {
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  @for (action of actions; track action.label) {
                    <button
                      (click)="action.action(row)"
                      [disabled]="action.disabled?.(row)"
                      class="text-indigo-600 hover:text-indigo-900 mr-2 disabled:text-gray-400"
                    >
                      {{ action.label }}
                    </button>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DataTableComponent<T> {
  @Input() data: T[] = [];
  @Input() columns: TableColumn<T>[] = [];
  @Input() actions?: TableAction<T>[];
  @Input() trackByFn: (item: T) => any = (item) => item;

  @Output() sort = new EventEmitter<{ key: keyof T; direction: 'asc' | 'desc' }>();

  private sortKey: keyof T | null = null;
  private sortDirection: 'asc' | 'desc' = 'asc';

  sortedData() {
    if (!this.sortKey) return this.data;

    return [...this.data].sort((a, b) => {
      const aVal = a[this.sortKey!];
      const bVal = b[this.sortKey!];

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onSort(key: keyof T) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    this.sort.emit({ key, direction: this.sortDirection });
  }
}
```

## Backend Extensions

### Adding New API Endpoints

#### 1. Creating a New Controller

```typescript
// apps/api/src/controllers/products.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { CreateProductRequest, UpdateProductRequest } from '../types/product.types';
import { AsyncHandler } from '../utils/async-handler';

/**
 * Product controller handling HTTP requests for product operations.
 * Implements CRUD operations with proper error handling and validation.
 */
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Retrieves all products for the authenticated tenant.
   * @route GET /api/products
   */
  getProducts = AsyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    const products = await this.productService.findAllByTenant(tenantId);

    res.json({
      success: true,
      data: products,
      meta: {
        total: products.length,
        page: 1,
        limit: products.length,
      },
    });
  });

  /**
   * Retrieves a specific product by ID.
   * @route GET /api/products/:id
   */
  getProduct = AsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const product = await this.productService.findByIdAndTenant(id, tenantId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  });

  /**
   * Creates a new product.
   * @route POST /api/products
   */
  createProduct = AsyncHandler(async (req: Request, res: Response) => {
    const productData: CreateProductRequest = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    const product = await this.productService.create({
      ...productData,
      tenantId,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  });

  /**
   * Updates an existing product.
   * @route PUT /api/products/:id
   */
  updateProduct = AsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateProductRequest = req.body;
    const tenantId = req.user?.tenantId;

    const product = await this.productService.updateByIdAndTenant(id, tenantId, updateData);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  });

  /**
   * Deletes a product.
   * @route DELETE /api/products/:id
   */
  deleteProduct = AsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const deleted = await this.productService.deleteByIdAndTenant(id, tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  });
}
```

#### 2. Creating Service Layer

```typescript
// apps/api/src/services/product.service.ts
import { ProductRepository } from '../repositories/product.repository';
import { Product, CreateProductData, UpdateProductData } from '../types/product.types';
import { ValidationError, NotFoundError } from '../utils/errors';

/**
 * Product service containing business logic for product operations.
 * Handles validation, business rules, and coordinates with repository layer.
 */
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * Retrieves all products for a specific tenant.
   * @param tenantId - Tenant identifier
   * @returns Promise<Product[]> Array of products
   */
  async findAllByTenant(tenantId: string): Promise<Product[]> {
    return this.productRepository.findByTenant(tenantId);
  }

  /**
   * Retrieves a product by ID and tenant.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<Product | null> Product or null if not found
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Product | null> {
    return this.productRepository.findByIdAndTenant(id, tenantId);
  }

  /**
   * Creates a new product with validation.
   * @param productData - Product creation data
   * @returns Promise<Product> Created product
   * @throws ValidationError if data is invalid
   */
  async create(productData: CreateProductData): Promise<Product> {
    // Validate required fields
    if (!productData.name?.trim()) {
      throw new ValidationError('Product name is required');
    }

    if (!productData.price || productData.price <= 0) {
      throw new ValidationError('Product price must be greater than 0');
    }

    // Check for duplicate names within tenant
    const existingProduct = await this.productRepository.findByNameAndTenant(
      productData.name,
      productData.tenantId
    );

    if (existingProduct) {
      throw new ValidationError('Product name already exists');
    }

    return this.productRepository.create(productData);
  }

  /**
   * Updates a product with validation.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @param updateData - Update data
   * @returns Promise<Product | null> Updated product or null if not found
   */
  async updateByIdAndTenant(
    id: string,
    tenantId: string,
    updateData: UpdateProductData
  ): Promise<Product | null> {
    // Validate price if provided
    if (updateData.price !== undefined && updateData.price <= 0) {
      throw new ValidationError('Product price must be greater than 0');
    }

    // Check for duplicate names if name is being updated
    if (updateData.name) {
      const existingProduct = await this.productRepository.findByNameAndTenant(
        updateData.name,
        tenantId
      );

      if (existingProduct && existingProduct.id !== id) {
        throw new ValidationError('Product name already exists');
      }
    }

    return this.productRepository.updateByIdAndTenant(id, tenantId, updateData);
  }

  /**
   * Deletes a product.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<boolean> True if deleted, false if not found
   */
  async deleteByIdAndTenant(id: string, tenantId: string): Promise<boolean> {
    return this.productRepository.deleteByIdAndTenant(id, tenantId);
  }
}
```

#### 3. Creating Repository Layer

```typescript
// apps/api/src/repositories/product.repository.ts
import { Pool } from 'pg';
import { Product, CreateProductData, UpdateProductData } from '../types/product.types';

/**
 * Product repository handling database operations.
 * Implements data access patterns with proper SQL and error handling.
 */
export class ProductRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Finds all products for a specific tenant.
   * @param tenantId - Tenant identifier
   * @returns Promise<Product[]> Array of products
   */
  async findByTenant(tenantId: string): Promise<Product[]> {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.tenant_id = $1
      ORDER BY p.created_at DESC
    `;

    const result = await this.db.query(query, [tenantId]);
    return result.rows.map(this.mapRowToProduct);
  }

  /**
   * Finds a product by ID and tenant.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<Product | null> Product or null if not found
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Product | null> {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.tenant_id = $2
    `;

    const result = await this.db.query(query, [id, tenantId]);
    return result.rows.length > 0 ? this.mapRowToProduct(result.rows[0]) : null;
  }

  /**
   * Creates a new product.
   * @param productData - Product creation data
   * @returns Promise<Product> Created product
   */
  async create(productData: CreateProductData): Promise<Product> {
    const query = `
      INSERT INTO products (
        name, description, price, category_id, tenant_id, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      productData.name,
      productData.description,
      productData.price,
      productData.categoryId,
      productData.tenantId,
      productData.createdBy,
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToProduct(result.rows[0]);
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
    updateData: UpdateProductData
  ): Promise<Product | null> {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic SET clause
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        setClauses.push(`${this.camelToSnake(key)} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (setClauses.length === 0) {
      return this.findByIdAndTenant(id, tenantId);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id, tenantId);

    const query = `
      UPDATE products
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows.length > 0 ? this.mapRowToProduct(result.rows[0]) : null;
  }

  /**
   * Deletes a product by ID and tenant.
   * @param id - Product identifier
   * @param tenantId - Tenant identifier
   * @returns Promise<boolean> True if deleted, false if not found
   */
  async deleteByIdAndTenant(id: string, tenantId: string): Promise<boolean> {
    const query = `
      DELETE FROM products
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await this.db.query(query, [id, tenantId]);
    return result.rowCount > 0;
  }

  /**
   * Finds a product by name and tenant (for duplicate checking).
   * @param name - Product name
   * @param tenantId - Tenant identifier
   * @returns Promise<Product | null> Product or null if not found
   */
  async findByNameAndTenant(name: string, tenantId: string): Promise<Product | null> {
    const query = `
      SELECT * FROM products
      WHERE LOWER(name) = LOWER($1) AND tenant_id = $2
    `;

    const result = await this.db.query(query, [name, tenantId]);
    return result.rows.length > 0 ? this.mapRowToProduct(result.rows[0]) : null;
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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Converts camelCase to snake_case.
   * @param str - camelCase string
   * @returns snake_case string
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
```

#### 4. Adding Routes

```typescript
// apps/api/src/routes/products.routes.ts
import { Router } from 'express';
import { ProductController } from '../controllers/products.controller';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createProductSchema, updateProductSchema } from '../validators/product.validators';
import { database } from '../utils/database';

const router = Router();

// Initialize dependencies
const productRepository = new ProductRepository(database);
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Product CRUD routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.post('/', validateRequest(createProductSchema), productController.createProduct);
router.put('/:id', validateRequest(updateProductSchema), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export { router as productRoutes };
```

## Database Extensions

### Adding New Tables

#### 1. Creating Migration Files

```sql
-- database/migrations/20240101000000_create_products_table.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id),
    tenant_id UUID NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT products_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT products_price_positive CHECK (price > 0),

    -- Unique constraint per tenant
    UNIQUE(name, tenant_id)
);

-- Indexes for performance
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_name_tenant ON products(name, tenant_id);

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_tenant_isolation ON products
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Triggers for updated_at
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
COMMENT ON TABLE products IS 'Product catalog with multi-tenant support';
COMMENT ON COLUMN products.tenant_id IS 'Tenant isolation key';
COMMENT ON COLUMN products.price IS 'Product price in decimal format';
```

#### 2. Seed Data

```sql
-- database/seeds/products.sql
INSERT INTO categories (id, name, tenant_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Electronics', '550e8400-e29b-41d4-a716-446655440000'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Books', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, description, price, category_id, tenant_id, created_by) VALUES
    ('550e8400-e29b-41d4-a716-446655440010', 'Laptop Pro', 'High-performance laptop for professionals', 1299.99, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),
    ('550e8400-e29b-41d4-a716-446655440011', 'Programming Book', 'Complete guide to full-stack development', 49.99, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;
```

### Adding Custom Validators

```typescript
// apps/api/src/validators/product.validators.ts
import Joi from 'joi';

/**
 * Validation schema for creating a new product.
 */
export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Product name is required',
    'string.max': 'Product name cannot exceed 255 characters',
  }),

  description: Joi.string().trim().max(1000).allow('').messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),

  price: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Price must be greater than 0',
    'number.base': 'Price must be a valid number',
  }),

  categoryId: Joi.string().uuid().required().messages({
    'string.guid': 'Category ID must be a valid UUID',
    'any.required': 'Category ID is required',
  }),
});

/**
 * Validation schema for updating a product.
 */
export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).messages({
    'string.empty': 'Product name cannot be empty',
    'string.max': 'Product name cannot exceed 255 characters',
  }),

  description: Joi.string().trim().max(1000).allow('').messages({
    'string.max': 'Description cannot exceed 1000 characters',
  }),

  price: Joi.number().positive().precision(2).messages({
    'number.positive': 'Price must be greater than 0',
    'number.base': 'Price must be a valid number',
  }),

  categoryId: Joi.string().uuid().messages({
    'string.guid': 'Category ID must be a valid UUID',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });
```

## Authentication Extensions

### Adding Custom Authentication Providers

```typescript
// apps/api/src/services/auth/oauth.service.ts
import { OAuth2Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';

/**
 * OAuth authentication service for third-party providers.
 * Supports Google, GitHub, and custom OAuth providers.
 */
export class OAuthService {
  constructor(private readonly authService: AuthService) {}

  /**
   * Creates Google OAuth strategy.
   */
  createGoogleStrategy() {
    return new OAuth2Strategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: '/auth/google/callback',
      },
      this.handleOAuthCallback.bind(this)
    );
  }

  /**
   * Creates GitHub OAuth strategy.
   */
  createGitHubStrategy() {
    return new OAuth2Strategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: '/auth/github/callback',
      },
      this.handleOAuthCallback.bind(this)
    );
  }

  /**
   * Handles OAuth callback and user creation/login.
   */
  private async handleOAuthCallback(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function
  ) {
    try {
      // Extract user info from profile
      const userInfo = {
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        provider: profile.provider,
        providerId: profile.id,
      };

      // Find or create user
      let user = await this.authService.findUserByEmail(userInfo.email);

      if (!user) {
        user = await this.authService.createOAuthUser(userInfo);
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}
```

## Testing Extensions

### Adding Component Tests

```typescript
// apps/web/src/app/features/products/components/product-card/product-card.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ProductCardComponent } from './product-card.component';
import { Product } from '../../types/product.types';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    categoryId: 'cat-1',
    categoryName: 'Electronics',
    tenantId: 'tenant-1',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = mockProduct;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display product name', () => {
    const nameElement = fixture.debugElement.query(By.css('[data-testid="product-name"]'));
    expect(nameElement.nativeElement.textContent).toContain('Test Product');
  });

  it('should display formatted price', () => {
    const priceElement = fixture.debugElement.query(By.css('[data-testid="product-price"]'));
    expect(priceElement.nativeElement.textContent).toContain('$99.99');
  });

  it('should emit click event when card is clicked', () => {
    spyOn(component.cardClick, 'emit');

    const cardElement = fixture.debugElement.query(By.css('[data-testid="product-card"]'));
    cardElement.nativeElement.click();

    expect(component.cardClick.emit).toHaveBeenCalledWith(mockProduct);
  });
});
```

### Adding API Tests

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

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        categoryId: 'cat-1',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.price).toBe(productData.price);
      expect(response.body.data.tenantId).toBe(tenantId);
    });

    it('should reject invalid product data', async () => {
      const invalidData = {
        name: '',
        price: -10,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const productData = {
        name: 'Test Product',
        price: 99.99,
      };

      await request(app).post('/api/products').send(productData).expect(401);
    });
  });

  describe('GET /api/products', () => {
    it('should return products for authenticated tenant', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should not return products from other tenants', async () => {
      // Create product for current tenant
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Tenant A Product', price: 50 });

      // Create another user with different tenant
      const otherUser = await createTestUser({ tenantId: 'other-tenant' });
      const otherToken = await getAuthToken(otherUser);

      // Other tenant should not see first tenant's products
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });
});
```

## Deployment Extensions

### Adding Environment-Specific Configurations

```yaml
# infrastructure/environments/staging.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-staging
data:
  NODE_ENV: 'staging'
  API_URL: 'https://api-staging.yourapp.com'
  DATABASE_URL: 'postgres://user:pass@staging-db:5432/appdb'
  REDIS_URL: 'redis://staging-redis:6379'
  JWT_SECRET: 'staging-jwt-secret'
  SENTRY_DSN: 'https://staging-sentry-dsn'
  LOG_LEVEL: 'debug'

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets-staging
type: Opaque
stringData:
  DATABASE_PASSWORD: 'staging-db-password'
  JWT_SECRET: 'staging-jwt-secret'
  SENDGRID_API_KEY: 'staging-sendgrid-key'
```

### Custom Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy-staging.sh

set -e

echo "Starting staging deployment..."

# Load environment variables
source .env.staging

# Build applications
echo "Building frontend..."
npm run build:web

echo "Building backend..."
npm run build:api

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Deploy to staging
echo "Deploying to Digital Ocean..."
doctl apps create --spec infrastructure/digitalocean/app-staging.yaml

echo "Deployment completed successfully!"
```

This extension guide provides comprehensive examples for customizing and extending the
NodeAngularFullStack boilerplate. Each section includes practical code examples that follow the
established patterns and best practices of the architecture.
