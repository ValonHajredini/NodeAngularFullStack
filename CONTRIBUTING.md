# Contributing to NodeAngularFullStack

Welcome to NodeAngularFullStack! We're excited to have you contribute to this full-stack TypeScript
boilerplate. This guide will help you get started with contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Message Guidelines](#commit-message-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Issue Guidelines](#issue-guidelines)
8. [Testing Requirements](#testing-requirements)
9. [Documentation Standards](#documentation-standards)
10. [Community Guidelines](#community-guidelines)

## Code of Conduct

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone,
regardless of age, body size, disability, ethnicity, gender identity and expression, level of
experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**

- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Enforcement

Project maintainers are responsible for clarifying standards of acceptable behavior and will take
appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- **Node.js**: v18.19.0 or later
- **npm**: v9.0.0 or later
- **Docker**: v20.10.0 or later
- **Docker Compose**: v2.0.0 or later
- **Git**: v2.30.0 or later

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/NodeAngularFullStack.git
   cd NodeAngularFullStack
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original/NodeAngularFullStack.git
   ```

### Local Development Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Start development environment**:

   ```bash
   docker-compose up -d
   npm run dev
   ```

4. **Run initial setup**:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Verify setup**:
   - Frontend: http://localhost:4200
   - API: http://localhost:3000/api/docs
   - Health check: http://localhost:3000/api/v1/health

## Development Workflow

### Branch Strategy

We use **Git Flow** with the following branch types:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/`**: New features (`feature/user-management`)
- **`bugfix/`**: Bug fixes (`bugfix/login-error`)
- **`hotfix/`**: Critical production fixes (`hotfix/security-patch`)
- **`release/`**: Release preparation (`release/v1.2.0`)

### Creating a New Feature

1. **Create feature branch**:

   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Test your changes**:

   ```bash
   npm run test
   npm run test:e2e
   npm run lint
   npm run typecheck
   ```

4. **Commit your changes**:

   ```bash
   git add .
   git commit -m "feat: add user profile management

   - Add user profile component
   - Implement profile update API
   - Add profile validation

   Closes #123"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Keeping Your Fork Updated

```bash
git checkout develop
git pull upstream develop
git push origin develop

# Update your feature branch
git checkout feature/your-feature-name
git rebase develop
```

## Coding Standards

### TypeScript Standards

1. **Strict Type Safety**:

   ```typescript
   // ✅ Good
   interface User {
     id: string;
     email: string;
     createdAt: Date;
   }

   function updateUser(id: string, data: Partial<User>): Promise<User> {
     // Implementation
   }

   // ❌ Bad
   function updateUser(id: any, data: any): any {
     // Implementation
   }
   ```

2. **Proper Error Handling**:

   ```typescript
   // ✅ Good
   async function fetchUser(id: string): Promise<User | null> {
     try {
       const user = await userRepository.findById(id);
       return user;
     } catch (error) {
       logger.error('Failed to fetch user', { id, error });
       throw new NotFoundError('User not found');
     }
   }

   // ❌ Bad
   async function fetchUser(id: string) {
     const user = await userRepository.findById(id);
     return user;
   }
   ```

### Frontend Standards (Angular)

1. **Standalone Components**:

   ```typescript
   // ✅ Good
   @Component({
     selector: 'app-user-profile',
     standalone: true,
     imports: [CommonModule, ReactiveFormsModule],
     template: `...`,
   })
   export class UserProfileComponent implements OnInit {
     // Implementation
   }

   // ❌ Bad - using NgModules
   @NgModule({
     declarations: [UserProfileComponent],
     imports: [CommonModule],
   })
   export class UserProfileModule {}
   ```

2. **Reactive Programming**:

   ```typescript
   // ✅ Good
   @Component({...})
   export class UserListComponent implements OnDestroy {
     private destroy$ = new Subject<void>();
     users$ = this.userService.getUsers();

     ngOnDestroy() {
       this.destroy$.next();
       this.destroy$.complete();
     }
   }

   // ❌ Bad - manual subscription management
   @Component({...})
   export class UserListComponent implements OnInit, OnDestroy {
     users: User[] = [];
     private subscription: Subscription;

     ngOnInit() {
       this.subscription = this.userService.getUsers().subscribe(users => {
         this.users = users;
       });
     }
   }
   ```

### Backend Standards (Express.js)

1. **Clean Architecture**:

   ```typescript
   // ✅ Good - Layer separation
   // Controller
   export class UserController {
     constructor(private userService: UserService) {}

     getUsers = AsyncHandler(async (req: Request, res: Response) => {
       const users = await this.userService.findAllByTenant(req.tenant.id);
       res.json({ success: true, data: users });
     });
   }

   // Service
   export class UserService {
     constructor(private userRepository: UserRepository) {}

     async findAllByTenant(tenantId: string): Promise<User[]> {
       return this.userRepository.findByTenant(tenantId);
     }
   }

   // ❌ Bad - Mixed concerns
   export const getUsers = async (req: Request, res: Response) => {
     const users = await db.query('SELECT * FROM users WHERE tenant_id = $1', [req.tenant.id]);
     res.json(users.rows);
   };
   ```

### Database Standards

1. **Migration Structure**:

   ```sql
   -- ✅ Good
   -- Migration: 20240115120000_add_user_preferences.sql
   BEGIN;

   CREATE TABLE user_preferences (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       preferences JSONB NOT NULL DEFAULT '{}',
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

       UNIQUE(user_id)
   );

   CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

   COMMENT ON TABLE user_preferences IS 'User-specific application preferences';

   COMMIT;
   ```

2. **Query Patterns**:

   ```typescript
   // ✅ Good - Parameterized queries
   async findByEmail(email: string, tenantId: string): Promise<User | null> {
     const query = `
       SELECT u.*, t.name as tenant_name
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND u.tenant_id = $2
     `;

     const result = await this.db.query(query, [email, tenantId]);
     return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
   }

   // ❌ Bad - String interpolation
   async findByEmail(email: string): Promise<User | null> {
     const query = `SELECT * FROM users WHERE email = '${email}'`;
     const result = await this.db.query(query);
     return result.rows[0];
   }
   ```

### Documentation Standards

1. **JSDoc Requirements**:
   ````typescript
   /**
    * Authenticates a user with email and password.
    * Implements rate limiting and security best practices.
    *
    * @param credentials - User login credentials
    * @param ip - Client IP address for rate limiting
    * @returns Promise containing user data and JWT tokens
    * @throws {ValidationError} When credentials are invalid
    * @throws {RateLimitError} When rate limit is exceeded
    *
    * @example
    * ```typescript
    * const result = await authService.login(
    *   { email: 'user@example.com', password: 'password123' },
    *   '192.168.1.1'
    * );
    * console.log('Access token:', result.accessToken);
    * ```
    */
   async login(credentials: LoginCredentials, ip: string): Promise<AuthResponse> {
     // Implementation
   }
   ````

## Commit Message Guidelines

We follow **Conventional Commits** specification:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes
- **perf**: Performance improvements
- **ci**: CI/CD changes
- **revert**: Reverting previous commits

### Examples

**Feature addition:**

```
feat(auth): add multi-factor authentication

- Implement TOTP-based 2FA
- Add SMS backup option
- Update login flow to handle MFA
- Add user preferences for MFA settings

Closes #456
```

**Bug fix:**

```
fix(api): resolve memory leak in database connection pool

The connection pool was not properly releasing connections
when queries failed, causing gradual memory exhaustion.

- Add proper error handling in repository layer
- Ensure connections are released in finally blocks
- Add connection pool monitoring

Fixes #789
```

**Breaking change:**

```
feat!: upgrade to Angular 17 and standalone components

BREAKING CHANGE: All components are now standalone.
NgModules have been removed. Update imports accordingly.

- Migrate all components to standalone
- Remove feature modules
- Update routing configuration
- Update testing setup

Closes #234
```

### Commit Message Rules

1. **Use imperative mood** ("add" not "added" or "adds")
2. **First line should be 50 characters or less**
3. **Reference issues and PRs** when applicable
4. **Include breaking change notes** when applicable
5. **Explain the "why" not the "what"** in the body

## Pull Request Process

### Before Creating a PR

1. **Ensure your branch is up to date**:

   ```bash
   git checkout develop
   git pull upstream develop
   git checkout your-feature-branch
   git rebase develop
   ```

2. **Run all tests and checks**:

   ```bash
   npm run test
   npm run test:e2e
   npm run lint
   npm run typecheck
   npm run build
   ```

3. **Update documentation** if needed

### PR Title and Description

**Title format:**

```
feat(scope): brief description of changes
```

**Description template:**

```markdown
## Description

Brief description of what this PR does and why.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as
      expected)
- [ ] Documentation update

## Changes Made

- List specific changes made
- Include any architectural decisions
- Mention any new dependencies

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

Include screenshots of UI changes

## Breaking Changes

List any breaking changes and migration steps

## Related Issues

Closes #123 Relates to #456
```

### PR Review Process

1. **Automated checks** must pass:
   - Build succeeds
   - All tests pass
   - Linting passes
   - Type checking passes
   - Security scan passes

2. **Code review requirements**:
   - At least 1 approval from maintainers
   - All conversations resolved
   - No merge conflicts

3. **Review checklist**:
   - [ ] Code follows project standards
   - [ ] Tests are comprehensive
   - [ ] Documentation is updated
   - [ ] No sensitive data exposed
   - [ ] Performance impact considered
   - [ ] Security implications reviewed

### After PR Approval

1. **Squash and merge** (preferred) or **merge commit**
2. **Delete feature branch** after merge
3. **Update local repository**:
   ```bash
   git checkout develop
   git pull upstream develop
   git branch -d feature/your-feature-name
   ```

## Issue Guidelines

### Issue Types

We use the following issue types:

- **🐛 Bug Report**: Something isn't working
- **✨ Feature Request**: New functionality
- **📚 Documentation**: Documentation improvements
- **🔧 Enhancement**: Improvements to existing features
- **❓ Question**: Questions about usage
- **🚀 Performance**: Performance improvements

### Bug Report Template

```markdown
## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

What actually happened.

## Screenshots

If applicable, add screenshots to help explain your problem.

## Environment

- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 118]
- Node.js version: [e.g. 18.19.0]
- Project version: [e.g. 1.2.3]

## Additional Context

Add any other context about the problem here.

## Possible Solution

If you have ideas on how to fix this, please describe them.
```

### Feature Request Template

```markdown
## Feature Description

A clear and concise description of the feature you'd like to see added.

## Problem Statement

What problem would this feature solve? What use case does it address?

## Proposed Solution

Describe your preferred solution in detail.

## Alternative Solutions

Describe any alternative solutions you've considered.

## Implementation Details

If you have technical implementation ideas, please share them.

## Additional Context

Add any other context, screenshots, or examples about the feature request.
```

## Testing Requirements

### Test Coverage Standards

- **Minimum 80% code coverage** for new code
- **100% coverage for critical paths** (authentication, data access)
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows

### Testing Types

1. **Unit Tests**:

   ```typescript
   // Example: Service unit test
   describe('UserService', () => {
     let service: UserService;
     let mockRepository: jest.Mocked<UserRepository>;

     beforeEach(() => {
       mockRepository = {
         findById: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
       } as any;

       service = new UserService(mockRepository);
     });

     it('should find user by id', async () => {
       const mockUser = { id: '1', email: 'test@example.com' };
       mockRepository.findById.mockResolvedValue(mockUser);

       const result = await service.findById('1');

       expect(result).toEqual(mockUser);
       expect(mockRepository.findById).toHaveBeenCalledWith('1');
     });
   });
   ```

2. **Integration Tests**:

   ```typescript
   // Example: API integration test
   describe('POST /api/v1/users', () => {
     let app: Application;
     let authToken: string;

     beforeAll(async () => {
       app = await createTestApp();
       authToken = await getTestAuthToken();
     });

     it('should create a new user', async () => {
       const userData = {
         email: 'newuser@example.com',
         firstName: 'John',
         lastName: 'Doe',
       };

       const response = await request(app)
         .post('/api/v1/users')
         .set('Authorization', `Bearer ${authToken}`)
         .send(userData)
         .expect(201);

       expect(response.body.success).toBe(true);
       expect(response.body.data.email).toBe(userData.email);
     });
   });
   ```

3. **E2E Tests**:

   ```typescript
   // Example: Playwright E2E test
   test('user can register and login', async ({ page }) => {
     // Navigate to registration page
     await page.goto('/register');

     // Fill registration form
     await page.fill('[data-testid="email"]', 'test@example.com');
     await page.fill('[data-testid="password"]', 'SecurePass123!');
     await page.fill('[data-testid="firstName"]', 'John');
     await page.fill('[data-testid="lastName"]', 'Doe');

     // Submit form
     await page.click('[data-testid="register-button"]');

     // Verify successful registration
     await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

     // Test login
     await page.goto('/login');
     await page.fill('[data-testid="email"]', 'test@example.com');
     await page.fill('[data-testid="password"]', 'SecurePass123!');
     await page.click('[data-testid="login-button"]');

     // Verify successful login
     await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
   });
   ```

### Test Data Management

1. **Use test fixtures**:

   ```typescript
   // tests/fixtures/users.ts
   export const createTestUser = (overrides: Partial<User> = {}): User => ({
     id: uuid(),
     email: 'test@example.com',
     firstName: 'John',
     lastName: 'Doe',
     role: 'user',
     tenantId: 'test-tenant',
     createdAt: new Date(),
     updatedAt: new Date(),
     ...overrides,
   });
   ```

2. **Clean up after tests**:
   ```typescript
   afterEach(async () => {
     await cleanupTestData();
   });
   ```

## Documentation Standards

### README Updates

When adding new features, update the main README.md:

1. **Installation instructions** if dependencies change
2. **Configuration options** if new environment variables are added
3. **Usage examples** for new features
4. **API documentation links** for new endpoints

### Code Documentation

1. **JSDoc for all public APIs**
2. **Inline comments for complex logic**
3. **Architecture decision records** for significant changes
4. **API documentation** using OpenAPI/Swagger

### Documentation Structure

```
docs/
├── api/                    # API documentation
│   ├── README.md          # API overview
│   ├── authentication.md  # Auth endpoints
│   └── endpoints/         # Individual endpoint docs
├── architecture/          # Architecture documentation
│   ├── design-decisions.md
│   └── component-interactions.md
├── guides/               # User and developer guides
│   ├── getting-started.md
│   ├── deployment.md
│   └── troubleshooting.md
└── adr/                  # Architecture Decision Records
    ├── 001-database-choice.md
    └── 002-frontend-framework.md
```

## Community Guidelines

### Getting Help

1. **Check existing documentation** first
2. **Search existing issues** to avoid duplicates
3. **Use the appropriate channels**:
   - GitHub Issues for bugs and feature requests
   - GitHub Discussions for questions and general discussion
   - Stack Overflow for implementation questions (tag: `nodeangularfullstack`)

### Helping Others

1. **Be patient and respectful** with newcomers
2. **Provide clear, actionable guidance**
3. **Link to relevant documentation**
4. **Share your knowledge** through blog posts, tutorials, or examples

### Recognition

Contributors will be recognized in:

1. **CONTRIBUTORS.md** file
2. **Release notes** for significant contributions
3. **GitHub contributor graph**
4. **Special badges** for sustained contributions

### Contributor Levels

1. **Contributor**: Anyone who submits a PR or issue
2. **Regular Contributor**: Multiple merged PRs
3. **Maintainer**: Trusted contributors with merge rights
4. **Core Team**: Project leadership and architecture decisions

## Release Process

### Versioning

We follow **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Schedule

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly for new features
- **Major releases**: Quarterly or as needed for breaking changes

### Contributing to Releases

1. **Feature freeze** 1 week before minor/major releases
2. **Release candidates** for major releases
3. **Community testing** encouraged for RCs
4. **Release notes** drafted collaboratively

## Security

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities. Instead:

1. **Email security@nodeangularfullstack.com** with details
2. **Include proof of concept** if possible
3. **Allow reasonable time** for response and fix
4. **Coordinate disclosure** with maintainers

### Security Best Practices

1. **Never commit secrets** or sensitive data
2. **Use environment variables** for configuration
3. **Validate all inputs** thoroughly
4. **Follow OWASP guidelines**
5. **Keep dependencies updated**

## License

By contributing to NodeAngularFullStack, you agree that your contributions will be licensed under
the same license as the project (MIT License).

## Questions?

If you have questions about contributing, please:

1. **Check this document** first
2. **Search existing discussions**
3. **Open a new discussion** in GitHub Discussions
4. **Reach out to maintainers** if needed

Thank you for contributing to NodeAngularFullStack! 🚀
