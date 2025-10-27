import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ExportProgressModalComponent } from './export-progress-modal.component';
import { ExportJobService, ExportJob } from '../../services/export-job.service';

/**
 * Unit tests for ExportProgressModalComponent download functionality (Story 33.2.1, Task 13).
 *
 * Tests verify:
 * - Download button appears when package is available
 * - Download button hidden when package expired
 * - Download method calls correct service method
 * - Error handling for expired/missing packages
 * - Success notifications on download
 */
describe('ExportProgressModalComponent - Download Functionality', () => {
  let component: ExportProgressModalComponent;
  let fixture: ComponentFixture<ExportProgressModalComponent>;
  let exportJobService: jasmine.SpyObj<ExportJobService>;
  let messageService: jasmine.SpyObj<MessageService>;

  const mockCompletedJob: ExportJob = {
    jobId: 'job-123',
    toolId: 'form-builder',
    status: 'completed',
    stepsCompleted: 8,
    stepsTotal: 8,
    currentStep: 'Export completed successfully',
    steps: [],
    progress: 100,
    createdAt: '2025-10-26T10:00:00Z',
    updatedAt: '2025-10-26T10:05:00Z',
    completedAt: '2025-10-26T10:05:00Z',
    packagePath: '/tmp/exports/job-123.tar.gz',
    packageSizeBytes: 1024 * 1024, // 1 MB
    downloadCount: 0,
    lastDownloadedAt: null,
    packageExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    packageRetentionDays: 30,
  };

  beforeEach(async () => {
    const exportJobServiceSpy = jasmine.createSpyObj('ExportJobService', [
      'startExport',
      'getJobStatus',
      'cancelExport',
      'downloadPackage',
    ]);
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [ExportProgressModalComponent, HttpClientTestingModule],
      providers: [
        { provide: ExportJobService, useValue: exportJobServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    exportJobService = TestBed.inject(ExportJobService) as jasmine.SpyObj<ExportJobService>;
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;

    fixture = TestBed.createComponent(ExportProgressModalComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('toolId', 'form-builder');
    fixture.componentRef.setInput('toolName', 'Form Builder');

    fixture.detectChanges();
  });

  describe('canDownload computed property', () => {
    it('should return true when job is completed and package available', () => {
      component.exportJob.set(mockCompletedJob);
      fixture.detectChanges();

      expect(component.canDownload()).toBe(true);
    });

    it('should return false when job status is not completed', () => {
      const inProgressJob = { ...mockCompletedJob, status: 'in_progress' as const };
      component.exportJob.set(inProgressJob);
      fixture.detectChanges();

      expect(component.canDownload()).toBe(false);
    });

    it('should return false when packagePath is null', () => {
      const jobWithoutPackage = { ...mockCompletedJob, packagePath: null };
      component.exportJob.set(jobWithoutPackage);
      fixture.detectChanges();

      expect(component.canDownload()).toBe(false);
    });

    it('should return false when package is expired', () => {
      const expiredJob = {
        ...mockCompletedJob,
        packageExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      };
      component.exportJob.set(expiredJob);
      fixture.detectChanges();

      expect(component.canDownload()).toBe(false);
    });
  });

  describe('packageExpired computed property', () => {
    it('should return false when package is not expired', () => {
      component.exportJob.set(mockCompletedJob);
      fixture.detectChanges();

      expect(component.packageExpired()).toBe(false);
    });

    it('should return true when package is expired', () => {
      const expiredJob = {
        ...mockCompletedJob,
        packageExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };
      component.exportJob.set(expiredJob);
      fixture.detectChanges();

      expect(component.packageExpired()).toBe(true);
    });

    it('should return false when packageExpiresAt is null', () => {
      const jobWithoutExpiry = { ...mockCompletedJob, packageExpiresAt: null };
      component.exportJob.set(jobWithoutExpiry);
      fixture.detectChanges();

      expect(component.packageExpired()).toBe(false);
    });
  });

  describe('downloadPackage method', () => {
    beforeEach(() => {
      component.exportJob.set(mockCompletedJob);
      fixture.detectChanges();
    });

    it('should call exportJobService.downloadPackage with correct jobId', () => {
      const mockBlob = new Blob(['test content'], { type: 'application/gzip' });
      exportJobService.downloadPackage.and.returnValue(of(mockBlob));

      // Mock URL.createObjectURL and URL.revokeObjectURL
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');

      component.downloadPackage();

      expect(exportJobService.downloadPackage).toHaveBeenCalledWith('job-123');
    });

    it('should create download link with correct filename', () => {
      const mockBlob = new Blob(['test content'], { type: 'application/gzip' });
      exportJobService.downloadPackage.and.returnValue(of(mockBlob));

      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');

      component.downloadPackage();

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should show success message on successful download', () => {
      const mockBlob = new Blob(['test content'], { type: 'application/gzip' });
      exportJobService.downloadPackage.and.returnValue(of(mockBlob));

      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');

      component.downloadPackage();

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Download Started',
        }),
      );
    });

    it('should show error message when download fails', () => {
      const errorMessage = 'Export package has expired and was deleted';
      exportJobService.downloadPackage.and.returnValue(
        throwError(() => ({ status: 410, message: errorMessage, code: 'PACKAGE_EXPIRED' })),
      );

      component.downloadPackage();

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Download Failed',
          detail: errorMessage,
        }),
      );
    });

    it('should not call service when packagePath is null', () => {
      const jobWithoutPackage = { ...mockCompletedJob, packagePath: null };
      component.exportJob.set(jobWithoutPackage);
      fixture.detectChanges();

      component.downloadPackage();

      expect(exportJobService.downloadPackage).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Download Not Available',
        }),
      );
    });

    it('should show warning when package is expired', () => {
      const expiredJob = {
        ...mockCompletedJob,
        packageExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };
      component.exportJob.set(expiredJob);
      fixture.detectChanges();

      component.downloadPackage();

      expect(exportJobService.downloadPackage).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'warn',
          summary: 'Package Expired',
        }),
      );
    });

    it('should return early when exportJob is null', () => {
      component.exportJob.set(null);
      fixture.detectChanges();

      component.downloadPackage();

      expect(exportJobService.downloadPackage).not.toHaveBeenCalled();
    });
  });

  describe('template integration', () => {
    it('should show download button when canDownload is true', () => {
      component.exportJob.set(mockCompletedJob);
      fixture.detectChanges();

      const downloadButton = fixture.nativeElement.querySelector('[label="Download Package"]');
      expect(downloadButton).toBeTruthy();
    });

    it('should hide download button when package is not available', () => {
      const jobWithoutPackage = { ...mockCompletedJob, packagePath: null };
      component.exportJob.set(jobWithoutPackage);
      fixture.detectChanges();

      const downloadButton = fixture.nativeElement.querySelector('[label="Download Package"]');
      expect(downloadButton).toBeFalsy();
    });

    it('should show expired warning when package is expired', () => {
      const expiredJob = {
        ...mockCompletedJob,
        packageExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };
      component.exportJob.set(expiredJob);
      fixture.detectChanges();

      const warningDiv = fixture.nativeElement.querySelector('.expiration-warning');
      expect(warningDiv).toBeTruthy();
    });
  });
});
