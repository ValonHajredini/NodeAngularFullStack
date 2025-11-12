import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

/**
 * Page size option interface for dropdown.
 */
interface PageSizeOption {
  label: string;
  value: number;
}

/**
 * Export Pagination Component (Epic 33.2.3, Task 8)
 *
 * Presentational component for pagination controls.
 * Provides UI for navigating between pages and changing page size.
 *
 * **Design Pattern: Presentational Component**
 * - No business logic or state management
 * - Pure data binding and event emission
 * - Receives pagination state via @Input()
 * - Emits navigation actions via @Output()
 * - OnPush change detection for optimal performance
 *
 * **Pagination Controls:**
 * - First page button (skip to page 1)
 * - Previous page button
 * - Current page display (e.g., "Page 3 of 10")
 * - Next page button
 * - Last page button
 * - Page size dropdown (10, 20, 50, 100 items per page)
 * - Total count display
 *
 * @example
 * ```html
 * <app-export-pagination
 *   [currentPage]="currentPage()"
 *   [totalPages]="totalPages()"
 *   [pageSize]="pageSize()"
 *   [totalCount]="totalCount()"
 *   (pageChange)="onPageChange($event)"
 *   (pageSizeChange)="onPageSizeChange($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-export-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
  templateUrl: './export-pagination.component.html',
  styleUrls: ['./export-pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPaginationComponent {
  /**
   * Current page number (1-indexed).
   * Passed from parent container component.
   */
  @Input({ required: true }) currentPage = 1;

  /**
   * Total number of pages.
   * Calculated by parent based on total count and page size.
   */
  @Input({ required: true }) totalPages = 1;

  /**
   * Number of items per page.
   * Default: 20 items.
   */
  @Input({ required: true }) pageSize = 20;

  /**
   * Total count of items across all pages.
   * Used for display purposes.
   */
  @Input({ required: true }) totalCount = 0;

  /**
   * Emitted when user navigates to a different page.
   * Parent container handles API call with new page offset.
   */
  @Output() pageChange = new EventEmitter<number>();

  /**
   * Emitted when user changes page size.
   * Parent container resets to page 1 and fetches with new page size.
   */
  @Output() pageSizeChange = new EventEmitter<number>();

  /**
   * Available page size options for dropdown.
   */
  pageSizeOptions: PageSizeOption[] = [
    { label: '10 per page', value: 10 },
    { label: '20 per page', value: 20 },
    { label: '50 per page', value: 50 },
    { label: '100 per page', value: 100 },
  ];

  /**
   * Navigate to first page.
   */
  goToFirstPage(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(1);
    }
  }

  /**
   * Navigate to previous page.
   */
  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  /**
   * Navigate to next page.
   */
  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  /**
   * Navigate to last page.
   */
  goToLastPage(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.totalPages);
    }
  }

  /**
   * Handle page size dropdown change.
   * Emits pageSizeChange event with new page size.
   *
   * @param size - New page size value
   */
  onPageSizeChange(size: number): void {
    this.pageSizeChange.emit(size);
  }

  /**
   * Check if on first page.
   * Used to disable first/previous buttons.
   */
  isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  /**
   * Check if on last page.
   * Used to disable next/last buttons.
   */
  isLastPage(): boolean {
    return this.currentPage >= this.totalPages;
  }

  /**
   * Get range of items currently displayed.
   * Example: "1-20 of 150"
   */
  getItemRange(): string {
    if (this.totalCount === 0) {
      return '0 items';
    }

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalCount);
    return `${start}-${end} of ${this.totalCount}`;
  }
}
