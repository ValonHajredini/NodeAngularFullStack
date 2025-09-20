import { Component } from '@angular/core';
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
  `
})
export class TestDebugComponent {
  currentUrl: string;

  constructor(private router: Router) {
    this.currentUrl = this.router.url;
    console.log('TestDebugComponent loaded, current URL:', this.currentUrl);
  }

  goToWelcome() {
    this.router.navigate(['/welcome']);
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}