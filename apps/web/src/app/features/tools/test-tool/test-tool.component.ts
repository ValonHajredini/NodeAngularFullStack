import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TestToolService } from './services/test-tool.service';
import { TestToolRecord } from '@nodeangularfullstack/shared';

/**
 * Test Tool Component
 *
 * A test tool for integration testing
 *
 * Features:
 * - Signal-based reactive state management
 * - Loading state with spinner indicator
 * - Error handling with user-friendly messages
 * - Responsive grid layout (mobile/tablet/desktop)
 * - Empty state handling
 *
 * @example
 * ```html
 * <app-test-tool></app-test-tool>
 * ```
 */
@Component({
  selector: 'app-test-tool',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule,
    MessageModule,
    ButtonModule,
    CardModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './test-tool.component.html',
  styleUrls: ['./test-tool.component.css'],
})
export class TestToolComponent implements OnInit, OnDestroy {
  /** Loading state signal - true while fetching data */
  loading = signal<boolean>(false);

  /** Error message signal - null when no errors */
  error = signal<string | null>(null);

  /** Data items signal - array of Test Tool records */
  items = signal<TestToolRecord[]>([]);

  /** Subscription holder for cleanup */
  private subscriptions = new Subscription();

  /**
   * Constructor with dependency injection.
   * @param testToolService - Service for Test Tool data operations
   * @param messageService - PrimeNG service for toast notifications
   */
  constructor(
    private testToolService: TestToolService,
    private messageService: MessageService,
  ) {}

  /**
   * Component initialization lifecycle hook.
   * Loads initial data on component mount.
   */
  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Component cleanup lifecycle hook.
   * Unsubscribes from all active subscriptions to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load Test Tool data from backend API.
   * Updates loading, error, and items signals based on response.
   *
   * @private
   */
  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const sub = this.testToolService.getAll().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
        console.log('Test Tool data loaded:', data.length, 'items');
      },
      error: (err) => {
        const errorMessage = err.message || 'Failed to load test tool data';
        this.error.set(errorMessage);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
        });
        console.error('Test Tool loading error:', err);
      },
    });

    this.subscriptions.add(sub);
  }

  /**
   * Handle create button click.
   * TODO: Implement create functionality.
   */
  onCreate(): void {
    console.log('Create test tool clicked');
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Create functionality coming soon',
    });
  }

  /**
   * Handle edit button click for specific item.
   * TODO: Implement edit functionality.
   *
   * @param item - The Test Tool record to edit
   */
  onEdit(item: TestToolRecord): void {
    console.log('Edit test tool:', item.id);
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: `Edit ${item.name || 'item'} - coming soon`,
    });
  }

  /**
   * Handle delete button click for specific item.
   * TODO: Implement delete confirmation and functionality.
   *
   * @param item - The Test Tool record to delete
   */
  onDelete(item: TestToolRecord): void {
    console.log('Delete test tool:', item.id);
    this.messageService.add({
      severity: 'warn',
      summary: 'Warning',
      detail: `Delete ${item.name || 'item'} - coming soon`,
    });
  }

  /**
   * Retry loading data after error.
   */
  onRetry(): void {
    this.loadData();
  }
}
