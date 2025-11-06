import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../layouts/main-layout/navigation.service';
import { SectionContainerComponent } from '../../shared/components/section-container';

/**
 * Team member interface for type safety
 */
export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'user' | 'readonly';
  department: string;
  avatarUrl?: string;
  joinedAt: Date;
}

/**
 * Team component displaying team members with their roles and contact information.
 * Provides a comprehensive view of all team members in a card-based layout.
 */
@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, SectionContainerComponent],
  template: `
    <div class="team-container">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Page Header -->
        <div class="mb-8">
          <h1 class="page-title">Our Team</h1>
          <p class="page-subtitle">
            Meet the talented people working together to build amazing products.
          </p>
        </div>

        <!-- Team Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-primary">
              <i class="pi pi-users text-xl"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ teamMembers().length }}</div>
              <div class="stat-label">Total Members</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-success">
              <i class="pi pi-shield text-xl"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ adminCount() }}</div>
              <div class="stat-label">Administrators</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-info">
              <i class="pi pi-user text-xl"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ userCount() }}</div>
              <div class="stat-label">Team Members</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-purple">
              <i class="pi pi-briefcase text-xl"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ departmentCount() }}</div>
              <div class="stat-label">Departments</div>
            </div>
          </div>
        </div>

        <!-- Team Members Grid -->
        <app-section-container
          [title]="'Team Members'"
          [variant]="'default'"
          [size]="'lg'"
          [ariaLabel]="'Grid of team members with their contact information and roles'"
        >
          <div class="team-grid">
            @for (member of teamMembers(); track member.id) {
              <div class="team-card">
                <!-- Avatar -->
                <div class="team-card-avatar">
                  @if (member.avatarUrl) {
                    <img
                      [src]="member.avatarUrl"
                      [alt]="member.firstName + ' ' + member.lastName"
                      class="avatar-image"
                    />
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(member) }}
                    </div>
                  }
                </div>

                <!-- Content -->
                <div class="team-card-content">
                  <h3 class="member-name">{{ member.firstName }} {{ member.lastName }}</h3>

                  <!-- Role Badge -->
                  <div class="role-badge" [class]="getRoleBadgeClass(member.role)">
                    <i [class]="getRoleIcon(member.role)"></i>
                    <span>{{ getRoleLabel(member.role) }}</span>
                  </div>

                  <!-- Department -->
                  <div class="member-info">
                    <i class="pi pi-briefcase text-sm"></i>
                    <span>{{ member.department }}</span>
                  </div>

                  <!-- Email -->
                  <div class="member-info">
                    <i class="pi pi-envelope text-sm"></i>
                    <a [href]="'mailto:' + member.email" class="member-email">
                      {{ member.email }}
                    </a>
                  </div>

                  <!-- Joined Date -->
                  <div class="member-info">
                    <i class="pi pi-calendar text-sm"></i>
                    <span>Joined {{ formatDate(member.joinedAt) }}</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="team-card-actions">
                  <button
                    class="action-button action-button-primary"
                    [attr.aria-label]="'Send message to ' + member.firstName"
                  >
                    <i class="pi pi-envelope"></i>
                    <span>Message</span>
                  </button>

                  @if (currentUser()?.role === 'admin') {
                    <button
                      class="action-button action-button-secondary"
                      [attr.aria-label]="'View profile of ' + member.firstName"
                    >
                      <i class="pi pi-user"></i>
                      <span>Profile</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </app-section-container>
      </div>
    </div>
  `,
  styles: [
    `
      /* Container */
      .team-container {
        min-height: 100vh;
        background-color: var(--color-background);
        padding-top: 2rem;
        padding-bottom: 2rem;
        transition: var(--transition-colors);
      }

      /* Header */
      .page-title {
        font-size: 1.875rem;
        font-weight: bold;
        color: var(--color-text-primary);
        line-height: 2.25rem;
      }

      .page-subtitle {
        margin-top: 0.5rem;
        color: var(--color-text-secondary);
      }

      /* Stat Cards */
      .stat-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background-color: var(--surface-0);
        border: 1px solid var(--surface-border);
        border-radius: 0.5rem;
        transition: all 0.2s;
      }

      .stat-card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .stat-icon-wrapper {
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .stat-icon-primary {
        background-color: rgba(59, 130, 246, 0.1);
        color: var(--color-primary-600);
      }

      .stat-icon-success {
        background-color: rgba(34, 197, 94, 0.1);
        color: var(--color-success-600);
      }

      .stat-icon-info {
        background-color: rgba(14, 165, 233, 0.1);
        color: var(--color-info-600);
      }

      .stat-icon-purple {
        background-color: rgba(147, 51, 234, 0.1);
        color: #7c3aed;
      }

      .stat-content {
        flex: 1;
      }

      .stat-value {
        font-size: 1.875rem;
        font-weight: bold;
        color: var(--color-text-primary);
        line-height: 1;
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        margin-top: 0.25rem;
      }

      /* Team Grid */
      .team-grid {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        gap: 1.5rem;
      }

      @media (min-width: 640px) {
        .team-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (min-width: 1024px) {
        .team-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }

      /* Team Card */
      .team-card {
        background: #f8f9fa;
        border: 2px solid #d1d5db;
        border-radius: 1rem;
        padding: 2rem 1.5rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        position: relative;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      }

      .team-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-600));
        opacity: 0;
        transition: opacity 0.3s;
      }

      .team-card:hover {
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
        transform: translateY(-8px) scale(1.02);
        border-color: var(--color-primary-400);
      }

      .team-card:hover::before {
        opacity: 1;
      }

      /* Avatar */
      .team-card-avatar {
        display: flex;
        justify-content: center;
        margin-bottom: 0.75rem;
      }

      .avatar-image {
        width: 6rem;
        height: 6rem;
        border-radius: 9999px;
        object-fit: cover;
        border: 4px solid var(--surface-0);
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transition: all 0.3s;
      }

      .avatar-placeholder {
        width: 6rem;
        height: 6rem;
        border-radius: 9999px;
        background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: bold;
        color: white;
        border: 4px solid var(--surface-0);
        box-shadow:
          0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transition: all 0.3s;
      }

      .team-card:hover .avatar-image,
      .team-card:hover .avatar-placeholder {
        transform: scale(1.1);
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.15),
          0 4px 6px -2px rgba(0, 0, 0, 0.1);
      }

      /* Content */
      .team-card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .member-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-text-primary);
        text-align: center;
        margin: 0;
      }

      /* Role Badge */
      .role-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .role-badge-admin {
        background-color: rgba(147, 51, 234, 0.1);
        color: #7c3aed;
      }

      .role-badge-user {
        background-color: rgba(59, 130, 246, 0.1);
        color: var(--color-primary-600);
      }

      .role-badge-readonly {
        background-color: rgba(107, 114, 128, 0.1);
        color: #6b7280;
      }

      /* Member Info */
      .member-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--color-text-secondary);
      }

      .member-email {
        color: var(--color-primary-600);
        text-decoration: none;
        transition: color 0.2s;
      }

      .member-email:hover {
        color: var(--color-primary-700);
        text-decoration: underline;
      }

      /* Actions */
      .team-card-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .action-button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      .action-button-primary {
        background-color: var(--color-primary-600);
        color: white;
      }

      .action-button-primary:hover {
        background-color: var(--color-primary-700);
        transform: translateY(-1px);
      }

      .action-button-secondary {
        background-color: transparent;
        color: var(--color-text-secondary);
        border: 1px solid var(--surface-border);
      }

      .action-button-secondary:hover {
        background-color: var(--surface-50);
        color: var(--color-text-primary);
        border-color: var(--color-primary-300);
      }

      /* Dark Mode Adjustments */
      [data-theme='dark'] .team-card {
        background: #2d3748;
        border-color: #4a5568;
      }

      [data-theme='dark'] .stat-icon-primary {
        background-color: rgba(59, 130, 246, 0.2);
        color: var(--color-primary-500);
      }

      [data-theme='dark'] .stat-icon-success {
        background-color: rgba(34, 197, 94, 0.2);
        color: var(--color-success-500);
      }

      [data-theme='dark'] .stat-icon-info {
        background-color: rgba(14, 165, 233, 0.2);
        color: var(--color-info-500);
      }

      [data-theme='dark'] .stat-icon-purple {
        background-color: rgba(147, 51, 234, 0.2);
        color: #a78bfa;
      }

      [data-theme='dark'] .role-badge-admin {
        background-color: rgba(147, 51, 234, 0.2);
        color: #a78bfa;
      }

      [data-theme='dark'] .role-badge-user {
        background-color: rgba(59, 130, 246, 0.2);
        color: var(--color-primary-500);
      }

      [data-theme='dark'] .action-button-secondary:hover {
        background-color: var(--surface-200);
      }

      /* Responsive Adjustments */
      @media (min-width: 1024px) {
        .page-title {
          font-size: 2.25rem;
          line-height: 2.5rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly navigationService = inject(NavigationService);

  protected readonly currentUser = this.authService.user;

  /**
   * Team members signal with mock data
   * In production, this would be fetched from an API endpoint
   */
  protected readonly teamMembers = signal<TeamMember[]>([
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'admin',
      department: 'Engineering',
      joinedAt: new Date('2023-01-15'),
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      role: 'user',
      department: 'Product',
      joinedAt: new Date('2023-03-22'),
    },
    {
      id: '3',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@example.com',
      role: 'admin',
      department: 'Engineering',
      joinedAt: new Date('2022-11-10'),
    },
    {
      id: '4',
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@example.com',
      role: 'user',
      department: 'Design',
      joinedAt: new Date('2023-05-08'),
    },
    {
      id: '5',
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david.wilson@example.com',
      role: 'user',
      department: 'Marketing',
      joinedAt: new Date('2023-07-14'),
    },
    {
      id: '6',
      firstName: 'Sarah',
      lastName: 'Brown',
      email: 'sarah.brown@example.com',
      role: 'readonly',
      department: 'Operations',
      joinedAt: new Date('2024-01-20'),
    },
    {
      id: '7',
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@example.com',
      role: 'user',
      department: 'Engineering',
      joinedAt: new Date('2023-09-05'),
    },
    {
      id: '8',
      firstName: 'Lisa',
      lastName: 'Anderson',
      email: 'lisa.anderson@example.com',
      role: 'user',
      department: 'Product',
      joinedAt: new Date('2023-11-18'),
    },
  ]);

  /**
   * Computed count of admin users
   */
  protected readonly adminCount = signal(
    this.teamMembers().filter((m) => m.role === 'admin').length,
  );

  /**
   * Computed count of regular users
   */
  protected readonly userCount = signal(this.teamMembers().filter((m) => m.role === 'user').length);

  /**
   * Computed count of unique departments
   */
  protected readonly departmentCount = signal(
    new Set(this.teamMembers().map((m) => m.department)).size,
  );

  ngOnInit(): void {
    // Set navigation context for team page
    this.navigationService.setNavigationContext({
      title: 'Team',
      breadcrumbs: [
        { label: 'Dashboard', icon: 'pi pi-home' },
        { label: 'Team', icon: 'pi pi-users' },
      ],
    });
  }

  /**
   * Get initials from team member name for avatar placeholder
   */
  protected getInitials(member: TeamMember): string {
    return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Get CSS class for role badge styling
   */
  protected getRoleBadgeClass(role: string): string {
    return `role-badge-${role}`;
  }

  /**
   * Get icon for role badge
   */
  protected getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      admin: 'pi pi-shield',
      user: 'pi pi-user',
      readonly: 'pi pi-eye',
    };
    return icons[role] || 'pi pi-user';
  }

  /**
   * Get human-readable label for role
   */
  protected getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      user: 'Team Member',
      readonly: 'Read Only',
    };
    return labels[role] || role;
  }

  /**
   * Format date to readable string
   */
  protected formatDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }
}
