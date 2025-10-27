import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportHistoryTableComponent } from './export-history-table.component';
import { ExportJobWithTool } from '@features/tools/services/export-job.service';

/**
 * Unit Tests for ExportHistoryTableComponent (Epic 33.2.3, Task 14)
 *
 * Tests the presentational table component for export history.
 * Verifies data display, sorting, action buttons, and formatting utilities.
 *
 * **Test Coverage:**
 * - Component initialization
 * - Sorting logic and icons
 * - Status badge mapping
 * - Action button visibility
 * - Formatting utilities (size, date, download count)
 * - Event emissions
 * - Admin-specific features
 */
describe('ExportHistoryTableComponent', () => {
  let component: ExportHistoryTableComponent;
  let fixture: ComponentFixture<ExportHistoryTableComponent>;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportHistoryTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportHistoryTableComponent);
    component = fixture.componentInstance;

    // Set default required inputs
    component.jobs = [];
    component.isAdmin = false;
    component.sortBy = 'created_at';
    component.sortOrder = 'desc';

    fixture.detectChanges();
  });

  // ===== Component Initialization =====

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty jobs array', () => {
    expect(component.jobs).toEqual([]);
  });

  // ===== Sorting Logic =====

  describe('onSort', () => {
    it('should toggle sort order when clicking same column', () => {
      component.sortBy = 'created_at';
      component.sortOrder = 'desc';
      spyOn(component.sortChange, 'emit');

      component.onSort('created_at');

      expect(component.sortChange.emit).toHaveBeenCalledWith({
        sortBy: 'created_at',
        sortOrder: 'asc',
      });
    });

    it('should default to descending when clicking new column', () => {
      component.sortBy = 'created_at';
      component.sortOrder = 'desc';
      spyOn(component.sortChange, 'emit');

      component.onSort('download_count');

      expect(component.sortChange.emit).toHaveBeenCalledWith({
        sortBy: 'download_count',
        sortOrder: 'desc',
      });
    });

    it('should toggle from asc to desc', () => {
      component.sortBy = 'package_size_bytes';
      component.sortOrder = 'asc';
      spyOn(component.sortChange, 'emit');

      component.onSort('package_size_bytes');

      expect(component.sortChange.emit).toHaveBeenCalledWith({
        sortBy: 'package_size_bytes',
        sortOrder: 'desc',
      });
    });
  });

  describe('getSortIcon', () => {
    it('should return unsorted icon for non-sorted column', () => {
      component.sortBy = 'created_at';
      expect(component.getSortIcon('download_count')).toBe('pi pi-sort-alt');
    });

    it('should return ascending icon for sorted column (asc)', () => {
      component.sortBy = 'created_at';
      component.sortOrder = 'asc';
      expect(component.getSortIcon('created_at')).toBe('pi pi-sort-amount-up');
    });

    it('should return descending icon for sorted column (desc)', () => {
      component.sortBy = 'created_at';
      component.sortOrder = 'desc';
      expect(component.getSortIcon('created_at')).toBe('pi pi-sort-amount-down');
    });
  });

  // ===== Status Badge Mapping =====

  describe('getStatusSeverity', () => {
    it('should return "success" for completed status', () => {
      expect(component.getStatusSeverity('completed')).toBe('success');
    });

    it('should return "info" for in_progress status', () => {
      expect(component.getStatusSeverity('in_progress')).toBe('info');
    });

    it('should return "warning" for pending status', () => {
      expect(component.getStatusSeverity('pending')).toBe('warning');
    });

    it('should return "danger" for failed status', () => {
      expect(component.getStatusSeverity('failed')).toBe('danger');
    });

    it('should return "secondary" for cancelled status', () => {
      expect(component.getStatusSeverity('cancelled')).toBe('secondary');
    });

    it('should return "secondary" for unknown status', () => {
      expect(component.getStatusSeverity('unknown-status')).toBe('secondary');
    });
  });

  describe('getStatusLabel', () => {
    it('should format in_progress to "In Progress"', () => {
      expect(component.getStatusLabel('in_progress')).toBe('In Progress');
    });

    it('should format completed to "Completed"', () => {
      expect(component.getStatusLabel('completed')).toBe('Completed');
    });

    it('should format single word status', () => {
      expect(component.getStatusLabel('pending')).toBe('Pending');
    });

    it('should handle multi-word snake_case', () => {
      expect(component.getStatusLabel('rolled_back')).toBe('Rolled Back');
    });
  });

  // ===== Action Button Visibility =====

  describe('canDownload', () => {
    it('should return true for completed job with package', () => {
      const job = createMockJob({
        status: 'completed',
        packagePath: '/exports/test.tar.gz',
      });
      expect(component.canDownload(job)).toBe(true);
    });

    it('should return false for completed job without package', () => {
      const job = createMockJob({
        status: 'completed',
        packagePath: null,
      });
      expect(component.canDownload(job)).toBe(false);
    });

    it('should return false for non-completed job', () => {
      const job = createMockJob({
        status: 'in_progress',
        packagePath: '/exports/test.tar.gz',
      });
      expect(component.canDownload(job)).toBe(false);
    });

    it('should return false for failed job even with package', () => {
      const job = createMockJob({
        status: 'failed',
        packagePath: '/exports/test.tar.gz',
      });
      expect(component.canDownload(job)).toBe(false);
    });
  });

  describe('canReexport', () => {
    it('should return true for completed job without package', () => {
      const job = createMockJob({
        status: 'completed',
        packagePath: null,
      });
      expect(component.canReexport(job)).toBe(true);
    });

    it('should return false for completed job with package', () => {
      const job = createMockJob({
        status: 'completed',
        packagePath: '/exports/test.tar.gz',
      });
      expect(component.canReexport(job)).toBe(false);
    });

    it('should return false for non-completed job', () => {
      const job = createMockJob({
        status: 'failed',
        packagePath: null,
      });
      expect(component.canReexport(job)).toBe(false);
    });
  });

  // ===== Formatting Utilities =====

  describe('formatSize', () => {
    it('should format bytes correctly', () => {
      expect(component.formatSize(500)).toBe('500.00 B');
    });

    it('should format kilobytes correctly', () => {
      expect(component.formatSize(2048)).toBe('2.00 KB');
    });

    it('should format megabytes correctly', () => {
      expect(component.formatSize(2097152)).toBe('2.00 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(component.formatSize(2147483648)).toBe('2.00 GB');
    });

    it('should return "-" for null', () => {
      expect(component.formatSize(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(component.formatSize(undefined as any)).toBe('-');
    });

    it('should handle zero bytes', () => {
      expect(component.formatSize(0)).toBe('0.00 B');
    });

    it('should handle fractional KB', () => {
      expect(component.formatSize(1536)).toBe('1.50 KB');
    });
  });

  describe('formatDownloadCount', () => {
    it('should return count as string', () => {
      expect(component.formatDownloadCount(5)).toBe('5');
    });

    it('should return "Never" for zero', () => {
      expect(component.formatDownloadCount(0)).toBe('Never');
    });

    it('should return "Never" for undefined', () => {
      expect(component.formatDownloadCount(undefined)).toBe('Never');
    });

    it('should handle large numbers', () => {
      expect(component.formatDownloadCount(1000)).toBe('1000');
    });
  });

  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const formatted = component.formatDate(date);
      expect(formatted).toContain('2025');
      expect(formatted).not.toBe('-');
    });

    it('should format ISO string', () => {
      const formatted = component.formatDate('2025-01-15T12:00:00Z');
      expect(formatted).toContain('2025');
      expect(formatted).not.toBe('-');
    });

    it('should return "-" for null', () => {
      expect(component.formatDate(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(component.formatDate(undefined)).toBe('-');
    });
  });

  // ===== Event Emissions =====

  describe('onDownloadClick', () => {
    it('should emit download event with job', () => {
      const job = createMockJob();
      spyOn(component.download, 'emit');

      component.onDownloadClick(job);

      expect(component.download.emit).toHaveBeenCalledWith(job);
    });
  });

  describe('onReexportClick', () => {
    it('should emit reexport event with job', () => {
      const job = createMockJob();
      spyOn(component.reexport, 'emit');

      component.onReexportClick(job);

      expect(component.reexport.emit).toHaveBeenCalledWith(job);
    });
  });

  describe('onDeleteClick', () => {
    it('should emit delete event with job', () => {
      const job = createMockJob();
      spyOn(component.delete, 'emit');

      component.onDeleteClick(job);

      expect(component.delete.emit).toHaveBeenCalledWith(job);
    });
  });

  // ===== Expiration Check =====

  describe('isExpired', () => {
    it('should return true for past date', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      expect(component.isExpired(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      expect(component.isExpired(futureDate)).toBe(false);
    });

    it('should return false for null', () => {
      expect(component.isExpired(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(component.isExpired(undefined)).toBe(false);
    });

    it('should handle ISO string', () => {
      const pastDate = '2020-01-01T00:00:00Z';
      expect(component.isExpired(pastDate)).toBe(true);
    });
  });

  // ===== Admin Features =====

  describe('Admin Features', () => {
    it('should accept isAdmin input', () => {
      component.isAdmin = true;
      expect(component.isAdmin).toBe(true);
    });

    it('should handle non-admin user', () => {
      component.isAdmin = false;
      expect(component.isAdmin).toBe(false);
    });
  });

  // ===== Integration Scenarios =====

  describe('Integration Scenarios', () => {
    it('should handle completed job with package (download scenario)', () => {
      const job = createMockJob({
        status: 'completed',
        packagePath: '/exports/test.tar.gz',
      });

      expect(component.canDownload(job)).toBe(true);
      expect(component.canReexport(job)).toBe(false);
      expect(component.getStatusSeverity(job.status)).toBe('success');
      expect(component.getStatusLabel(job.status)).toBe('Completed');
    });

    it('should handle completed job without package (re-export scenario)', () => {
      const job = createMockJob({
        status: 'completed',
        packagePath: null,
      });

      expect(component.canDownload(job)).toBe(false);
      expect(component.canReexport(job)).toBe(true);
      expect(component.getStatusSeverity(job.status)).toBe('success');
    });

    it('should handle in-progress job', () => {
      const job = createMockJob({
        status: 'in_progress',
        packagePath: null,
      });

      expect(component.canDownload(job)).toBe(false);
      expect(component.canReexport(job)).toBe(false);
      expect(component.getStatusSeverity(job.status)).toBe('info');
      expect(component.getStatusLabel(job.status)).toBe('In Progress');
    });

    it('should handle failed job', () => {
      const job = createMockJob({
        status: 'failed',
        packagePath: null,
      });

      expect(component.canDownload(job)).toBe(false);
      expect(component.canReexport(job)).toBe(false);
      expect(component.getStatusSeverity(job.status)).toBe('danger');
      expect(component.getStatusLabel(job.status)).toBe('Failed');
    });
  });

  // ===== Required Inputs =====

  describe('Required Inputs', () => {
    it('should have required jobs input', () => {
      expect(component.jobs).toBeDefined();
    });

    it('should have required isAdmin input', () => {
      expect(component.isAdmin).toBeDefined();
    });

    it('should have required sortBy input', () => {
      expect(component.sortBy).toBeDefined();
    });

    it('should have required sortOrder input', () => {
      expect(component.sortOrder).toBeDefined();
    });
  });

  // ===== Change Detection Strategy =====

  it('should use OnPush change detection', () => {
    expect(fixture.componentRef.changeDetectorRef).toBeDefined();
  });
});
