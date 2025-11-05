# Test Tool Integration Guide

This guide walks you through integrating the generated **Test Tool** tool into your NodeAngularFullStack application.

## 📋 Overview

**Tool ID:** `test-tool`
**Version:** 1.0.0
**Route:** `/tools/test-tool`
**Permissions:** user

## 🚀 Quick Start (5 Steps)

### 1. Build Shared Types

First, build the shared types package to make `TestToolRecord` available:

```bash
npm run build:shared
```

This compiles the TypeScript types in `packages/shared/src/types/test-tool.types.ts` for use in both frontend and backend.

---

### 2. Register Route in App Routes

Add the Test Tool routes to your application's main routing configuration:

**File:** `apps/web/src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { test-toolRoutes } from './features/tools/test-tool/test-tool.routes';

export const routes: Routes = [
  // ... existing routes

  // Test Tool Routes (lazy-loaded)
  ...test-toolRoutes,

  // ... other routes
];
```

✅ **Result:** Test Tool is now accessible at `http://localhost:4200/tools/test-tool`

---

### 3. Add Navigation Menu Item

Add Test Tool to your sidebar/navigation menu:

**File:** `apps/web/src/app/core/layout/sidebar/sidebar.component.ts` (or your menu component)

```typescript
import { MenuItem } from 'primeng/api';
import { test-toolMenuItem } from '@app/features/tools/test-tool/menu-item';

export class SidebarComponent {
  menuItems: MenuItem[] = [
    // ... existing menu items
    {
      label: 'Tools',
      icon: 'pi pi-briefcase',
      items: [
        // ... other tool items
        test-toolMenuItem, // Add Test Tool
      ],
    },
  ];
}
```

✅ **Result:** Test Tool appears in your navigation menu with icon `pi-box`

---

### 4. Create Database Table & Migration

Create the database table for Test Tool data:

```bash
# Create migration file
npm --workspace=apps/api run db:migration:create test_tool_table
```

**Edit the migration file** (in `apps/api/database/migrations/`) and add:

```sql
-- Up Migration
CREATE TABLE test_tool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX idx_test_tool_created_by ON test_tool(created_by);
CREATE INDEX idx_test_tool_created_at ON test_tool(created_at DESC);

-- Down Migration (for rollback)
DROP TABLE IF EXISTS test_tool CASCADE;
```

**Run the migration:**

```bash
npm --workspace=apps/api run db:migrate
```

✅ **Result:** Database table created and ready for Test Tool data

---

### 5. Register Tool with Platform

Register Test Tool in the tool registry (if using tool management system):

```bash
# Make sure API server is running
npm --workspace=apps/api run dev

# In another terminal:
curl -X POST http://localhost:3000/api/tools/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "toolId": "test-tool",
    "name": "Test Tool",
    "version": "1.0.0",
    "route": "/tools/test-tool",
    "apiBase": "/api/tools/test-tool",
    "permissions": [&#34;user&#34;],
    "manifestJson": {
      "id": "test-tool",
      "name": "Test Tool",
      "description": "A test tool for integration testing",
      "icon": "pi-box"
    }
  }'
```

✅ **Result:** Test Tool is registered in the platform's tool management system

---

## ✅ Verify Integration

Start the development servers and verify everything works:

```bash
# Start both frontend and backend
npm start

# Or start individually:
npm --workspace=apps/api run dev  # Backend on port 3000
npm --workspace=apps/web run dev  # Frontend on port 4200
```

**Test the integration:**

1. ✅ Navigate to http://localhost:4200/tools/test-tool
2. ✅ Verify component loads without errors
3. ✅ Check loading spinner displays briefly
4. ✅ Verify empty state message appears (no data yet)
5. ✅ Test error handling (stop backend and click retry)
6. ✅ Verify responsive layout (resize browser to mobile width)
7. ✅ Check navigation menu item appears and links correctly

---

## 📁 Generated Files

The CLI created these files for you:

### Frontend (Angular)

