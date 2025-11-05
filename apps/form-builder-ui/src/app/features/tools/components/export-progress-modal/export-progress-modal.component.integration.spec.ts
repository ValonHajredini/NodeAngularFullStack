import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ExportProgressModalComponent } from './export-progress-modal.component';
import { ExportJobService, ExportJob } from '../../services/export-job.service';

/**
 * Epic 32.2 - Task 8: Integration Tests for Export Progress Polling
 *
 * Tests polling behavior in ExportProgressModalComponent:
 * - Polling starts when export job is initiated
 * - Polling interval is 2 seconds (2000ms)
 * - Polling stops when job completes/fails/cancelled
 * - State updates during polling cycle
 * - Cleanup on component destroy (no memory leaks)
 * - Error handling during polling
 * - Progress percentage updates
 * - Status message updates
 */
describe('ExportProgressModalComponent Polling Integration Tests', () => {
  let component: ExportProgressModalComponent;
  let fixture: ComponentFixture<ExportProgressModalComponent>;
  let exportJobService: jest.Mocked<ExportJobService>;
  let messageService: jest.Mocked<MessageService>;
  let confirmationService: jest.Mocked<ConfirmationService>;

  const mockPendingJob: ExportJob = {
    jobId: 'job-123',
    toolId: 'form-builder',
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInProgressJob: ExportJob = {
    jobId: 'job-123',
    toolId: 'form-builder',
    status: 'in_progress',
    progress: 50,
    currentStep: 'Bundling assets...',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCompletedJob: ExportJob = {
    jobId: 'job-123',
    toolId: 'form-builder',
    status: 'completed',
    progress: 100,
    currentStep: 'Export complete',
    exportPackageUrl: '/exports/form-builder-123.zip',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
  };

  const mockFailedJob: ExportJob = {
    jobId: 'job-123',
    toolId: 'form-builder',
    status: 'failed',
    progress: 45,
    errorMessage: 'Failed to bundle dependencies',
    createdAt: new Date(),
    updatedAt: new Date(),
    failedAt: new Date(),
  };

  const mockCancelledJob: ExportJob = {
    jobId: 'job-123',
    toolId: 'form-builder',
    status: 'cancelled',
    progress: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Create service mocks
    const mockExportJobService = {
      startExport: jest.fn(),
      getJobStatus: jest.fn(),
      cancelExport: jest.fn(),
      downloadExportPackage: jest.fn(),
    };

    const mockMessageService = {
      add: jest.fn(),
    };

    const mockConfirmationService = {
      confirm: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [ExportProgressModalComponent],
      providers: [
        { provide: ExportJobService, useValue: mockExportJobService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    });

    exportJobService = TestBed.inject(ExportJobService) as jest.Mocked<ExportJobService>;
    messageService = TestBed.inject(MessageService) as jest.Mocked<MessageService>;
    confirmationService = TestBed.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
  });

  describe('Polling Initiation', () => {
    it('should start polling after export job is created', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(of(mockInProgressJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      // Set required inputs using signal setters
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      // Trigger export
      component.open();
      tick();

      // Verify export started
      expect(exportJobService.startExport).toHaveBeenCalledWith('form-builder');

      // Fast-forward to first poll (2 seconds)
      tick(2000);

      // Verify polling started
      expect(exportJobService.getJobStatus).toHaveBeenCalledWith('job-123');

      flush();
    }));

    it('should not start polling if export job creation fails', fakeAsync(() => {
      const error = new Error('Failed to create export job');
      exportJobService.startExport.mockReturnValue(throwError(() => error));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // Wait for polling interval
      tick(2000);

      // Verify no polling occurred
      expect(exportJobService.getJobStatus).not.toHaveBeenCalled();
      expect(component.error()).toBeTruthy();

      flush();
    }));
  });

  describe('Polling Interval', () => {
    it('should poll every 2 seconds (2000ms)', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));

      // Return in_progress jobs for first 3 polls, then completed
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockInProgressJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of({ ...mockInProgressJob, progress: 70 }));
      exportJobService.getJobStatus.mockReturnValueOnce(of({ ...mockInProgressJob, progress: 90 }));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockCompletedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // First poll at 2 seconds
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(1);

      // Second poll at 4 seconds
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(2);

      // Third poll at 6 seconds
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(3);

      // Fourth poll at 8 seconds (completes)
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(4);

      flush();
    }));
  });

  describe('Polling Stops on Completion', () => {
    it('should stop polling when job status is completed', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockInProgressJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockCompletedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // First poll (in_progress)
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(1);

      // Second poll (completed)
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(2);
      expect(component.exportJob()?.status).toBe('completed');

      // Wait another interval - should NOT poll again
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(2); // Still 2

      flush();
    }));

    it('should emit exportCompleted event when job completes', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(of(mockCompletedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      const completedSpy = jest.fn();
      component.exportCompleted.subscribe(completedSpy);

      fixture.detectChanges();

      component.open();
      tick();

      // Poll completes
      tick(2000);

      expect(completedSpy).toHaveBeenCalledWith(mockCompletedJob);

      flush();
    }));
  });

  describe('Polling Stops on Failure', () => {
    it('should stop polling when job status is failed', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockInProgressJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockFailedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // First poll (in_progress)
      tick(2000);

      // Second poll (failed)
      tick(2000);
      expect(component.exportJob()?.status).toBe('failed');

      // Wait another interval - should NOT poll again
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(2);

      flush();
    }));

    it('should emit exportFailed event when job fails', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(of(mockFailedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      const failedSpy = jest.fn();
      component.exportFailed.subscribe(failedSpy);

      fixture.detectChanges();

      component.open();
      tick();

      // Poll fails
      tick(2000);

      expect(failedSpy).toHaveBeenCalledWith('Failed to bundle dependencies');

      flush();
    }));
  });

  describe('Polling Stops on Cancellation', () => {
    it('should stop polling when job status is cancelled', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockInProgressJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockCancelledJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // First poll (in_progress)
      tick(2000);

      // Second poll (cancelled)
      tick(2000);
      expect(component.exportJob()?.status).toBe('cancelled');

      // Wait another interval - should NOT poll again
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(2);

      flush();
    }));
  });

  describe('State Updates During Polling', () => {
    it('should update progress signal during polling', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of({ ...mockInProgressJob, progress: 25 }));
      exportJobService.getJobStatus.mockReturnValueOnce(of({ ...mockInProgressJob, progress: 50 }));
      exportJobService.getJobStatus.mockReturnValueOnce(of({ ...mockInProgressJob, progress: 75 }));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockCompletedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // Poll 1 - 25%
      tick(2000);
      expect(component.progress()).toBe(25);

      // Poll 2 - 50%
      tick(2000);
      expect(component.progress()).toBe(50);

      // Poll 3 - 75%
      tick(2000);
      expect(component.progress()).toBe(75);

      // Poll 4 - 100%
      tick(2000);
      expect(component.progress()).toBe(100);

      flush();
    }));

    it('should update statusMessage signal during polling', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValueOnce(
        of({ ...mockInProgressJob, currentStep: 'Analyzing dependencies...' }),
      );
      exportJobService.getJobStatus.mockReturnValueOnce(
        of({ ...mockInProgressJob, currentStep: 'Bundling assets...' }),
      );
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockCompletedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // Poll 1
      tick(2000);
      expect(component.statusMessage()).toBe('Analyzing dependencies...');

      // Poll 2
      tick(2000);
      expect(component.statusMessage()).toBe('Bundling assets...');

      // Poll 3 (completed)
      tick(2000);
      expect(component.statusMessage()).toBe('Export completed successfully!');

      flush();
    }));

    it('should update isCompleted computed signal', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockInProgressJob));
      exportJobService.getJobStatus.mockReturnValueOnce(of(mockCompletedJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // Before completion
      tick(2000);
      expect(component.isCompleted()).toBe(false);

      // After completion
      tick(2000);
      expect(component.isCompleted()).toBe(true);

      flush();
    }));
  });

  describe('Polling Error Handling', () => {
    it('should handle polling errors gracefully', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(throwError(() => new Error('Network error')));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // First poll (error)
      tick(2000);

      // Verify error state set
      expect(component.error()).toBe('Failed to fetch export status');

      flush();
    }));

    it('should log polling errors to console', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(throwError(() => new Error('Polling error')));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // Poll with error
      tick(2000);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExportProgressModal] Polling error:'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
      flush();
    }));
  });

  describe('Component Cleanup', () => {
    it('should stop polling on component destroy', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(of(mockInProgressJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // First poll
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(1);

      // Destroy component
      fixture.destroy();

      // Wait for next polling interval - should NOT poll
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(1); // Still 1

      flush();
    }));

    it('should not leak subscriptions after destroy', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(of(mockInProgressJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // Verify polling started
      tick(2000);

      // Destroy component
      fixture.destroy();

      // Try to trigger more polls - should do nothing
      tick(10000);

      // Should only have 1 poll from before destroy
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(1);

      flush();
    }));

    it('should clean up destroy$ subject on ngOnDestroy', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(of(mockInProgressJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // Spy on destroy$ subject
      const destroySpy = jest.spyOn(component['destroy$'], 'complete');

      // Destroy component
      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();

      flush();
    }));
  });

  describe('Manual Polling Control', () => {
    it('should stop polling when close() is called', fakeAsync(() => {
      exportJobService.startExport.mockReturnValue(of(mockPendingJob));
      exportJobService.getJobStatus.mockReturnValue(of(mockInProgressJob));

      fixture = TestBed.createComponent(ExportProgressModalComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('toolId', 'form-builder');
      fixture.componentRef.setInput('toolName', 'Form Builder');

      fixture.detectChanges();

      component.open();
      tick();

      // First poll
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(1);

      // Close modal
      component.close();

      // Wait for next polling interval - should NOT poll
      tick(2000);
      expect(exportJobService.getJobStatus).toHaveBeenCalledTimes(1);

      flush();
    }));
  });
});
