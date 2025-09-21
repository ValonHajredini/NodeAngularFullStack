/**
 * NgRx Signals State Management Pattern Example
 *
 * This example demonstrates modern state management using Angular signals
 * following the project's reactive patterns.
 *
 * Features:
 * - Reactive state with signals
 * - Computed properties
 * - Effects for side effects
 * - Type-safe state management
 * - Loading and error states
 * - Optimistic updates
 *
 * Use this pattern for feature-level state management.
 */

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, tap } from 'rxjs';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskListResponse } from '@nodeangularfullstack/shared';
import { environment } from '../../../environments/environment';

/**
 * State interfaces for type safety
 */
interface TasksState {
  tasks: Task[];
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface TaskFilters {
  status?: 'todo' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  search?: string;
}

interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

/**
 * Tasks State Management Service using Angular Signals
 */
@Injectable({ providedIn: 'root' })
export class TasksStateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  // Private signals for internal state
  private readonly _tasks = signal<Task[]>([]);
  private readonly _selectedTask = signal<Task | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _filters = signal<TaskFilters>({});
  private readonly _pagination = signal({
    page: 1,
    limit: 10,
    total: 0
  });
  private readonly _stats = signal<TaskStats>({
    total: 0,
    byStatus: {},
    byPriority: {}
  });

  // Public readonly signals
  readonly tasks = this._tasks.asReadonly();
  readonly selectedTask = this._selectedTask.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly stats = this._stats.asReadonly();

  // Computed signals for derived state
  readonly todoTasks = computed(() =>
    this._tasks().filter(task => task.status === 'todo')
  );

  readonly inProgressTasks = computed(() =>
    this._tasks().filter(task => task.status === 'in_progress')
  );

  readonly completedTasks = computed(() =>
    this._tasks().filter(task => task.status === 'completed')
  );

  readonly highPriorityTasks = computed(() =>
    this._tasks().filter(task => task.priority === 'high')
  );

  readonly overdueTasks = computed(() =>
    this._tasks().filter(task => new Date(task.dueDate) < new Date() && task.status !== 'completed')
  );