- `apps/web/src/app/features/tools/test-tool/test-tool.component.ts` - Component logic
- `apps/web/src/app/features/tools/test-tool/test-tool.component.html` - Template
- `apps/web/src/app/features/tools/test-tool/test-tool.component.css` - Styles
- `apps/web/src/app/features/tools/test-tool/test-tool.routes.ts` - Route config
- `apps/web/src/app/features/tools/test-tool/menu-item.ts` - Menu item helper
- `apps/web/src/app/features/tools/test-tool/services/test-tool.service.ts` - Data service
- `apps/web/src/app/features/tools/test-tool/INTEGRATION.md` - This file

### Backend (Express.js)

- `apps/api/src/controllers/test-tool.controller.ts` - HTTP request handlers
- `apps/api/src/services/test-tool.service.ts` - Business logic
- `apps/api/src/repositories/test-tool.repository.ts` - Database access
- `apps/api/src/routes/test-tool.routes.ts` - API route definitions
- `apps/api/src/validators/test-tool.validator.ts` - Input validation

### Shared

- `packages/shared/src/types/test-tool.types.ts` - TypeScript types

---

## 🧪 Testing

Run tests to ensure everything works:

```bash
# Backend tests
npm --workspace=apps/api run test

# Frontend tests
npm --workspace=apps/web run test

# E2E tests
npm run test:e2e
```

---

## 🛠️ Troubleshooting

### TypeScript Errors

**Issue:** `Cannot find module '@nodeangularfullstack/shared'`

**Solution:**

```bash
npm run build:shared
npm run typecheck
```

---

### Component Not Loading

**Issue:** Component shows blank page or 404 error

**Solution:**

1. Verify routes are imported in `app.routes.ts`
2. Check browser console for errors
3. Ensure guards (AuthGuard, ToolGuard) are configured
4. Verify user has required permissions: user

---

### API Errors

**Issue:** `Failed to load data` error message

**Solution:**

1. Ensure backend server is running: `npm --workspace=apps/api run dev`
2. Check database connection: `npm --workspace=apps/api run db:migrate`
3. Verify API endpoints are registered (check `apps/api/src/server.ts`)
4. Check browser Network tab for HTTP errors
5. Verify backend logs for error messages

---

### PrimeNG Styles Not Loading

**Issue:** Components look unstyled or broken

**Solution:**

Ensure PrimeNG theme is imported in `apps/web/src/styles.css`:

```css
@import 'primeng/resources/themes/lara-light-blue/theme.css';
@import 'primeng/resources/primeng.css';
@import 'primeicons/primeicons.css';
```

---

### Build Errors

**Issue:** Build fails with compilation errors

**Solution:**

```bash
# Clean build cache
npm --workspace=apps/web run ng -- cache clean

# Rebuild shared package
npm run build:shared

# Retry build
npm run build
```

---

## 📚 Next Steps

Now that Test Tool is integrated, consider these enhancements:

1. **Add CRUD Operations:** Implement create, edit, and delete functionality
2. **Add Filters/Search:** Enhance data table with filtering and search
3. **Add Pagination:** Implement pagination for large datasets
4. **Add Forms:** Create forms for data input using PrimeNG components
5. **Add Validation:** Enhance input validation on frontend and backend
6. **Add Tests:** Write comprehensive unit and E2E tests
7. **Add Documentation:** Document API endpoints and component usage

---

## 💡 Tips

- **Signals over RxJS:** Use Angular signals for component state management (already implemented)
- **Lazy Loading:** Routes are lazy-loaded for optimal bundle size
- **Responsive Design:** Template uses Tailwind/PrimeNG responsive classes
- **Error Handling:** Component includes comprehensive error handling with retry
- **Type Safety:** Shared types ensure consistency between frontend and backend

---

## 📖 Additional Resources

- [Angular Standalone Components](https://angular.io/guide/standalone-components)
- [PrimeNG Documentation](https://primeng.org/)
- [Project Architecture](../../../docs/architecture/source-tree.md)
- [Coding Standards](../../../docs/architecture/coding-standards.md)

---

**Generated by:** @nodeangularfullstack/create-tool v1.0.0
**Tool ID:** test-tool
**Date:** 2025-10-25
