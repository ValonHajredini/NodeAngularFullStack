import { Component, OnDestroy, signal, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { interval, Subscription, Subject } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { ExportJobService, ExportJob } from '../../services/export-job.service';

/**
 * Export Progress Modal Component (Epic 32.2.4)
 *
 * Displays real-time export progress with polling:
 * - Progress bar (0-100%)
 * - Step list with status icons
 * - Polling every 2 seconds
 * - Cancel with confirmation
 * - Success/error states
 *
 * **Usage:**
 * ```html
 * <app-export-progress-modal
 *   [visible]="showModal"
 *   [toolId]="selectedToolId"
 *   [toolName]="selectedToolName"
 *   (visibleChange)="showModal = $event"
 *   (exportCompleted)="onExportCompleted($event)"
 * />
 * ```
 *
 * **Polling Strategy:**
 * - Starts automatically when modal opens
 * - Polls every 2000ms (2 seconds)
 * - Stops when job completes/fails/cancelled
 * - Cleans up on component destroy
 */
@Component({
  selector: 'app-export-progress-modal',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ProgressBarModule,
    ButtonModule,
    MessageModule,
    DividerModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './export-progress-modal.component.html',
  styleUrl: './export-progress-modal.component.scss',
})
export class ExportProgressModalComponent implements OnDestroy {
  private readonly exportJobService = inject(ExportJobService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Inputs
  readonly visible = input.required<boolean>();
  readonly toolId = input.required<string>();
  readonly toolName = input.required<string>();

  // Outputs
  readonly visibleChange = output<boolean>();
  readonly exportCompleted = output<ExportJob>();
  readonly exportFailed = output<string>();

  // Component state signals
  readonly exportJob = signal<ExportJob | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Polling management
  private pollingSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();

  // Computed properties
  readonly modalTitle = computed(() => `Exporting ${this.toolName()}`);

  readonly progress = computed(() => {
    const job = this.exportJob();
    if (!job) return 0;
    return job.progress || 0;
  });

  readonly progressText = computed(() => `${this.progress()}%`);

  readonly isCompleted = computed(() => {
    const job = this.exportJob();
    return job?.status === 'completed';
  });

  readonly isFailed = computed(() => {
    const job = this.exportJob();
    return job?.status === 'failed';
  });

  readonly isCancelled = computed(() => {
    const job = this.exportJob();
    return job?.status === 'cancelled';
  });

  readonly isInProgress = computed(() => {
    const job = this.exportJob();
    return job?.status === 'in_progress' || job?.status === 'pending';
  });

  readonly canCancel = computed(() => this.isInProgress());

  readonly statusMessage = computed(() => {
    const job = this.exportJob();
    if (!job) return 'Preparing export...';

    switch (job.status) {
      case 'pending':
        return 'Starting export...';
      case 'in_progress':
        return job.currentStep || 'Processing...';
      case 'completed':
        return 'Export completed successfully!';
      case 'failed':
        return job.errorMessage || 'Export failed. Please try again.';
      case 'cancelled':
        return 'Export cancelled';
      default:
        return 'Processing...';
    }
  });

  readonly statusIcon = computed(() => {
    const job = this.exportJob();
    if (!job) return 'pi-spin pi-spinner';

    switch (job.status) {
      case 'completed':
        return 'pi-check-circle';
      case 'failed':
        return 'pi-times-circle';
      case 'cancelled':
        return 'pi-ban';
      default:
        return 'pi-spin pi-spinner';
    }
  });

  /**
   * Opens the modal and starts the export job.
   */
  open(): void {
    if (!this.toolId()) {
      console.error('[ExportProgressModal] No toolId provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.exportJob.set(null);

    // Start export job
    this.exportJobService.startExport(this.toolId()).subscribe({
      next: (job) => {
        console.log('[ExportProgressModal] Export job started:', job.jobId);
        this.exportJob.set(job);
        this.loading.set(false);
        this.startPolling(job.jobId);
      },
      error: (err) => {
        console.error('[ExportProgressModal] Failed to start export:', err);
        this.error.set(err.message || 'Failed to start export. Please try again.');
        this.loading.set(false);
        this.exportFailed.emit(this.error()!);
      },
    });
  }

  /**
   * Starts polling for job status updates.
   */
  private startPolling(jobId: string): void {
    console.log('[ExportProgressModal] Starting polling for job:', jobId);

    // Poll every 2 seconds
    this.pollingSubscription = interval(2000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.exportJobService.getJobStatus(jobId)),
        catchError((err) => {
          console.error('[ExportProgressModal] Polling error:', err);
          this.error.set('Failed to fetch export status');
          return [];
        }),
      )
      .subscribe({
        next: (job) => {
          this.exportJob.set(job);

          // Stop polling when job is no longer in progress
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            this.stopPolling();

            if (job.status === 'completed') {
              this.exportCompleted.emit(job);
              this.messageService.add({
                severity: 'success',
                summary: 'Export Complete',
                detail: 'Tool export package is ready for download',
                life: 5000,
              });
            } else if (job.status === 'failed') {
              this.exportFailed.emit(job.errorMessage || 'Export failed');
            }
          }
        },
      });
  }

  /**
   * Stops polling for job status.
   */
  private stopPolling(): void {
    if (this.pollingSubscription) {
      console.log('[ExportProgressModal] Stopping polling');
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  /**
   * Handles cancel export request with confirmation.
   */
  requestCancel(): void {
    const job = this.exportJob();
    if (!job) return;

    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel this export? This action cannot be undone.',
      header: 'Cancel Export',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Cancel',
      rejectLabel: 'No, Continue',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.cancelExport(job.jobId);
      },
    });
  }

  /**
   * Cancels the export job.
   */
  private cancelExport(jobId: string): void {
    console.log('[ExportProgressModal] Cancelling export:', jobId);

    this.exportJobService.cancelExport(jobId).subscribe({
      next: (job) => {
        this.exportJob.set(job);
        this.stopPolling();
        this.messageService.add({
          severity: 'info',
          summary: 'Export Cancelled',
          detail: 'The export operation has been cancelled',
          life: 3000,
        });
      },
      error: (err) => {
        console.error('[ExportProgressModal] Failed to cancel export:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Cancellation Failed',
          detail: 'Failed to cancel export. Please try again.',
          life: 5000,
        });
      },
    });
  }

  /**
   * Downloads the export package.
   */
  downloadPackage(): void {
    const job = this.exportJob();
    if (!job || !job.exportPackageUrl) {
      console.error('[ExportProgressModal] No export package URL available');
      return;
    }

    console.log('[ExportProgressModal] Downloading export package');

    this.exportJobService.downloadExportPackage(job.jobId, job.exportPackageUrl).subscribe({
      next: (blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.toolId()}-export-${Date.now()}.zip`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Download Started',
          detail: 'Export package download started',
          life: 3000,
        });
      },
      error: (err) => {
        console.error('[ExportProgressModal] Download failed:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: 'Failed to download export package',
          life: 5000,
        });
      },
    });
  }

  /**
   * Closes the modal.
   */
  close(): void {
    this.stopPolling();
    this.visibleChange.emit(false);
  }

  /**
   * Cleanup on component destroy.
   */
  ngOnDestroy(): void {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Gets the icon for a step status.
   */
  getStepIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'pi-check-circle text-green-600';
      case 'in_progress':
        return 'pi-spin pi-spinner text-blue-600';
      case 'failed':
        return 'pi-times-circle text-red-600';
      default:
        return 'pi-circle text-gray-400';
    }
  }
}
