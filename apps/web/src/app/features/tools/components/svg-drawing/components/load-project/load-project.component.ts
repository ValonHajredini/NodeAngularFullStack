import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { DrawingProject } from '@nodeangularfullstack/shared';

/**
 * Component for loading and managing saved drawing projects.
 * Displays list of user's projects with search, load, and delete functionality.
 * Requires user authentication.
 */
@Component({
  selector: 'app-load-project',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonDirective, InputText, Tag],
  template: `
    <div class="load-project-panel p-4">
      @if (!isAuthenticated()) {
        <!-- Login prompt for non-authenticated users -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex gap-2">
            <i class="pi pi-info-circle text-blue-600"></i>
            <p class="text-sm text-blue-800">Please log in to view and load your saved projects.</p>
          </div>
        </div>
      } @else {
        <!-- Header -->
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">My Projects</h3>
          <p class="text-sm text-gray-600">Load or manage your saved drawing projects.</p>
        </div>

        <!-- Search and refresh -->
        <div class="flex gap-2 mb-4">
          <input
            pInputText
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Search projects..."
            class="flex-1"
          />
          <button
            pButton
            type="button"
            icon="pi pi-refresh"
            severity="secondary"
            [outlined]="true"
            (click)="onRefresh()"
            [disabled]="isLoading()"
            [loading]="isLoading()"
          ></button>
        </div>

        <!-- Loading state -->
        @if (isLoading()) {
          <div class="flex justify-center items-center p-8">
            <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
          </div>
        }

        <!-- No projects message -->
        @else if (filteredProjects().length === 0 && !searchQuery()) {
          <div class="p-6 text-center bg-gray-50 rounded-md border border-gray-200">
            <i class="pi pi-folder-open text-4xl text-gray-400 mb-2"></i>
            <p class="text-sm text-gray-600">No saved projects yet.</p>
            <p class="text-xs text-gray-500 mt-1">Save your current drawing to create a project.</p>
          </div>
        }

        <!-- No search results -->
        @else if (filteredProjects().length === 0 && searchQuery()) {
          <div class="p-6 text-center bg-gray-50 rounded-md border border-gray-200">
            <i class="pi pi-search text-4xl text-gray-400 mb-2"></i>
            <p class="text-sm text-gray-600">No projects found matching "{{ searchQuery() }}"</p>
          </div>
        }

        <!-- Projects list -->
        @else {
          <div class="projects-list space-y-3">
            @for (project of filteredProjects(); track project.id) {
              <div
                class="project-card p-4 bg-white border border-gray-200 rounded-md hover:shadow-md transition-shadow"
              >
                <!-- Project info -->
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-900 mb-1">{{ project.name }}</h4>
                    @if (project.description) {
                      <p class="text-sm text-gray-600 mb-2">{{ project.description }}</p>
                    }
                    <div class="flex gap-2 items-center text-xs text-gray-500">
                      <span>
                        <i class="pi pi-calendar mr-1"></i>
                        {{ formatDate(project.createdAt) }}
                      </span>
                      <span>
                        <i class="pi pi-clock mr-1"></i>
                        {{ formatTime(project.createdAt) }}
                      </span>
                      <span>
                        <i class="pi pi-shapes mr-1"></i>
                        {{ project.templateData.shapes.length }} shapes
                      </span>
                    </div>
                  </div>
                  @if (!project.isActive) {
                    <p-tag value="Archived" severity="secondary"></p-tag>
                  }
                </div>

                <!-- Thumbnail preview (if available) -->
                @if (project.thumbnail) {
                  <div class="mb-3">
                    <img
                      [src]="project.thumbnail"
                      alt="{{ project.name }} thumbnail"
                      class="w-full h-32 object-contain bg-gray-50 rounded border border-gray-200"
                    />
                  </div>
                }

                <!-- Action buttons -->
                <div class="flex gap-2">
                  <button
                    pButton
                    type="button"
                    label="Load"
                    icon="pi pi-upload"
                    severity="primary"
                    (click)="onLoad(project)"
                    [disabled]="isLoadingProject()"
                    class="flex-1"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    severity="danger"
                    [outlined]="true"
                    (click)="onDelete(project)"
                    [disabled]="isLoadingProject()"
                  ></button>
                </div>
              </div>
            }
          </div>

          <!-- Projects count -->
          <div class="mt-4 text-center text-xs text-gray-500">
            Showing {{ filteredProjects().length }} of {{ projects().length }} projects
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .load-project-panel {
        max-width: 600px;
      }

      .projects-list {
        max-height: 600px;
        overflow-y: auto;
      }

      .project-card {
        transition: all 0.2s ease;
      }

      .project-card:hover {
        transform: translateY(-2px);
      }

      :host ::ng-deep .p-inputtext {
        width: 100%;
      }
    `,
  ],
})
export class LoadProjectComponent implements OnInit {
  private readonly authService = inject(AuthService);

  /** Event emitted when projects should be loaded */
  @Output() loadProjects = new EventEmitter<void>();

  /** Event emitted when a project should be loaded */
  @Output() load = new EventEmitter<DrawingProject>();

  /** Event emitted when a project should be deleted */
  @Output() delete = new EventEmitter<DrawingProject>();

  /** List of all projects */
  projects = signal<DrawingProject[]>([]);

  /** Filtered projects based on search */
  filteredProjects = signal<DrawingProject[]>([]);

  /** Search query */
  searchQuery = signal<string>('');

  /** Loading state */
  isLoading = signal<boolean>(false);

  /** Loading project state */
  isLoadingProject = signal<boolean>(false);

  /** Whether user is authenticated */
  isAuthenticated = this.authService.isAuthenticated;

  ngOnInit(): void {
    // Auto-load projects on component init if authenticated
    if (this.isAuthenticated()) {
      this.onRefresh();
    }
  }

  /**
   * Sets the projects list.
   * @param projects - Array of projects to display
   */
  setProjects(projects: DrawingProject[]): void {
    this.projects.set(projects);
    this.onSearch(); // Re-apply search filter
  }

  /**
   * Sets the loading state.
   * @param loading - Whether data is loading
   */
  setLoading(loading: boolean): void {
    this.isLoading.set(loading);
  }

  /**
   * Handles search input change.
   * Filters projects based on name and description.
   */
  onSearch(): void {
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      this.filteredProjects.set(this.projects());
      return;
    }

    const filtered = this.projects().filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query),
    );

    this.filteredProjects.set(filtered);
  }

  /**
   * Handles refresh button click.
   * Emits event to reload projects from server.
   */
  onRefresh(): void {
    this.loadProjects.emit();
  }

  /**
   * Handles load button click.
   * Confirms before loading and emits load event.
   * @param project - Project to load
   */
  onLoad(project: DrawingProject): void {
    const confirmed = confirm(
      `Load "${project.name}"?\n\nThis will replace your current drawing. Make sure to save your work first.`,
    );

    if (!confirmed) {
      return;
    }

    this.isLoadingProject.set(true);
    this.load.emit(project);
  }

  /**
   * Handles delete button click.
   * Confirms before deleting and emits delete event.
   * @param project - Project to delete
   */
  onDelete(project: DrawingProject): void {
    const confirmed = confirm(`Delete "${project.name}"?\n\nThis action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    this.delete.emit(project);
  }

  /**
   * Resets the loading project state.
   */
  resetLoadingState(): void {
    this.isLoadingProject.set(false);
  }

  /**
   * Formats a date for display.
   * @param date - Date to format
   * @returns Formatted date string
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Formats a time for display.
   * @param date - Date to format
   * @returns Formatted time string
   */
  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
