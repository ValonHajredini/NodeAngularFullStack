import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; background: #f5f5f5; border: 2px solid #ccc; margin: 20px;">
      <h2>🔍 Authentication Debug Panel</h2>

      <div style="margin: 10px 0;">
        <strong>Is Authenticated:</strong> {{ authService.isAuthenticated() ? '✅ YES' : '❌ NO' }}
      </div>

      <div style="margin: 10px 0;">
        <strong>User Data:</strong>
        <pre style="background: #fff; padding: 10px;">{{ userJson }}</pre>
      </div>

      <div style="margin: 10px 0;">
        <strong>Loading:</strong> {{ authService.loading() ? 'YES' : 'NO' }}
      </div>

      <div style="margin: 10px 0;">
        <strong>Error:</strong> {{ authService.error() || 'None' }}
      </div>

      <div style="margin: 10px 0;">
        <strong>LocalStorage Data:</strong>
        <pre style="background: #fff; padding: 10px;">{{ storageData }}</pre>
      </div>

      <div style="margin: 20px 0;">
        <button (click)="testAuth()" style="padding: 10px; margin: 5px;">Test Authentication</button>
        <button (click)="clearStorage()" style="padding: 10px; margin: 5px;">Clear Storage</button>
        <button (click)="navigateToDashboard()" style="padding: 10px; margin: 5px;">Go to Dashboard</button>
        <button (click)="refresh()" style="padding: 10px; margin: 5px;">Refresh Debug</button>
      </div>
    </div>
  `
})
export class AuthDebugComponent {
  authService = inject(AuthService);
  router = inject(Router);

  get userJson(): string {
    const user = this.authService.user();
    return user ? JSON.stringify(user, null, 2) : 'No user data';
  }

  get storageData(): string {
    const data = {
      user: localStorage.getItem('user'),
      access_token: localStorage.getItem('access_token'),
      refresh_token: localStorage.getItem('refresh_token')
    };
    return JSON.stringify(data, null, 2);
  }

  testAuth(): void {
    console.log('🔍 Authentication Test Results:');
    console.log('isAuthenticated():', this.authService.isAuthenticated());
    console.log('user():', this.authService.user());
    console.log('loading():', this.authService.loading());
    console.log('error():', this.authService.error());
    console.log('localStorage user:', localStorage.getItem('user'));
    console.log('localStorage access_token:', localStorage.getItem('access_token'));
    console.log('localStorage refresh_token:', localStorage.getItem('refresh_token'));
  }

  clearStorage(): void {
    localStorage.clear();
    console.log('🧹 LocalStorage cleared');
    this.refresh();
  }

  navigateToDashboard(): void {
    this.router.navigate(['/app/dashboard']);
  }

  refresh(): void {
    window.location.reload();
  }
}