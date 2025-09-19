# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** Always define types in packages/shared and import from there
- **API Calls:** Never make direct HTTP calls - use the service layer
- **Environment Variables:** Access only through config objects, never process.env directly
- **Error Handling:** All API routes must use the standard error handler
- **State Updates:** Never mutate state directly - use proper state management patterns
- **Tenant Isolation:** Always include tenant context in queries when multi-tenancy is enabled
- **Token Handling:** Never store JWT in localStorage - use httpOnly cookies or memory
- **Database Queries:** Use parameterized queries to prevent SQL injection
- **Input Validation:** Validate all user input on both frontend and backend
- **Documentation:** All public functions, interfaces, and classes MUST have JSDoc comments

## Documentation Standards

**JSDoc Requirements:**
All public APIs must be documented with JSDoc comments. This is CRITICAL for maintainability and AI agent understanding.

```typescript
// Frontend Example - Angular Service
/**
 * Manages user authentication and JWT token lifecycle.
 * Handles login, logout, and token refresh operations.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Authenticates a user with email and password.
   * @param credentials - User login credentials
   * @returns Observable containing user data and tokens
   * @throws {HttpErrorResponse} When authentication fails
   * @example
   * authService.login({ email: 'user@example.com', password: 'pass123' })
   *   .subscribe(result => console.log('Logged in:', result.user));
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Implementation
  }
}

// Backend Example - Express Controller
/**
 * Handles user profile operations.
 * Requires JWT authentication for all endpoints.
 */
export class UsersController {
  /**
   * Updates the authenticated user's profile information.
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @param next - Express next function
   * @returns Updated user profile
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - User not authenticated
   * @throws {ApiError} 404 - User not found
   */
  updateProfile = AsyncHandler(async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    // Implementation
  });
}

// Shared Types Example
/**
 * Represents a user in the system.
 * Used across frontend and backend for type consistency.
 */
export interface User {
  /** Unique identifier (UUID v4) */
  id: string;
  /** User's email address (unique per tenant) */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User role determining permissions */
  role: 'admin' | 'user' | 'readonly';
  /** Optional tenant ID for multi-tenant mode */
  tenantId?: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}
```

**Documentation Rules:**
- **Functions:** Document purpose, parameters, return value, exceptions, and provide examples for complex operations
- **Classes/Services:** Document the overall responsibility and key behaviors
- **Interfaces/Types:** Document the purpose and important fields, especially for shared types
- **Complex Logic:** Add inline comments explaining the "why" not the "what"
- **API Endpoints:** Include HTTP method, path, required permissions, request/response formats
- **Component Props:** Document each prop's purpose and valid values
- **Hooks:** Document dependencies, return values, and side effects

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts` |
| API Routes | - | kebab-case | `/api/user-profile` |
| Database Tables | - | snake_case | `user_profiles` |
