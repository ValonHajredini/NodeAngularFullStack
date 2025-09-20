import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';

/**
 * Interface for breadcrumb items.
 */
export interface BreadcrumbItem {
  label: string;
  route?: string;
  icon?: string;
}

/**
 * Interface for navigation context.
 */
export interface NavigationContext {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: NavigationAction[];
}

/**
 * Interface for navigation actions (like buttons in the page header).
 */
export interface NavigationAction {
  label: string;
  icon: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

/**
 * Navigation service for programmatic navigation and route management.
 * Provides utilities for breadcrumbs, page titles, and navigation context.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // Navigation state signals
  private readonly currentRouteSignal = signal('');
  private readonly navigationContextSignal = signal<NavigationContext | null>(null);
  private readonly isNavigatingSignal = signal(false);

  // Public readonly signals
  readonly currentRoute = this.currentRouteSignal.asReadonly();
  readonly navigationContext = this.navigationContextSignal.asReadonly();
  readonly isNavigating = this.isNavigatingSignal.asReadonly();

  /**
   * Route metadata for generating breadcrumbs and titles.
   */
  private readonly routeMetadata: Record<string, { title: string; parent?: string; icon?: string }> = {
    '/dashboard': { title: 'Dashboard', icon: 'pi pi-home' },
    '/profile': { title: 'Profile', parent: '/dashboard', icon: 'pi pi-user' },
    '/projects': { title: 'Projects', icon: 'pi pi-folder' },
    '/projects/new': { title: 'New Project', parent: '/projects', icon: 'pi pi-plus' },
    '/tasks': { title: 'Tasks', icon: 'pi pi-check-square' },
    '/team': { title: 'Team', icon: 'pi pi-users' },
    '/reports': { title: 'Reports', icon: 'pi pi-chart-bar' },
    '/admin': { title: 'Administration', icon: 'pi pi-cog' },
    '/admin/users': { title: 'User Management', parent: '/admin', icon: 'pi pi-users' },
    '/admin/settings': { title: 'System Settings', parent: '/admin', icon: 'pi pi-cog' },
    '/settings': { title: 'Settings', parent: '/dashboard', icon: 'pi pi-cog' },
    '/support': { title: 'Help & Support', parent: '/dashboard', icon: 'pi pi-question-circle' }
  };

  constructor() {
    this.initializeRouteTracking();
  }

  /**
   * Navigates to a specific route with optional navigation options.
   * @param route - Route to navigate to
   * @param options - Navigation options
   * @example
   * navigationService.navigateTo('/profile');
   * navigationService.navigateTo('/projects', { replaceUrl: true });
   */
  navigateTo(route: string, options: { replaceUrl?: boolean; queryParams?: any } = {}): Promise<boolean> {
    this.isNavigatingSignal.set(true);

    const navigationPromise = this.router.navigate([route], {
      replaceUrl: options.replaceUrl,
      queryParams: options.queryParams
    });

    navigationPromise.finally(() => {
      this.isNavigatingSignal.set(false);
    });

    return navigationPromise;
  }

  /**
   * Navigates back in browser history.
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * Navigates forward in browser history.
   */
  goForward(): void {
    window.history.forward();
  }

  /**
   * Sets the navigation context for the current page.
   * @param context - Navigation context with title, breadcrumbs, and actions
   * @example
   * navigationService.setNavigationContext({
   *   title: 'Project Details',
   *   breadcrumbs: [
   *     { label: 'Dashboard', route: '/dashboard' },
   *     { label: 'Projects', route: '/projects' },
   *     { label: 'Project Alpha' }
   *   ],
   *   actions: [
   *     { label: 'Edit', icon: 'pi pi-pencil', action: () => this.editProject() }
   *   ]
   * });
   */
  setNavigationContext(context: NavigationContext): void {
    this.navigationContextSignal.set(context);
  }

  /**
   * Clears the current navigation context.
   */
  clearNavigationContext(): void {
    this.navigationContextSignal.set(null);
  }

