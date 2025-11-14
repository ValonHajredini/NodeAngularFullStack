import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ActivatedRoute } from '@angular/router';

class MockAuthService {
  isAuthenticated(): boolean {
    return false;
  }

  login() {
    return of(void 0);
  }
}

class MockThemeService {}

describe('LoginComponent demo users', () => {
  let component: LoginComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useClass: MockAuthService },
        { provide: ThemeService, useClass: MockThemeService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  const demoUsers: Array<{ role: 'admin' | 'user' | 'readonly'; email: string }> = [
    { role: 'admin', email: 'admin@example.com' },
    { role: 'user', email: 'user@example.com' },
    { role: 'readonly', email: 'readonly@example.com' },
  ];

  demoUsers.forEach(({ role, email }) => {
    it(`should autofill credentials for ${role} demo user`, () => {
      component.fillTestCredentials(role);
      const formValue = component['loginForm'].value;
      expect(formValue.email).toBe(email);
      expect(formValue.password).toBe('User123!@#');
    });
  });
});
