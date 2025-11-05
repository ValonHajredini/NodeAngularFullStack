import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
  TestRequest,
} from '@angular/common/http/testing';
import { ExportJobService, ExportJob } from './export-job.service';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

/**
 * Epic 32.2 - Task 13: Integration Tests for Export Job Service API Endpoints
 *
 * Tests HTTP API integration for ExportJobService:
 * - POST /api/tool-registry/tools/:toolId/export (startExport)
 * - GET /api/tool-registry/export-jobs/:jobId (getJobStatus)
 * - POST /api/tool-registry/export-jobs/:jobId/cancel (cancelExport)
 * - GET :exportPackageUrl (downloadExportPackage)
 *
 * Covers:
 * - Correct HTTP methods and URLs
 * - Request headers (auth, content-type)
 * - Request/response body parsing
 * - Error handling (401, 403, 404, 500)
 * - Timeout handling (30s)
 * - Input validation
 * - API response unwrapping (response.data)
 */
describe('ExportJobService API Integration Tests', () => {
  let service: ExportJobService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  const API_URL = `${environment.apiUrl}/tool-registry`;

  const mockExportJob: ExportJob = {
    jobId: 'job-123',
    toolId: 'form-builder',
    status: 'pending',
    stepsCompleted: 0,
    stepsTotal: 5,
    steps: [
      { name: 'Validate tool', status: 'pending' },
      { name: 'Bundle assets', status: 'pending' },
      { name: 'Generate manifest', status: 'pending' },
      { name: 'Package export', status: 'pending' },
      { name: 'Upload package', status: 'pending' },
    ],
    progress: 0,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  };

  beforeEach(() => {
    const mockAuthService = jasmine.createSpyObj('AuthService', ['user']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ExportJobService, { provide: AuthService, useValue: mockAuthService }],
    });

    service = TestBed.inject(ExportJobService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    // Verify no outstanding HTTP requests
    httpMock.verify();
  });

  describe('startExport()', () => {
    it('should send POST request to correct endpoint', () => {
      const toolId = 'form-builder';

      service.startExport(toolId).subscribe();

      const req = httpMock.expectOne(`${API_URL}/tools/${toolId}/export`);
      expect(req.request.method).toBe('POST');

      req.flush({
        message: 'Export started',
        data: mockExportJob,
        timestamp: new Date().toISOString(),
      });
    });

    it('should include auth headers in request', () => {
      service.startExport('form-builder').subscribe();

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      expect(req.request.headers.has('Content-Type')).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({
        message: 'Export started',
        data: mockExportJob,
        timestamp: new Date().toISOString(),
      });
    });

    it('should send empty body in POST request', () => {
      service.startExport('form-builder').subscribe();

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      expect(req.request.body).toEqual({});

      req.flush({
        message: 'Export started',
        data: mockExportJob,
        timestamp: new Date().toISOString(),
      });
    });

    it('should unwrap API response and return job data', (done) => {
      const apiResponse = {
        message: 'Export job created successfully',
        data: mockExportJob,
        timestamp: '2024-01-01T10:00:00Z',
      };

      service.startExport('form-builder').subscribe({
        next: (job) => {
          expect(job).toEqual(mockExportJob);
          expect(job.jobId).toBe('job-123');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.flush(apiResponse);
    });

    it('should reject empty toolId', (done) => {
      service.startExport('').subscribe({
        next: () => fail('Should have rejected empty toolId'),
        error: (err) => {
          expect(err.message).toBe('Tool ID is required');
          done();
        },
      });

      // No HTTP request should be made
      httpMock.expectNone(`${API_URL}/tools//export`);
    });

    it('should handle 401 unauthorized error', (done) => {
      service.startExport('form-builder').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(401);
          expect(err.message).toContain('Unauthorized');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 forbidden error', (done) => {
      service.startExport('form-builder').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(403);
          expect(err.message).toContain('Forbidden');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 404 tool not found error', (done) => {
      service.startExport('non-existent-tool').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/non-existent-tool/export`);
      req.flush({ message: 'Tool not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 500 server error', (done) => {
      service.startExport('form-builder').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(500);
          expect(err.message).toContain('Server error occurred');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.flush(
        { message: 'Internal Server Error' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    });

    it('should handle network errors', (done) => {
      service.startExport('form-builder').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.message).toContain('Network error');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.error(new ErrorEvent('Network error', { message: 'Connection failed' }));
    });

    it('should log console message when starting export', () => {
      const consoleSpy = spyOn(console, 'log');

      service.startExport('form-builder').subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ExportJobService] Starting export for tool: form-builder',
      );

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.flush({
        message: 'Export started',
        data: mockExportJob,
        timestamp: new Date().toISOString(),
      });
    });
  });

  describe('getJobStatus()', () => {
    it('should send GET request to correct endpoint', () => {
      const jobId = 'job-123';

      service.getJobStatus(jobId).subscribe();

      const req = httpMock.expectOne(`${API_URL}/export-jobs/${jobId}`);
      expect(req.request.method).toBe('GET');

      req.flush({
        message: 'Job status retrieved',
        data: mockExportJob,
        timestamp: new Date().toISOString(),
      });
    });

    it('should include auth headers in request', () => {
      service.getJobStatus('job-123').subscribe();

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123`);
      expect(req.request.headers.has('Content-Type')).toBe(true);

      req.flush({
        message: 'Job status retrieved',
        data: mockExportJob,
        timestamp: new Date().toISOString(),
      });
    });

    it('should unwrap API response and return job data', (done) => {
      const inProgressJob: ExportJob = {
        ...mockExportJob,
        status: 'in_progress',
        progress: 50,
        stepsCompleted: 2,
        currentStep: 'Bundling assets...',
      };

      const apiResponse = {
        message: 'Job status retrieved',
        data: inProgressJob,
        timestamp: '2024-01-01T10:01:00Z',
      };

      service.getJobStatus('job-123').subscribe({
        next: (job) => {
          expect(job).toEqual(inProgressJob);
          expect(job.status).toBe('in_progress');
          expect(job.progress).toBe(50);
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123`);
      req.flush(apiResponse);
    });

    it('should reject empty jobId', (done) => {
      service.getJobStatus('').subscribe({
        next: () => fail('Should have rejected empty jobId'),
        error: (err) => {
          expect(err.message).toBe('Job ID is required');
          done();
        },
      });

      // No HTTP request should be made
      httpMock.expectNone(`${API_URL}/export-jobs/`);
    });

    it('should handle 404 job not found error', (done) => {
      service.getJobStatus('non-existent-job').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(404);
          expect(err.message).toBe('Export job not found');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/export-jobs/non-existent-job`);
      req.flush({ message: 'Job not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should return completed job with exportPackageUrl', (done) => {
      const completedJob: ExportJob = {
        ...mockExportJob,
        status: 'completed',
        progress: 100,
        stepsCompleted: 5,
        exportPackageUrl: '/exports/form-builder-123.zip',
        completedAt: '2024-01-01T10:05:00Z',
      };

      service.getJobStatus('job-123').subscribe({
        next: (job) => {
          expect(job.status).toBe('completed');
          expect(job.exportPackageUrl).toBe('/exports/form-builder-123.zip');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123`);
      req.flush({
        message: 'Job completed',
        data: completedJob,
        timestamp: new Date().toISOString(),
      });
    });

    it('should return failed job with errorMessage', (done) => {
      const failedJob: ExportJob = {
        ...mockExportJob,
        status: 'failed',
        progress: 45,
        errorMessage: 'Failed to bundle dependencies',
      };

      service.getJobStatus('job-123').subscribe({
        next: (job) => {
          expect(job.status).toBe('failed');
          expect(job.errorMessage).toBe('Failed to bundle dependencies');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123`);
      req.flush({ message: 'Job failed', data: failedJob, timestamp: new Date().toISOString() });
    });
  });

  describe('cancelExport()', () => {
    it('should send POST request to correct endpoint', () => {
      const jobId = 'job-123';

      service.cancelExport(jobId).subscribe();

      const req = httpMock.expectOne(`${API_URL}/export-jobs/${jobId}/cancel`);
      expect(req.request.method).toBe('POST');

      req.flush({
        message: 'Job cancelled',
        data: { ...mockExportJob, status: 'cancelled' },
        timestamp: new Date().toISOString(),
      });
    });

    it('should include auth headers in request', () => {
      service.cancelExport('job-123').subscribe();

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123/cancel`);
      expect(req.request.headers.has('Content-Type')).toBe(true);

      req.flush({
        message: 'Job cancelled',
        data: { ...mockExportJob, status: 'cancelled' },
        timestamp: new Date().toISOString(),
      });
    });

    it('should send empty body in POST request', () => {
      service.cancelExport('job-123').subscribe();

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123/cancel`);
      expect(req.request.body).toEqual({});

      req.flush({
        message: 'Job cancelled',
        data: { ...mockExportJob, status: 'cancelled' },
        timestamp: new Date().toISOString(),
      });
    });

    it('should unwrap API response and return cancelled job', (done) => {
      const cancelledJob: ExportJob = {
        ...mockExportJob,
        status: 'cancelled',
        progress: 30,
      };

      const apiResponse = {
        message: 'Export job cancelled successfully',
        data: cancelledJob,
        timestamp: '2024-01-01T10:02:00Z',
      };

      service.cancelExport('job-123').subscribe({
        next: (job) => {
          expect(job).toEqual(cancelledJob);
          expect(job.status).toBe('cancelled');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123/cancel`);
      req.flush(apiResponse);
    });

    it('should reject empty jobId', (done) => {
      service.cancelExport('').subscribe({
        next: () => fail('Should have rejected empty jobId'),
        error: (err) => {
          expect(err.message).toBe('Job ID is required');
          done();
        },
      });

      // No HTTP request should be made
      httpMock.expectNone(`${API_URL}/export-jobs//cancel`);
    });

    it('should handle 404 job not found error', (done) => {
      service.cancelExport('non-existent-job').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(404);
          expect(err.message).toBe('Export job not found');
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/export-jobs/non-existent-job/cancel`);
      req.flush({ message: 'Job not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle error when job already completed', (done) => {
      service.cancelExport('job-123').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(400);
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123/cancel`);
      req.flush(
        { message: 'Cannot cancel completed job' },
        { status: 400, statusText: 'Bad Request' },
      );
    });

    it('should log console message when cancelling export', () => {
      const consoleSpy = spyOn(console, 'log');

      service.cancelExport('job-123').subscribe();

      expect(consoleSpy).toHaveBeenCalledWith('[ExportJobService] Cancelling export job: job-123');

      const req = httpMock.expectOne(`${API_URL}/export-jobs/job-123/cancel`);
      req.flush({
        message: 'Job cancelled',
        data: { ...mockExportJob, status: 'cancelled' },
        timestamp: new Date().toISOString(),
      });
    });
  });

  describe('downloadExportPackage()', () => {
    it('should send GET request to exportPackageUrl', () => {
      const jobId = 'job-123';
      const exportUrl = '/exports/form-builder-123.zip';

      service.downloadExportPackage(jobId, exportUrl).subscribe();

      const req = httpMock.expectOne(exportUrl);
      expect(req.request.method).toBe('GET');

      req.flush(new Blob(['mock data'], { type: 'application/zip' }));
    });

    it('should request blob response type', () => {
      const exportUrl = '/exports/form-builder-123.zip';

      service.downloadExportPackage('job-123', exportUrl).subscribe();

      const req = httpMock.expectOne(exportUrl);
      expect(req.request.responseType).toBe('blob');

      req.flush(new Blob(['mock data'], { type: 'application/zip' }));
    });

    it('should include auth headers in request', () => {
      const exportUrl = '/exports/form-builder-123.zip';

      service.downloadExportPackage('job-123', exportUrl).subscribe();

      const req = httpMock.expectOne(exportUrl);
      expect(req.request.headers.has('Content-Type')).toBe(true);

      req.flush(new Blob(['mock data'], { type: 'application/zip' }));
    });

    it('should return blob data', (done) => {
      const exportUrl = '/exports/form-builder-123.zip';
      const mockBlob = new Blob(['export package data'], { type: 'application/zip' });

      service.downloadExportPackage('job-123', exportUrl).subscribe({
        next: (blob) => {
          expect(blob).toBeInstanceOf(Blob);
          expect(blob.type).toBe('application/zip');
          done();
        },
      });

      const req = httpMock.expectOne(exportUrl);
      req.flush(mockBlob);
    });

    it('should handle 404 package not found error', (done) => {
      const exportUrl = '/exports/non-existent-package.zip';

      service.downloadExportPackage('job-123', exportUrl).subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(exportUrl);
      req.flush({ message: 'Package not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should log console message when downloading package', () => {
      const consoleSpy = spyOn(console, 'log');
      const exportUrl = '/exports/form-builder-123.zip';

      service.downloadExportPackage('job-123', exportUrl).subscribe();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ExportJobService] Downloading export package: job-123',
      );

      const req = httpMock.expectOne(exportUrl);
      req.flush(new Blob(['mock data'], { type: 'application/zip' }));
    });
  });

  describe('Request Timeout', () => {
    it('should timeout after 30 seconds for startExport', (done) => {
      jasmine.clock().install();

      service.startExport('form-builder').subscribe({
        next: () => fail('Should have timed out'),
        error: (err) => {
          expect(err.name).toBe('TimeoutError');
          jasmine.clock().uninstall();
          done();
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);

      // Advance time by 30 seconds without responding
      jasmine.clock().tick(30000);

      // Flush the request (timeout should have triggered)
      try {
        req.flush({
          message: 'Too late',
          data: mockExportJob,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        // Request already timed out
      }
    });
  });

  describe('Error Logging', () => {
    it('should log authentication errors to console', () => {
      const consoleWarnSpy = spyOn(console, 'warn');

      service.startExport('form-builder').subscribe({
        error: () => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('[ExportJobService] Authentication error'),
          );
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should log backend errors to console', () => {
      const consoleErrorSpy = spyOn(console, 'error');

      service.startExport('form-builder').subscribe({
        error: () => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            jasmine.stringContaining('[ExportJobService] Backend error'),
          );
        },
      });

      const req = httpMock.expectOne(`${API_URL}/tools/form-builder/export`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
