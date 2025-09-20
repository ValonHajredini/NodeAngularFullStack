import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../layouts/main-layout/navigation.service';

/**
 * Dashboard component providing overview of user's workspace.
 * Displays welcome message, quick stats, and navigation shortcuts.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Welcome Header -->
        <div class="mb-8">
          @if (user()) {
            <h1 class="text-3xl font-bold text-gray-900">
              Welcome back, {{ user()!.firstName }}!
            </h1>
            <p class="mt-2 text-gray-600">
              Here's what's happening in your workspace today.
            </p>
          }
        </div>

        <!-- Quick Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <i class="pi pi-folder text-primary-600 text-2xl"></i>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Active Projects
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      12
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <i class="pi pi-check-square text-green-600 text-2xl"></i>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Completed Tasks
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      48
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <i class="pi pi-users text-blue-600 text-2xl"></i>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Team Members
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      8
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <i class="pi pi-calendar text-purple-600 text-2xl"></i>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      This Week's Tasks
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      15
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Recent Activity -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div class="space-y-4">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div class="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <i class="pi pi-check text-green-600 text-sm"></i>
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-gray-900">
                      <span class="font-medium">Task completed:</span> Update user interface components
                    </p>
                    <p class="text-sm text-gray-500">2 hours ago</p>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div class="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <i class="pi pi-plus text-blue-600 text-sm"></i>
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-gray-900">
                      <span class="font-medium">New project created:</span> Mobile App Redesign
                    </p>
                    <p class="text-sm text-gray-500">5 hours ago</p>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <div class="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <i class="pi pi-users text-purple-600 text-sm"></i>
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-gray-900">
                      <span class="font-medium">Team member added:</span> Sarah joined the development team
                    </p>
                    <p class="text-sm text-gray-500">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a routerLink="/projects/new"
                   class="group relative rounded-lg p-6 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                  <div>
                    <span class="rounded-lg inline-flex p-3 bg-primary-600 text-white group-hover:bg-primary-700">
                      <i class="pi pi-plus text-lg"></i>
                    </span>
                  </div>
                  <div class="mt-4">
                    <h3 class="text-lg font-medium text-gray-900 group-hover:text-gray-800">
                      New Project
                    </h3>
                    <p class="mt-2 text-sm text-gray-500">
                      Start a new project with your team.
                    </p>
                  </div>
                </a>

                <a routerLink="/tasks"
                   class="group relative rounded-lg p-6 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                  <div>
                    <span class="rounded-lg inline-flex p-3 bg-green-600 text-white group-hover:bg-green-700">
                      <i class="pi pi-check-square text-lg"></i>
                    </span>
                  </div>
                  <div class="mt-4">
                    <h3 class="text-lg font-medium text-gray-900 group-hover:text-gray-800">
                      View Tasks
                    </h3>
                    <p class="mt-2 text-sm text-gray-500">
                      Manage your tasks and deadlines.
                    </p>
                  </div>
                </a>

                <a routerLink="/team"
                   class="group relative rounded-lg p-6 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                  <div>
                    <span class="rounded-lg inline-flex p-3 bg-blue-600 text-white group-hover:bg-blue-700">
                      <i class="pi pi-users text-lg"></i>
                    </span>
                  </div>
                  <div class="mt-4">
                    <h3 class="text-lg font-medium text-gray-900 group-hover:text-gray-800">
                      Team
                    </h3>
                    <p class="mt-2 text-sm text-gray-500">
                      Collaborate with your team members.
                    </p>
                  </div>
                </a>

                @if (user() && (user()!.role === 'admin' || user()!.role === 'user')) {
                  <a routerLink="/reports"
                     class="group relative rounded-lg p-6 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                    <div>
                      <span class="rounded-lg inline-flex p-3 bg-purple-600 text-white group-hover:bg-purple-700">
                        <i class="pi pi-chart-bar text-lg"></i>
                      </span>
                    </div>
                    <div class="mt-4">
                      <h3 class="text-lg font-medium text-gray-900 group-hover:text-gray-800">
                        Reports
                      </h3>
                      <p class="mt-2 text-sm text-gray-500">
                        View analytics and insights.
                      </p>
                    </div>
                  </a>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly navigationService = inject(NavigationService);

  protected readonly user = this.authService.user;

  ngOnInit(): void {
    // Set navigation context for dashboard
    this.navigationService.setNavigationContext({
      title: 'Dashboard',
      breadcrumbs: [
        { label: 'Dashboard', icon: 'pi pi-home' }
      ]
    });
  }
}