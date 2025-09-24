import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
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
      [config]="welcomeConfig"
      (heroButtonClicked)="onHeroButtonClick($event)"
      (featureClicked)="onFeatureClick($event)"
      (apiDocsButtonClicked)="onApiDocsButtonClick($event)"
    />
  `,
  styles: [],
})
export class LandingComponent {
  readonly themeService = inject(ThemeService);

  constructor(private router: Router) {}

  /**
   * Welcome page configuration
   */
  welcomeConfig: WelcomePageConfig = {
    hero: {
      title: 'Welcome to',
      accentText: 'NodeAngularStack',
      subtitle: 'A modern full-stack application built with Node.js, Angular, and PostgreSQL.',
      description:
        'Experience seamless authentication, robust API management, and beautiful user interfaces.',
      primaryButton: {
        label: 'Create Account',
        variant: 'primary',
        size: 'lg',
        action: () => this.navigateToRegister(),
      },
      secondaryButton: {
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
      ],
      columns: 3,
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
    // Add any feature-specific navigation or actions here
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
