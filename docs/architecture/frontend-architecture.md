# Frontend Architecture

## Component Architecture

### Component Organization
```text
src/
├── app/
│   ├── core/                    # Singleton services, guards, interceptors
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   └── auth.interceptor.ts
│   │   ├── api/
│   │   │   └── api.service.ts
│   │   └── services/
│   ├── features/                # Feature modules
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── password-reset/
│   │   ├── dashboard/
│   │   └── profile/
│   ├── shared/                  # Shared components, pipes, directives
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   └── layouts/                 # Layout components
│       ├── main-layout/
│       └── auth-layout/
```

### Component Template
```typescript
import { Component, ChangeDetectionStrategy, Signal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="component-container">
      <!-- Component template -->
    </div>
  `,
  styles: [`
    .component-container {
      @apply p-4;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
  private readonly dataSignal = signal<Data | null>(null);
  protected readonly computedValue = computed(() =>
    this.dataSignal()?.property ?? 'default'
  );

  constructor() {
    // Component initialization
  }
}
```

## State Management Architecture

### State Structure
```typescript
// store/app.state.ts
export interface AppState {
  auth: AuthState;
  users: UserState;
  ui: UIState;
  tenant: TenantState;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface UserState {
  users: User[];
  selectedUser: User | null;
  pagination: Pagination;
  loading: boolean;
  error: string | null;
}
```

### State Management Patterns
- Use NgRx Signals for reactive state management
- Implement facade services for complex state interactions
- Use computed signals for derived state
- Implement optimistic updates for better UX
- Cache API responses with configurable TTL

## Routing Architecture

### Route Organization
```text
app.routes.ts
├── '' (MainLayout)
│   ├── dashboard
│   ├── profile
│   └── users (admin only)
├── 'auth' (AuthLayout)
│   ├── login
│   ├── register
│   └── password-reset
└── '**' (404 page)
```

### Protected Route Pattern
```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        loadChildren: () => import('./features/admin/admin.routes')
          .then(m => m.ADMIN_ROUTES)
      }
    ]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component')
          .then(m => m.LoginComponent)
      }
    ]
  }
];
```

## Frontend Services Layer

### API Client Setup
```typescript
// core/api/api.client.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options);
  }

  post<T>(endpoint: string, body: any, options?: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, options);
  }

  patch<T>(endpoint: string, body: any, options?: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, options);
  }

  delete<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, options);
  }
}
```

### Service Example
```typescript
// features/users/users.service.ts
import { Injectable, inject } from '@angular/core';
import { ApiClient } from '@core/api/api.client';
import { Observable } from 'rxjs';
import { User, PaginatedResponse } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiClient);

  getUsers(page = 1, limit = 20): Observable<PaginatedResponse<User>> {
    return this.api.get<PaginatedResponse<User>>(
      `/users?page=${page}&limit=${limit}`
    );
  }

  getProfile(): Observable<User> {
    return this.api.get<User>('/users/profile');
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    return this.api.patch<User>('/users/profile', updates);
  }
}
```