  readonly tasksGroupedByStatus = computed(() => {
    const tasks = this._tasks();
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      completed: tasks.filter(t => t.status === 'completed')
    };
  });

  readonly hasFiltersApplied = computed(() => {
    const filters = this._filters();
    return !!(filters.status || filters.priority || filters.assigneeId || filters.search);
  });

  readonly isFirstPage = computed(() => this._pagination().page === 1);
  readonly isLastPage = computed(() => {
    const { page, limit, total } = this._pagination();
    return page * limit >= total;
  });

  readonly taskProgress = computed(() => {
    const tasks = this._tasks();
    const total = tasks.length;
    if (total === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / total) * 100);
  });

  constructor() {
    // Effect to load stats whenever tasks change
    effect(() => {
      const tasks = this._tasks();
      if (tasks.length > 0) {
        this.updateStats(tasks);
      }
    });

    // Effect to clear error when loading starts
    effect(() => {
      if (this._loading()) {
        this._error.set(null);
      }
    });
  }

  /**
   * Load tasks with current filters and pagination.
   */
  loadTasks(): void {
    this.setLoading(true);

    const params = this.buildQueryParams();

    this.http.get<{ data: TaskListResponse }>(`${this.apiUrl}`, { params })
      .pipe(
        tap(response => {
          this._tasks.set(response.data.tasks);
          this._pagination.update(p => ({
            ...p,
            total: response.data.total,
            page: response.data.page,
            limit: response.data.limit
          }));
        }),
        catchError(this.handleError.bind(this)),
        finalize(() => this.setLoading(false))
      )
      .subscribe();
  }

  /**
   * Load a single task by ID.
   * @param id - Task ID
   */
  loadTask(id: string): void {
    this.setLoading(true);

    this.http.get<{ data: { task: Task } }>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => {
          this._selectedTask.set(response.data.task);
          // Also update the task in the list if it exists
          this.updateTaskInList(response.data.task);
        }),
        catchError(this.handleError.bind(this)),
        finalize(() => this.setLoading(false))
      )
      .subscribe();
  }

  /**
   * Create a new task.
   * @param taskData - Task creation data
   */
  createTask(taskData: CreateTaskRequest): void {
    this.setLoading(true);

    this.http.post<{ data: { task: Task } }>(`${this.apiUrl}`, taskData)
      .pipe(
        tap(response => {
          // Optimistic update: add to the beginning of the list
          this._tasks.update(tasks => [response.data.task, ...tasks]);
          this._pagination.update(p => ({ ...p, total: p.total + 1 }));
        }),
        catchError(this.handleError.bind(this)),
        finalize(() => this.setLoading(false))
      )
      .subscribe();
  }

  /**
   * Update an existing task.
   * @param id - Task ID
   * @param updateData - Task update data
   */
  updateTask(id: string, updateData: UpdateTaskRequest): void {
    // Optimistic update
    const originalTask = this._tasks().find(t => t.id === id);
    if (originalTask) {
      const optimisticTask = { ...originalTask, ...updateData, updatedAt: new Date() };
      this.updateTaskInList(optimisticTask);
    }

    this.http.put<{ data: { task: Task } }>(`${this.apiUrl}/${id}`, updateData)
      .pipe(
        tap(response => {
          // Update with server response
          this.updateTaskInList(response.data.task);
          if (this._selectedTask()?.id === id) {
            this._selectedTask.set(response.data.task);
          }
        }),
        catchError(error => {
          // Revert optimistic update on error
          if (originalTask) {
            this.updateTaskInList(originalTask);
          }
          return this.handleError(error);
        })
      )
      .subscribe();
  }

  /**
   * Delete a task.
   * @param id - Task ID
   */
  deleteTask(id: string): void {
    // Optimistic update: remove from list
    const originalTasks = this._tasks();
    this._tasks.update(tasks => tasks.filter(t => t.id !== id));
    this._pagination.update(p => ({ ...p, total: p.total - 1 }));

    this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => {
          if (this._selectedTask()?.id === id) {
            this._selectedTask.set(null);
          }
        }),
        catchError(error => {
          // Revert optimistic update on error
          this._tasks.set(originalTasks);
          this._pagination.update(p => ({ ...p, total: p.total + 1 }));
          return this.handleError(error);
        })
      )
      .subscribe();
  }

  /**
   * Update task status (common operation).
   * @param id - Task ID
   * @param status - New status
   */
  updateTaskStatus(id: string, status: 'todo' | 'in_progress' | 'completed'): void {
    this.updateTask(id, { status });
  }

  /**
   * Set filters and reload tasks.
   * @param filters - Filter criteria
   */
  setFilters(filters: Partial<TaskFilters>): void {
    this._filters.update(current => ({ ...current, ...filters }));
    this._pagination.update(p => ({ ...p, page: 1 })); // Reset to first page
    this.loadTasks();
  }

  /**
   * Clear all filters.
   */
  clearFilters(): void {
    this._filters.set({});
    this._pagination.update(p => ({ ...p, page: 1 }));
    this.loadTasks();
  }

  /**
   * Set pagination and reload tasks.
   * @param page - Page number
   * @param limit - Items per page
   */
  setPagination(page: number, limit?: number): void {
    this._pagination.update(p => ({
      ...p,
      page,
      ...(limit && { limit })
    }));
    this.loadTasks();
  }

  /**
   * Go to next page.
   */
  nextPage(): void {
    if (!this.isLastPage()) {
      this.setPagination(this._pagination().page + 1);
    }
  }

  /**
   * Go to previous page.
   */
  previousPage(): void {
    if (!this.isFirstPage()) {
      this.setPagination(this._pagination().page - 1);
    }
  }

  /**
   * Clear selected task.
   */
  clearSelectedTask(): void {
    this._selectedTask.set(null);
  }

  /**
   * Clear error state.
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh tasks (reload with current filters and pagination).
   */
  refresh(): void {
    this.loadTasks();
  }

  // Private helper methods

  private setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  private updateTaskInList(updatedTask: Task): void {
    this._tasks.update(tasks =>
      tasks.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
  }

  private updateStats(tasks: Task[]): void {
    const total = tasks.length;

    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    this._stats.set({ total, byStatus, byPriority });
  }

  private buildQueryParams(): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const { page, limit } = this._pagination();
    const filters = this._filters();

    params['page'] = page.toString();
    params['limit'] = limit.toString();

    if (filters.status) params['status'] = filters.status;
    if (filters.priority) params['priority'] = filters.priority;
    if (filters.assigneeId) params['assigneeId'] = filters.assigneeId;
    if (filters.search) params['search'] = filters.search;

    return params;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this._error.set(errorMessage);
    throw error;
  }
}

/**
 * Usage Example in Component:
 *
 * @Component({
 *   selector: 'app-task-list',
 *   standalone: true,
 *   template: `
 *     <div class="task-list">
 *       <!-- Loading state -->
 *       @if (tasksState.loading()) {
 *         <div class="loading">Loading tasks...</div>
 *       }
 *
 *       <!-- Error state -->
 *       @if (tasksState.error()) {
 *         <div class="error">
 *           Error: {{ tasksState.error() }}
 *           <button (click)="tasksState.clearError()">Clear</button>
 *         </div>
 *       }
 *
 *       <!-- Tasks display -->
 *       @for (task of tasksState.tasks(); track task.id) {
 *         <div class="task-item">
 *           <h3>{{ task.title }}</h3>
 *           <p>{{ task.description }}</p>
 *           <span class="status">{{ task.status }}</span>
 *           <button (click)="updateStatus(task.id, 'completed')">
 *             Mark Complete
 *           </button>
 *         </div>
 *       }
 *
 *       <!-- Progress indicator -->
 *       <div class="progress">
 *         Progress: {{ tasksState.taskProgress() }}%
 *       </div>
 *
 *       <!-- Pagination -->
 *       <div class="pagination">
 *         <button
 *           (click)="tasksState.previousPage()"
 *           [disabled]="tasksState.isFirstPage()">
 *           Previous
 *         </button>
 *         <span>Page {{ tasksState.pagination().page }}</span>
 *         <button
 *           (click)="tasksState.nextPage()"
 *           [disabled]="tasksState.isLastPage()">
 *           Next
 *         </button>
 *       </div>
 *     </div>
 *   `
 * })
 * export class TaskListComponent {
 *   readonly tasksState = inject(TasksStateService);
 *
 *   ngOnInit() {
 *     this.tasksState.loadTasks();
 *   }
 *
 *   updateStatus(id: string, status: string) {
 *     this.tasksState.updateTaskStatus(id, status as any);
 *   }
 * }
 */