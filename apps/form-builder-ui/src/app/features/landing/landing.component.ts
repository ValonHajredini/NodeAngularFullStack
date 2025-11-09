import { Component, inject, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  WelcomePageComponent,
  WelcomePageConfig,
  WelcomeCTAButton,
  WelcomeFeature,
} from '../../shared/components';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, WelcomePageComponent],
  template: `
    <app-welcome-page
      [config]="welcomeConfig()"
      (heroButtonClicked)="onHeroButtonClick($event)"
      (featureClicked)="onFeatureClick($event)"
      (apiDocsButtonClicked)="onApiDocsButtonClick($event)"
    />
  `,
  styles: [],
})
export class LandingComponent implements OnInit {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Lifecycle hook - handles logout requests from main app or complete logout
   */
  ngOnInit(): void {
    // Check for logout parameter triggered from main app or other sources
    this.route.queryParams.subscribe((params) => {
      const logoutParam = params['logout'];

      // Handle 'complete' logout parameter to clear form builder tokens
      if (logoutParam === 'complete') {
        console.log('Complete logout triggered in form builder service');

        // Log out the user from form builder service
        if (this.authService.isAuthenticated()) {
          this.authService.logout().subscribe({
            next: () => {
              console.log('Form builder logout completed - tokens cleared');
            },
            error: (error) => {
              console.error('Form builder logout failed:', error);
            },
          });
        } else {
          console.log('Form builder: User already logged out');
        }
      }
    });
  }

  /**
   * Welcome page configuration - computed to adapt to authentication state
   */
  welcomeConfig = computed((): WelcomePageConfig => {
    const isAuthenticated = this.authService.isAuthenticated();
    const user = this.authService.user();

    return {
      hero: {
        title: isAuthenticated ? `Welcome back to` : 'Welcome to',
        accentText: 'NodeAngularStack',
        subtitle: isAuthenticated
          ? `Hello ${user?.firstName || 'User'}! Ready to continue your journey?`
          : 'A modern full-stack application built with Node.js, Angular, and PostgreSQL.',
        description: isAuthenticated
          ? 'Access your dashboard, manage your projects, and explore all the features available to you.'
          : 'Experience seamless authentication, robust API management, and beautiful user interfaces.',
        primaryButton: isAuthenticated
          ? undefined
          : {
              label: 'Create Account',
              variant: 'primary',
              size: 'lg',
              action: () => this.navigateToRegister(),
            },
        secondaryButton: isAuthenticated
          ? undefined
          : {
              label: 'Sign In',
              variant: 'secondary',
              size: 'lg',
              action: () => this.navigateToLogin(),
            },
        showThemeToggle: true,
      },
      features: {
        title: 'Features',
        description: 'Everything you need for a modern web application',
        items: [
          {
            title: 'Secure Authentication',
            description:
              'JWT-based authentication with password reset, email verification, and account lockout protection.',
            icon: 'pi pi-lock',
            iconColor: 'primary',
          },
          {
            title: 'High Performance',
            description:
              'Optimized Angular frontend with lazy loading and efficient Node.js backend with connection pooling.',
            icon: 'pi pi-bolt',
            iconColor: 'success',
          },
          {
            title: 'Production Ready',
            description:
              'Docker containerization, comprehensive testing, API documentation, and monitoring capabilities.',
            icon: 'pi pi-check-circle',
            iconColor: 'purple',
          },
          {
            title: 'Comprehensive Documentation',
            description:
              'Complete development guide, API reference, setup instructions, and troubleshooting resources.',
            icon: 'pi pi-book',
            iconColor: 'info',
          },
        ],
        columns: 4,
      },
      apiDocs: {
        title: 'API Documentation',
        description: 'Explore our comprehensive API documentation',
        docTitle: 'Swagger API Docs',
        docDescription: 'Interactive API documentation with live testing capabilities',
        docUrl: 'http://localhost:3000/api-docs',
        docButtonLabel: 'View API Docs',
        docButtonIcon: 'pi pi-external-link',
      },
      footer: {
        copyrightText: '© 2025 NodeAngularStack. Built with Node.js, Angular, and PostgreSQL.',
      },
    };
  });

  /**
   * Handle hero button clicks
   */
  onHeroButtonClick(button: WelcomeCTAButton): void {
    // Button actions are handled in the configuration
    // This event handler can be used for analytics or additional logic
    console.log('Hero button clicked:', button.label);
  }

  /**
   * Handle feature clicks
   */
  onFeatureClick(feature: WelcomeFeature): void {
    console.log('Feature clicked:', feature.title);
    // Navigate to documentation when documentation feature is clicked
    if (feature.title === 'Comprehensive Documentation') {
      this.router.navigate(['/app/documentation']);
    }
    // Add any other feature-specific navigation or actions here
  }

  /**
   * Handle API docs button clicks
   */
  onApiDocsButtonClick(button: WelcomeCTAButton): void {
    console.log('API docs button clicked:', button.label);
    // Additional analytics or tracking can be added here
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}
