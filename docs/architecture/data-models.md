# Data Models

## User

**Purpose:** Core user entity for authentication and authorization

**Key Attributes:**
- id: UUID - Unique identifier
- email: string - Unique email address for login
- password_hash: string - Bcrypt hashed password
- first_name: string - User's first name
- last_name: string - User's last name
- role: enum - User role (admin, user, readonly)
- tenant_id: UUID? - Optional tenant association for multi-tenancy
- created_at: timestamp - Account creation time
- updated_at: timestamp - Last modification time
- last_login: timestamp? - Last successful login
- is_active: boolean - Account active status
- email_verified: boolean - Email verification status

### TypeScript Interface
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  emailVerified: boolean;
}
```

### Relationships
- Has many: Sessions (one-to-many)
- Belongs to: Tenant (many-to-one, optional)
- Has many: PasswordResets (one-to-many)

## Tenant

**Purpose:** Multi-tenancy support for isolated customer environments

**Key Attributes:**
- id: UUID - Unique tenant identifier
- name: string - Tenant organization name
- slug: string - URL-safe tenant identifier
- settings: JSONB - Tenant-specific configuration
- plan: enum - Subscription plan level
- max_users: integer - User limit based on plan
- created_at: timestamp - Tenant creation time
- is_active: boolean - Tenant active status

### TypeScript Interface
```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: {
    branding?: {
      primaryColor?: string;
      logo?: string;
    };
    features: {
      [key: string]: boolean;
    };
  };
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  createdAt: Date;
  isActive: boolean;
}
```

### Relationships
- Has many: Users (one-to-many)
- Has many: TenantInvites (one-to-many)

## Session

**Purpose:** JWT refresh token tracking and session management

**Key Attributes:**
- id: UUID - Session identifier
- user_id: UUID - Associated user
- refresh_token: string - Hashed refresh token
- expires_at: timestamp - Token expiration
- ip_address: string - Client IP for security
- user_agent: string - Client browser info
- created_at: timestamp - Session start time

### TypeScript Interface
```typescript
interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}
```

### Relationships
- Belongs to: User (many-to-one)
