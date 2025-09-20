import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <!-- Navigation Header -->
      <nav class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <h1 class="text-2xl font-bold text-gray-900">NodeAngularStack</h1>
              </div>
            </div>
            <div class="flex items-center space-x-4">
              <button
                (click)="navigateToLogin()"
                class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                (click)="navigateToRegister()"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div class="text-center">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Welcome to
            <span class="text-blue-600">NodeAngularStack</span>
          </h1>
          <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A modern full-stack application built with Node.js, Angular, and PostgreSQL.
            Experience seamless authentication, robust API management, and beautiful user interfaces.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              (click)="navigateToRegister()"
              class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors shadow-lg"
            >
              Create Account
            </button>
            <button
              (click)="navigateToLogin()"
              class="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg text-lg font-medium border border-gray-300 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Features</h2>
          <p class="text-lg text-gray-600">Everything you need for a modern web application</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white rounded-lg p-6 shadow-md">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Secure Authentication</h3>
            <p class="text-gray-600">JWT-based authentication with password reset, email verification, and account lockout protection.</p>
          </div>

          <div class="bg-white rounded-lg p-6 shadow-md">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">High Performance</h3>
            <p class="text-gray-600">Optimized Angular frontend with lazy loading and efficient Node.js backend with connection pooling.</p>
          </div>

          <div class="bg-white rounded-lg p-6 shadow-md">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Production Ready</h3>
            <p class="text-gray-600">Docker containerization, comprehensive testing, API documentation, and monitoring capabilities.</p>
          </div>
        </div>
      </div>

      <!-- API Documentation Section -->
      <div class="bg-white border-t">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">API Documentation</h2>
            <p class="text-lg text-gray-600">Explore our comprehensive API documentation</p>
          </div>

          <div class="bg-gray-50 rounded-lg p-8">
            <div class="flex flex-col sm:flex-row items-center justify-between">
              <div class="mb-4 sm:mb-0">
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Swagger API Docs</h3>
                <p class="text-gray-600">Interactive API documentation with live testing capabilities</p>
              </div>
              <a
                href="http://localhost:3000/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
                View API Docs
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-gray-900 text-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="text-center">
            <p class="text-gray-400">&copy; 2025 NodeAngularStack. Built with Node.js, Angular, and PostgreSQL.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: []
})
export class LandingComponent {
  constructor(private router: Router) {}

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}