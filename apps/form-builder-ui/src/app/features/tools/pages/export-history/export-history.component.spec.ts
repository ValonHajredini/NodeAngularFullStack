import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportHistoryComponent } from './export-history.component';
import { ExportJobService, ExportJobWithTool } from '@features/tools/services/export-job.service';
import { AuthService } from '@core/auth/auth.service';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

/**
 * Unit Tests for ExportHistoryComponent (Epic 33.2.3, Task 14)
 *
 * Tests the container component for export history.
 * Verifies state management, service integration, and coordination of child components.
 *
 * **Test Coverage:**
 * - Component initialization and data loading
 * - Pagination (page changes, page size changes)
 * - Filtering (status, tool type, date range)
 * - Sorting (by different columns)
 * - Actions (re-download, re-export, delete)
 * - Admin vs. regular user permissions
 * - Error handling
 * - Signal state management
 * - Computed signals
 */
describe('ExportHistoryComponent', () => {
  let component: ExportHistoryComponent;
  let fixture: ComponentFixture<ExportHistoryComponent>;
  let exportJobService: jasmine.SpyObj<ExportJobService>;
  let authService: jasmine.SpyObj<AuthService>;
  let messageService: jasmine.SpyObj<MessageService>;

  // Test data helpers
  const createMockJob = (overrides?: Partial<ExportJobWithTool>): ExportJobWithTool => ({
    jobId: 'job-123',
    toolId: 'tool-456',
    toolName: 'Test Form Builder',
    toolType: 'form-builder',
    toolDescription: 'A test tool',
    userId: 'user-789',
    status: 'completed',
    stepsCompleted: 8,
    stepsTotal: 8,
    currentStep: null,
    progressPercentage: 100,
    packagePath: '/exports/job-123.tar.gz',
    packageSizeBytes: 1024000,
    downloadCount: 5,
    lastDownloadedAt: new Date('2025-01-15T12:00:00Z'),
    packageExpiresAt: new Date('2025-02-15T12:00:00Z'),
    packageRetentionDays: 30,
    packageChecksum: 'abc123',
    packageAlgorithm: 'sha256',
    checksumVerifiedAt: new Date('2025-01-15T10:00:00Z'),
    errorMessage: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T12:00:00Z'),
    startedAt: new Date('2025-01-15T10:05:00Z'),
    completedAt: new Date('2025-01-15T12:00:00Z'),
    ...overrides,
  });

  const mockListResponse = {
    jobs: [createMockJob(), createMockJob({ jobId: 'job-456' })],
    total: 2,
    limit: 20,
    offset: 0,
  };

  beforeEach(async () => {
    // Create service spies
    exportJobService = jasmine.createSpyObj('ExportJobService', [
      'listExportJobs',
      'downloadPackage',
      'startExport',
      'deleteExportJob',
    ]);
    authService = jasmine.createSpyObj('AuthService', ['user']);
    messageService = jasmine.createSpyObj('MessageService', ['add']);

    // Default service behavior
    exportJobService.listExportJobs.and.returnValue(of(mockListResponse));
    authService.user.and.returnValue({ role: 'user' } as any);

    await TestBed.configureTestingModule({
      imports: [ExportHistoryComponent],
      providers: [
        { provide: ExportJobService, useValue: exportJobService },
        { provide: AuthService, useValue: authService },
        { provide: MessageService, useValue: messageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportHistoryComponent);
    component = fixture.componentInstance;
  });

  // ===== Component Initialization =====

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load export history on init', () => {
    fixture.detectChanges(); // Triggers ngOnInit

    expect(exportJobService.listExportJobs).toHaveBeenCalled();
    expect(component.jobs()).toEqual(mockListResponse.jobs);
    expect(component.totalCount()).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('should initialize with default state', () => {
    expect(component.jobs()).toEqual([]);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.totalCount()).toBe(0);
    expect(component.currentPage()).toBe(1);
    expect(component.pageSize()).toBe(20);
  });

  it('should initialize with default filter state', () => {
    expect(component.statusFilter()).toBeNull();
    expect(component.toolTypeFilter()).toBeNull();
    expect(component.startDate()).toBeNull();
    expect(component.endDate()).toBeNull();
  });

  it('should initialize with default sort state', () => {
    expect(component.sortBy()).toBe('created_at');
    expect(component.sortOrder()).toBe('desc');
  });

  // ===== Data Loading =====

  describe('loadExportHistory', () => {
    it('should set loading state while fetching', () => {
      exportJobService.listExportJobs.and.returnValue(of(mockListResponse).pipe());

      component['loadExportHistory']();

      expect(component.loading()).toBe(true);
    });

    it('should update jobs and totalCount on success', () => {
      fixture.detectChanges();

      expect(component.jobs()).toEqual(mockListResponse.jobs);
      expect(component.totalCount()).toBe(2);
      expect(component.loading()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('should handle errors gracefully', () => {
      const error = new Error('Network error');
      exportJobService.listExportJobs.and.returnValue(throwError(() => error));

      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(component.error()).toBe('Network error');
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Load Failed',
        }),
      );
    });

    it('should pass correct options to service', () => {
      component.currentPage.set(2);
      component.pageSize.set(50);
      component.sortBy.set('download_count');
      component.sortOrder.set('asc');
      component.statusFilter.set('completed');

      component['loadExportHistory']();

      expect(exportJobService.listExportJobs).toHaveBeenCalledWith(
        jasmine.objectContaining({
          limit: 50,
          offset: 50, // page 2 with size 50
          sortBy: 'download_count',
          sortOrder: 'asc',
          statusFilter: 'completed',
        }),
      );
    });
  });

  // ===== Pagination =====

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges(); // Load initial data
    });

    it('should handle page change', () => {
      component.onPageChange(2);

      expect(component.currentPage()).toBe(2);
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2); // Init + page change
    });

    it('should handle page size change', () => {
      component.onPageSizeChange(50);

      expect(component.pageSize()).toBe(50);
      expect(component.currentPage()).toBe(1); // Reset to page 1
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2);
    });

    it('should calculate total pages correctly', () => {
      component.totalCount.set(100);
      component.pageSize.set(20);

      expect(component.totalPages()).toBe(5);
    });

    it('should handle partial last page', () => {
      component.totalCount.set(95);
      component.pageSize.set(20);

      expect(component.totalPages()).toBe(5); // Math.ceil(95 / 20) = 5
    });
  });

  // ===== Filtering =====

  describe('Filtering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle status filter change', () => {
      component.onFilterChange({ status: 'completed' });

      expect(component.statusFilter()).toBe('completed');
      expect(component.currentPage()).toBe(1); // Reset to page 1
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2);
    });

    it('should handle tool type filter change', () => {
      component.onFilterChange({ toolType: 'form-builder' });

      expect(component.toolTypeFilter()).toBe('form-builder');
      expect(component.currentPage()).toBe(1);
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2);
    });

    it('should handle date range filter change', () => {
      const startDate = '2025-01-01T00:00:00.000Z';
      const endDate = '2025-12-31T23:59:59.999Z';

      component.onFilterChange({ startDate, endDate });

      expect(component.startDate()).toBe(startDate);
      expect(component.endDate()).toBe(endDate);
      expect(component.currentPage()).toBe(1);
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple filter changes', () => {
      component.onFilterChange({
        status: 'completed',
        toolType: 'form-builder',
      });

      expect(component.statusFilter()).toBe('completed');
      expect(component.toolTypeFilter()).toBe('form-builder');
    });

    it('should clear all filters', () => {
      // Set filters
      component.statusFilter.set('completed');
      component.toolTypeFilter.set('form-builder');
      component.startDate.set('2025-01-01T00:00:00.000Z');
      component.endDate.set('2025-12-31T23:59:59.999Z');

      // Clear
      component.onClearFilters();

      expect(component.statusFilter()).toBeNull();
      expect(component.toolTypeFilter()).toBeNull();
      expect(component.startDate()).toBeNull();
      expect(component.endDate()).toBeNull();
      expect(component.currentPage()).toBe(1);
    });

    it('should detect active filters correctly', () => {
      expect(component.hasActiveFilters()).toBe(false);

      component.statusFilter.set('completed');
      expect(component.hasActiveFilters()).toBe(true);

      component.onClearFilters();
      expect(component.hasActiveFilters()).toBe(false);
    });
  });

  // ===== Sorting =====

  describe('Sorting', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle sort change', () => {
      component.onSortChange({
        sortBy: 'download_count',
        sortOrder: 'asc',
      });

      expect(component.sortBy()).toBe('download_count');
      expect(component.sortOrder()).toBe('asc');
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2);
    });

    it('should support all sort fields', () => {
      const fields: Array<'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes'> =
        ['created_at', 'completed_at', 'download_count', 'package_size_bytes'];

      fields.forEach((field) => {
        component.onSortChange({ sortBy: field, sortOrder: 'desc' });
        expect(component.sortBy()).toBe(field);
      });
    });
  });

  // ===== Re-download Action =====

  describe('onRedownload', () => {
    let job: ExportJobWithTool;
    let mockBlob: Blob;

    beforeEach(() => {
      fixture.detectChanges();
      job = createMockJob();
      mockBlob = new Blob(['test data'], { type: 'application/gzip' });
      exportJobService.downloadPackage.and.returnValue(of(mockBlob));

      // Mock DOM methods
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(window.URL, 'revokeObjectURL');
      spyOn(document, 'createElement').and.returnValue({
        click: jasmine.createSpy('click'),
      } as any);
    });

    it('should download package successfully', () => {
      component.onRedownload(job);

      expect(exportJobService.downloadPackage).toHaveBeenCalledWith('job-123');
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Download Started',
        }),
      );
    });

    it('should handle download errors', () => {
      const error = new Error('Download failed');
      exportJobService.downloadPackage.and.returnValue(throwError(() => error));

      component.onRedownload(job);

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Download Failed',
        }),
      );
    });
  });

  // ===== Re-export Action =====

  describe('onReexport', () => {
    let job: ExportJobWithTool;
    let newJob: ExportJobWithTool;

    beforeEach(() => {
      fixture.detectChanges();
      job = createMockJob();
      newJob = createMockJob({ jobId: 'new-job-789' });
      exportJobService.startExport.and.returnValue(of(newJob));
    });

    it('should start re-export successfully', () => {
      component.onReexport(job);

      expect(exportJobService.startExport).toHaveBeenCalledWith('tool-456');
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Export Started',
        }),
      );
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2); // Init + refresh
    });

    it('should handle re-export errors', () => {
      const error = new Error('Export failed');
      exportJobService.startExport.and.returnValue(throwError(() => error));

      component.onReexport(job);

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Export Failed',
        }),
      );
    });
  });

  // ===== Delete Action =====

  describe('onDelete', () => {
    let job: ExportJobWithTool;

    beforeEach(() => {
      fixture.detectChanges();
      job = createMockJob();
      exportJobService.deleteExportJob.and.returnValue(of(void 0));
    });

    it('should delete job when admin', () => {
      authService.user.and.returnValue({ role: 'admin' } as any);
      fixture.detectChanges();

      component.onDelete(job);

      expect(exportJobService.deleteExportJob).toHaveBeenCalledWith('job-123');
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Job Deleted',
        }),
      );
      expect(exportJobService.listExportJobs).toHaveBeenCalledTimes(2); // Init + refresh
    });

    it('should block delete when non-admin', () => {
      authService.user.and.returnValue({ role: 'user' } as any);
      fixture.detectChanges();

      component.onDelete(job);

      expect(exportJobService.deleteExportJob).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'warn',
          summary: 'Permission Denied',
        }),
      );
    });

    it('should handle delete errors', () => {
      authService.user.and.returnValue({ role: 'admin' } as any);
      fixture.detectChanges();

      const error = new Error('Delete failed');
      exportJobService.deleteExportJob.and.returnValue(throwError(() => error));

      component.onDelete(job);

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Delete Failed',
        }),
      );
    });
  });

  // ===== Refresh =====

  describe('onRefresh', () => {
    it('should reload data without changing filters', () => {
      fixture.detectChanges();
      component.statusFilter.set('completed');
      component.currentPage.set(2);

      const callCount = exportJobService.listExportJobs.calls.count();
      component.onRefresh();

      expect(exportJobService.listExportJobs.calls.count()).toBe(callCount + 1);
      expect(component.statusFilter()).toBe('completed');
      expect(component.currentPage()).toBe(2); // Page not reset
    });
  });

  // ===== Computed Signals =====

  describe('Computed Signals', () => {
    it('should compute isAdmin from auth service', () => {
      authService.user.and.returnValue({ role: 'admin' } as any);
      fixture.detectChanges();
      expect(component.isAdmin()).toBe(true);

      authService.user.and.returnValue({ role: 'user' } as any);
      fixture.detectChanges();
      expect(component.isAdmin()).toBe(false);
    });

    it('should compute hasJobs correctly', () => {
      component.jobs.set([]);
      expect(component.hasJobs()).toBe(false);

      component.jobs.set([createMockJob()]);
      expect(component.hasJobs()).toBe(true);
    });

    it('should compute totalPages correctly', () => {
      component.totalCount.set(0);
      component.pageSize.set(20);
      expect(component.totalPages()).toBe(0);

      component.totalCount.set(100);
      component.pageSize.set(20);
      expect(component.totalPages()).toBe(5);

      component.totalCount.set(95);
      component.pageSize.set(20);
      expect(component.totalPages()).toBe(5); // Rounds up
    });

    it('should compute hasActiveFilters correctly', () => {
      expect(component.hasActiveFilters()).toBe(false);

      component.statusFilter.set('completed');
      expect(component.hasActiveFilters()).toBe(true);

      component.statusFilter.set(null);
      component.toolTypeFilter.set('form-builder');
      expect(component.hasActiveFilters()).toBe(true);
    });
  });

  // ===== Error Handling =====

  describe('Error Handling', () => {
    it('should display error message on load failure', () => {
      const error = new Error('Failed to load');
      exportJobService.listExportJobs.and.returnValue(throwError(() => error));

      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load');
      expect(component.loading()).toBe(false);
    });

    it('should handle error without message', () => {
      exportJobService.listExportJobs.and.returnValue(throwError(() => ({ message: undefined })));

      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load export history');
    });
  });

  // ===== State Management =====

  describe('State Management', () => {
    it('should maintain state across multiple operations', () => {
      fixture.detectChanges();

      // Change page
      component.onPageChange(2);
      expect(component.currentPage()).toBe(2);

      // Apply filter
      component.onFilterChange({ status: 'completed' });
      expect(component.currentPage()).toBe(1); // Reset by filter
      expect(component.statusFilter()).toBe('completed');

      // Change sort
      component.onSortChange({ sortBy: 'download_count', sortOrder: 'asc' });
      expect(component.sortBy()).toBe('download_count');
      expect(component.currentPage()).toBe(1); // Still on page 1
    });
  });
});
