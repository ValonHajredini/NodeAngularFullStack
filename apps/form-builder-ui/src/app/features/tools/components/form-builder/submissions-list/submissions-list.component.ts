import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

/**
 * Component for displaying and managing form submissions.
 * Shows submissions in a paginated table with CSV export functionality.
 */
@Component({
  selector: 'app-submissions-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, CardModule, ProgressSpinnerModule],
  templateUrl: './submissions-list.component.html',
  styleUrls: ['./submissions-list.component.scss'],
})
export class SubmissionsListComponent implements OnInit, OnDestroy {
  formId = '';
  submissions: any[] = [];
  loading = true;
  error: string | null = null;
  totalRecords = 0;
  rows = 10;
  first = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.formId = this.route.snapshot.paramMap.get('id') || '';
    if (this.formId) {
      this.loadSubmissions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads submissions from the API
   */
  loadSubmissions(page = 1): void {
    this.loading = true;
    this.error = null;

    this.http
      .get<any>(`${environment.apiUrl}/forms/${this.formId}/submissions`, {
        params: { page: page.toString(), limit: this.rows.toString() },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.submissions = response.data || [];
          this.totalRecords = response.pagination?.total || 0;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to load submissions';
          this.loading = false;
        },
      });
  }

  /**
   * Handles pagination changes
   */
  onPageChange(event: any): void {
    const page = Math.floor(event.first / event.rows) + 1;
    this.first = event.first;
    this.rows = event.rows;
    this.loadSubmissions(page);
  }

  /**
   * Exports submissions as CSV
   */
  exportCSV(): void {
    window.location.href = `${environment.apiUrl}/forms/${this.formId}/submissions/export`;
  }

  /**
   * Formats a date for display
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Truncates long text for table display
   */
  truncate(text: string, length = 100): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  /**
   * Gets field values from submission as string
   */
  getFieldValues(submission: any): string {
    if (!submission.values_json) return '';
    const values = Object.values(submission.values_json || {});
    return values.slice(0, 3).join(', ');
  }
}