  /**
   * Generates breadcrumbs for the current route automatically.
   * @param currentRoute - Current route path
   * @returns Array of breadcrumb items
   */
  generateBreadcrumbs(currentRoute: string): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    const metadata = this.routeMetadata[currentRoute];

    if (!metadata) {
      return [{ label: 'Home', route: '/dashboard', icon: 'pi pi-home' }];
    }

    // Build breadcrumb chain
    let route = currentRoute;
    const chain: string[] = [];

    while (route) {
      chain.unshift(route);
      const meta = this.routeMetadata[route];
      route = meta?.parent || '';
    }

    // Convert chain to breadcrumb items
    chain.forEach((routePath, index) => {
      const meta = this.routeMetadata[routePath];
      if (meta) {
        breadcrumbs.push({
          label: meta.title,
          route: index < chain.length - 1 ? routePath : undefined, // Last item is not clickable
          icon: index === 0 ? meta.icon : undefined // Only show icon for first item
        });
      }
    });

    return breadcrumbs;
  }

  /**
   * Gets the page title for the current route.
   * @param route - Route path
   * @returns Page title
   */
  getPageTitle(route: string): string {
    const metadata = this.routeMetadata[route];
    return metadata?.title || 'MyApp';
  }

  /**
   * Checks if a route is accessible based on user permissions.
   * @param route - Route to check
   * @returns True if route is accessible
   */
  isRouteAccessible(route: string): boolean {
    const user = this.authService.user();
    if (!user) return false;

    // Define route permissions
    const routePermissions: Record<string, string[]> = {
      '/admin': ['admin'],
      '/admin/users': ['admin'],
      '/admin/settings': ['admin'],
      '/reports': ['admin', 'user']
    };

    const requiredRoles = routePermissions[route];
    if (!requiredRoles) return true; // Route has no restrictions

    return requiredRoles.includes(user.role);
  }

  /**
   * Gets suggested navigation based on user role and current context.
   * @returns Array of suggested navigation items
   */
  getSuggestedNavigation(): Array<{ label: string; route: string; icon: string; description: string }> {
    const user = this.authService.user();
    if (!user) return [];

    const suggestions = [
      {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'pi pi-home',
        description: 'Overview of your workspace'
      },
      {
        label: 'Profile',
        route: '/profile',
        icon: 'pi pi-user',
        description: 'Manage your account settings'
      }
    ];

    // Add role-specific suggestions
    if (user.role === 'admin') {
      suggestions.push(
        {
          label: 'User Management',
          route: '/admin/users',
          icon: 'pi pi-users',
          description: 'Manage system users'
        },
        {
          label: 'System Settings',
          route: '/admin/settings',
          icon: 'pi pi-cog',
          description: 'Configure system preferences'
        }
      );
    }

    if (['admin', 'user'].includes(user.role)) {
      suggestions.push({
        label: 'Reports',
        route: '/reports',
        icon: 'pi pi-chart-bar',
        description: 'View analytics and reports'
      });
    }

    return suggestions;
  }

  /**
   * Creates a shareable link for the current page.
   * @param includeQueryParams - Whether to include current query parameters
   * @returns Shareable URL
   */
  createShareableLink(includeQueryParams: boolean = false): string {
    const baseUrl = window.location.origin;
    const currentPath = this.currentRouteSignal();

    if (includeQueryParams) {
      return baseUrl + window.location.pathname + window.location.search;
    }

    return baseUrl + currentPath;
  }

  /**
   * Initializes route tracking and automatic context updates.
   */
  private initializeRouteTracking(): void {
    // Track route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const route = event.urlAfterRedirects;
        this.currentRouteSignal.set(route);

        // Auto-generate navigation context if none is set
        if (!this.navigationContextSignal()) {
          this.setNavigationContext({
            title: this.getPageTitle(route),
            breadcrumbs: this.generateBreadcrumbs(route)
          });
        }

        // Update document title
        document.title = `${this.getPageTitle(route)} - MyApp`;
      });

    // Set initial route
    this.currentRouteSignal.set(this.router.url);
  }
}