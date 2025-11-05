/* eslint-disable no-console */
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test-debug',
  standalone: true,
  template: `
    <div style="padding: 20px; background: #f0f0f0; border: 2px solid red;">
      <h1>DEBUG: Test Component Loaded!</h1>
      <p>Current URL: {{ currentUrl }}</p>
      <button (click)="goToWelcome()" style="padding: 10px; margin: 5px;">Go to Welcome</button>
      <button (click)="goToLogin()" style="padding: 10px; margin: 5px;">Go to Login</button>
    </div>
  `,
})
export class TestDebugComponent {
  private readonly router = inject(Router);
  currentUrl: string;

  constructor() {
    this.currentUrl = this.router.url;
    console.log('TestDebugComponent loaded, current URL:', this.currentUrl);
  }

  goToWelcome(): void {
    void this.router.navigate(['/welcome']);
  }

  goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }
}
