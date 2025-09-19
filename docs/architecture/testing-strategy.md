# Testing Strategy

## Testing Pyramid
```text
        E2E Tests
       /        \
   Integration Tests
   /            \
Frontend Unit  Backend Unit
```

## Test Organization

### Frontend Tests
```text
apps/web/src/
├── app/
│   ├── core/
│   │   └── auth/
│   │       ├── auth.service.spec.ts
│   │       └── auth.guard.spec.ts
│   └── features/
│       └── users/
│           └── users.component.spec.ts
└── test-setup.ts
```

### Backend Tests
```text
apps/api/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   └── users.test.ts
│   └── fixtures/
└── jest.config.js
```

### E2E Tests
```text
e2e/
├── specs/
│   ├── auth.spec.ts
│   └── user-journey.spec.ts
├── fixtures/
└── playwright.config.ts
```

## Test Examples

### Frontend Component Test
```typescript
// users.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersComponent } from './users.component';
import { UsersService } from './users.service';
import { of } from 'rxjs';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let usersService: jasmine.SpyObj<UsersService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('UsersService', ['getUsers']);

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UsersService, useValue: spy }
      ]
    });

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService) as jasmine.SpyObj<UsersService>;
  });

  it('should load users on init', () => {
    const mockUsers = [{ id: '1', email: 'test@example.com' }];
    usersService.getUsers.and.returnValue(of({ data: mockUsers }));

    fixture.detectChanges();

    expect(usersService.getUsers).toHaveBeenCalled();
    expect(component.users()).toEqual(mockUsers);
  });
});
```

### Backend API Test
```typescript
// auth.test.ts
import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/db';

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM users');
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject duplicate emails', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test456!@#'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('already exists');
    });
  });
});
```

### E2E Test
```typescript
// auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete full auth cycle', async ({ page }) => {
    // Registration
    await page.goto('/auth/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome, John');

    // Logout
    await page.click('button[aria-label="Logout"]');
    await expect(page).toHaveURL('/auth/login');

    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });
});
```
