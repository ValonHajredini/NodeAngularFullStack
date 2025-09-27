import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../layouts/main-layout/navigation.service';
import { ToolsService } from '../../core/services/tools.service';
import { ActionCardComponent, type ActionCardData } from '../../shared/components/action-card';
import { StatsCardComponent, type StatsCardData } from '../../shared/components/stats-card';
import { SectionContainerComponent } from '../../shared/components/section-container';
import { ToolGateDirective } from '../../shared/directives/tool-gate.directive';
import { ToolLoadingComponent } from '../../shared/components/tool-loading/tool-loading.component';
import { ToolsContainerComponent } from './components/tools-container/tools-container.component';

/**
 * Dashboard component providing overview of user's workspace.
 * Displays welcome message, quick stats, and navigation shortcuts.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ActionCardComponent,
    StatsCardComponent,
    SectionContainerComponent,
    ToolGateDirective,
    ToolLoadingComponent,
    ToolsContainerComponent,
  ],
  template: `
    <div class="dashboard-container">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Welcome Header -->
        <div class="mb-8">
          @if (user()) {
            <h1 class="welcome-title">Welcome back, {{ user()!.firstName }}!</h1>
            <p class="welcome-subtitle">Here's what's happening in your workspace today.</p>
          }
        </div>

        <!-- Quick Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          @for (statsCard of statsCards; track statsCard.title) {
            <app-stats-card
              [title]="statsCard.title"
              [value]="statsCard.value"
              [icon]="statsCard.icon"
              [iconColor]="statsCard.iconColor"
              [size]="'md'"
              [ariaLabel]="statsCard.ariaLabel"
            />
          }
        </div>

        <!-- Main Content Sections -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Recent Activity -->
          <app-section-container
            [title]="'Recent Activity'"
            [variant]="'default'"
            [size]="'lg'"
            [ariaLabel]="'Recent activity and updates in your workspace'"
          >
            <div class="space-y-4">
              <div class="activity-item">
                <div class="flex-shrink-0">
                  <div class="activity-icon activity-icon-success">
                    <i class="pi pi-check text-sm"></i>
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="activity-text">
                    <span class="font-medium">Task completed:</span> Update user interface
                    components
                  </p>
                  <p class="activity-time">2 hours ago</p>
                </div>
              </div>

              <div class="activity-item">
                <div class="flex-shrink-0">
                  <div class="activity-icon activity-icon-info">
                    <i class="pi pi-plus text-sm"></i>
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="activity-text">
                    <span class="font-medium">New project created:</span> Mobile App Redesign
                  </p>
                  <p class="activity-time">5 hours ago</p>
                </div>
              </div>

              <div class="activity-item">
                <div class="flex-shrink-0">
                  <div class="activity-icon activity-icon-purple">
                    <i class="pi pi-users text-sm"></i>
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="activity-text">
                    <span class="font-medium">Team member added:</span> Sarah joined the development
                    team
                  </p>
                  <p class="activity-time">1 day ago</p>
                </div>
              </div>
            </div>
          </app-section-container>

          <!-- Quick Actions -->
          <app-section-container
            [title]="'Quick Actions'"
            [variant]="'default'"
            [size]="'lg'"
            [ariaLabel]="'Quick action shortcuts for common tasks'"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (actionCard of visibleActionCards(); track actionCard.title) {
                <app-action-card
                  [title]="actionCard.title"
                  [description]="actionCard.description"
                  [icon]="actionCard.icon"
                  [iconColor]="actionCard.iconColor"
                  [routerLink]="actionCard.routerLink"
                  [size]="'md'"
                  [ariaLabel]="actionCard.ariaLabel"
                />
              }
            </div>
          </app-section-container>
        </div>

        <!-- Available Tools Section -->
        <div class="mt-8">
          <app-section-container
            [title]="'Available Tools'"
            [variant]="'default'"
            [size]="'lg'"
            [ariaLabel]="'Tools and features available in your workspace'"
          >
            <app-dashboard-tools-container></app-dashboard-tools-container>
          </app-section-container>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Dashboard Container */
      .dashboard-container {
        min-height: 100vh;
        background-color: var(--color-background);
        padding-top: 2rem;
        padding-bottom: 2rem;
        transition: var(--transition-colors);
      }

      /* Welcome Section */
      .welcome-title {
        font-size: 1.875rem;
        font-weight: bold;
        color: var(--color-text-primary);
        line-height: 2.25rem;
      }

      .welcome-subtitle {
        margin-top: 0.5rem;
        color: var(--color-text-secondary);
      }

      /* Activity Items */
      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .activity-icon {
        height: 2rem;
        width: 2rem;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition-colors);
      }

      .activity-icon-success {
        background-color: rgba(34, 197, 94, 0.1);
        color: var(--color-success-600);
      }

      .activity-icon-info {
        background-color: rgba(59, 130, 246, 0.1);
        color: var(--color-primary-600);
      }

      .activity-icon-purple {
        background-color: rgba(147, 51, 234, 0.1);
        color: #7c3aed;
      }

      /* Dark mode adjustments for activity icons */
      [data-theme='dark'] .activity-icon-success {
        background-color: rgba(34, 197, 94, 0.2);
        color: var(--color-success-500);
      }

      [data-theme='dark'] .activity-icon-info {
        background-color: rgba(59, 130, 246, 0.2);
        color: var(--color-primary-500);
      }

      [data-theme='dark'] .activity-icon-purple {
        background-color: rgba(147, 51, 234, 0.2);
        color: #a78bfa;
      }

      .activity-text {
        font-size: 0.875rem;
        color: var(--color-text-primary);
      }

      .activity-time {
        font-size: 0.875rem;
        color: var(--color-text-muted);
        margin-top: 0.125rem;
      }

      /* Responsive adjustments */
      @media (min-width: 640px) {
        .dashboard-container {
          padding-top: 2rem;
          padding-bottom: 2rem;
        }
      }

      @media (min-width: 1024px) {
        .welcome-title {
          font-size: 2.25rem;
          line-height: 2.5rem;
        }
      }

      /* Tools Demo Section Styles */
      .tool-demo-item {
        margin-bottom: 1rem;
      }

      .tool-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        background-color: var(--surface-0);
        border: 1px solid var(--surface-border);
        border-radius: 0.5rem;
        transition: all 0.2s;

        &:hover {
          border-color: var(--primary-300);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        &.disabled {
          opacity: 0.6;
          border-color: var(--surface-300);
          background-color: var(--surface-50);
        }
      }

      .tool-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex: 1;
      }

      .tool-icon {
        font-size: 1.5rem;
        color: var(--primary-500);
        width: 2rem;
        text-align: center;
      }

      .tool-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-color);
        margin: 0 0 0.25rem 0;
      }

      .tool-description {
        font-size: 0.875rem;
        color: var(--text-color-secondary);
        margin: 0;
      }

      .tool-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .tool-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background-color: var(--primary-500);
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: var(--primary-600);
        }

        i {
          font-size: 0.75rem;
        }
      }

      .tool-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;

        &.tool-status-enabled {
          background-color: rgba(34, 197, 94, 0.1);
          color: var(--green-600);
        }

        &.tool-status-disabled {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--red-600);
        }

        i {
          font-size: 0.75rem;
        }
      }

      /* Tool Summary Section */
      .tool-summary {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid var(--surface-border);
      }

      .summary-card {
        padding: 1.5rem;
        background-color: var(--surface-50);
        border-radius: 0.5rem;
        border: 1px solid var(--surface-border);
      }

      .summary-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        color: var(--text-color);
        margin-bottom: 1rem;

        i {
          color: var(--primary-500);
        }
      }

      .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .summary-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--text-color-secondary);
      }

      .stat-value {
        font-weight: 600;
        color: var(--text-color);

        &.loading {
          color: var(--primary-500);
        }
      }

      .summary-actions {
        display: flex;
        justify-content: flex-end;
      }

      .refresh-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background-color: var(--surface-0);
        color: var(--primary-500);
        border: 1px solid var(--primary-500);
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background-color: var(--primary-50);
          border-color: var(--primary-600);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        i.spinning {
          animation: spin 1s linear infinite;
        }
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      /* Dark mode adjustments */
      [data-theme='dark'] {
        .tool-card.disabled {
          background-color: var(--surface-100);
        }

        .summary-card {
          background-color: var(--surface-100);
        }

        .tool-status-enabled {
          background-color: rgba(34, 197, 94, 0.2);
          color: var(--green-400);
        }

        .tool-status-disabled {
          background-color: rgba(239, 68, 68, 0.2);
          color: var(--red-400);
        }

        .refresh-button:hover:not(:disabled) {
          background-color: var(--surface-200);
        }
      }

      /* Responsive adjustments for tools */
      @media (max-width: 768px) {
        .tool-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .tool-actions {
          width: 100%;
          justify-content: space-between;
        }

        .summary-stats {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly navigationService = inject(NavigationService);
  private readonly toolsService = inject(ToolsService);

  protected readonly user = this.authService.user;

  // Tools service reactive state
  protected readonly enabledToolsCount = this.toolsService.enabledToolsCount;
  protected readonly toolsLoading = this.toolsService.loading;

  /**
   * Configuration for statistics cards displayed in the dashboard
   */
  protected readonly statsCards: StatsCardData[] = [
    {
      title: 'Active Projects',
      value: 12,
      icon: 'pi pi-folder',
      iconColor: 'primary',
      ariaLabel: 'Active Projects: 12 projects currently in progress',
    },
    {
      title: 'Completed Tasks',
      value: 48,
      icon: 'pi pi-check-square',
      iconColor: 'success',
      ariaLabel: 'Completed Tasks: 48 tasks finished successfully',
    },
    {
      title: 'Team Members',
      value: 8,
      icon: 'pi pi-users',
      iconColor: 'info',
      ariaLabel: 'Team Members: 8 people working on your projects',
    },
    {
      title: "This Week's Tasks",
      value: 15,
      icon: 'pi pi-calendar',
      iconColor: 'purple',
      ariaLabel: "This Week's Tasks: 15 tasks scheduled for this week",
    },
  ];

  /**
   * Configuration for action cards displayed in the Quick Actions section
   */
  private readonly actionCards: ActionCardData[] = [
    {
      title: 'New Project',
      description: 'Start a new project with your team.',
      icon: 'pi pi-plus',
      iconColor: 'primary',
      routerLink: '/projects/new',
      ariaLabel: 'Create a new project and start collaborating with your team',
    },
    {
      title: 'View Tasks',
      description: 'Manage your tasks and deadlines.',
      icon: 'pi pi-check-square',
      iconColor: 'success',
      routerLink: '/tasks',
      ariaLabel: 'View and manage your assigned tasks and deadlines',
    },
    {
      title: 'Team',
      description: 'Collaborate with your team members.',
      icon: 'pi pi-users',
      iconColor: 'info',
      routerLink: '/team',
      ariaLabel: 'View team members and collaborate on projects',
    },
    {
      title: 'Reports',
      description: 'View analytics and insights.',
      icon: 'pi pi-chart-bar',
      iconColor: 'warning',
      routerLink: '/reports',
      ariaLabel: 'Access reports, analytics and project insights',
    },
  ];

  /**
   * Returns action cards visible to the current user based on their role
   */
  protected readonly visibleActionCards = computed(() => {
    const currentUser = this.user();
    if (!currentUser) return [];

    return this.actionCards.filter((card) => {
      // Reports are only available to admin and user roles
      if (card.routerLink === '/reports') {
        return currentUser.role === 'admin' || currentUser.role === 'user';
      }
      return true;
    });
  });

  ngOnInit(): void {
    // Set navigation context for dashboard
    this.navigationService.setNavigationContext({
      title: 'Dashboard',
      breadcrumbs: [{ label: 'Dashboard', icon: 'pi pi-home' }],
    });
  }

  /**
   * Refreshes the tools status from the API.
   * Demonstrates programmatic usage of the ToolsService.
   */
  protected refreshTools(): void {
    this.toolsService.refreshAllTools().subscribe({
      next: (tools) => {
        console.log(`Dashboard: Refreshed ${tools.length} tools`);
      },
      error: (error) => {
        console.error('Dashboard: Failed to refresh tools:', error);
      },
    });
  }
}
