import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToolsService } from './tools.service';
import { ApiClientService } from '@core/api/api-client.service';
import { Tool, UpdateToolStatusRequest, CreateToolRequest } from '@nodeangularfullstack/shared';

describe('ToolsService', () => {
  let service: ToolsService;
  let httpMock: HttpTestingController;

  const mockTool: Tool = {
    id: '1',
    key: 'short-link',
    name: 'Short Link Generator',
    description: 'Generate shortened URLs',
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockApiResponse = {
    success: true,
    data: { tools: [mockTool] },
    timestamp: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ToolsService, ApiClientService],
    });

    service = TestBed.inject(ToolsService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear cache before each test
    service.clearCache();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getTools', () => {
    it('should fetch tools successfully', () => {
      service.getTools().subscribe((tools) => {
        expect(tools).toEqual([mockTool]);
        expect(service.tools()).toEqual([mockTool]);
        expect(service.loading()).toBe(false);
        expect(service.hasTools()).toBe(true);
      });

      const req = httpMock.expectOne('/api/admin/tools');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should handle HTTP errors', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      service.getTools().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeDefined();
          expect(service.error()).toBe('Internal server error');
          expect(service.loading()).toBe(false);
        },
      });

      const req = httpMock.expectOne('/api/admin/tools');
      req.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should use cache for subsequent requests', () => {
      // First request
      service.getTools().subscribe();
      const req1 = httpMock.expectOne('/api/admin/tools');
      req1.flush(mockApiResponse);

      // Second request (should use cache)
      service.getTools().subscribe((tools) => {
        expect(tools).toEqual([mockTool]);
      });

      // No HTTP request should be made for cached data
      httpMock.expectNone('/api/admin/tools');
    });

    it('should force refresh when requested', () => {
      // First request
      service.getTools().subscribe();
      const req1 = httpMock.expectOne('/api/admin/tools');
      req1.flush(mockApiResponse);

      // Force refresh
      service.getTools(true).subscribe();
      const req2 = httpMock.expectOne('/api/admin/tools');
      req2.flush(mockApiResponse);
    });
  });

  describe('getActiveTools', () => {
    it('should fetch active tools successfully', () => {
      service.getActiveTools().subscribe((tools) => {
        expect(tools).toEqual([mockTool]);
      });

      const req = httpMock.expectOne('/api/admin/tools/active');
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should handle errors', () => {
      service.getActiveTools().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeDefined();
        },
      });

      const req = httpMock.expectOne('/api/admin/tools/active');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getToolByKey', () => {
    it('should fetch tool by key successfully', () => {
      const response = {
        success: true,
        data: { tool: mockTool },
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      service.getToolByKey('short-link').subscribe((tool) => {
        expect(tool).toEqual(mockTool);
      });

      const req = httpMock.expectOne('/api/admin/tools/short-link');
      expect(req.request.method).toBe('GET');
      req.flush(response);
    });

    it('should return null for 404 errors', () => {
      service.getToolByKey('nonexistent').subscribe((tool) => {
        expect(tool).toBeNull();
      });

      const req = httpMock.expectOne('/api/admin/tools/nonexistent');
      req.flush({}, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('updateToolStatus', () => {
    it('should update tool status with optimistic updates', () => {
      // Setup initial data
      service['toolsSignal'].set([mockTool]);

      const request: UpdateToolStatusRequest = { active: false };
      const updatedTool = { ...mockTool, active: false };
      const response = {
        success: true,
        data: { tool: updatedTool },
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      service.updateToolStatus('short-link', false).subscribe((tool) => {
        expect(tool).toEqual(updatedTool);
      });

      // Check optimistic update
      expect(service.tools()[0].active).toBe(false);

      const req = httpMock.expectOne('/api/admin/tools/short-link');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(request);
      req.flush(response);
    });

    it('should rollback optimistic update on error', () => {
      // Setup initial data
      service['toolsSignal'].set([mockTool]);

      service.updateToolStatus('short-link', false).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeDefined();
        },
      });

      const req = httpMock.expectOne('/api/admin/tools/short-link');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      // Should trigger rollback request
      const rollbackReq = httpMock.expectOne('/api/admin/tools');
      rollbackReq.flush(mockApiResponse);
    });
  });

  describe('createTool', () => {
    it('should create tool successfully', () => {
      const request: CreateToolRequest = {
        key: 'new-tool',
        name: 'New Tool',
        description: 'A new tool',
        active: true,
      };

      const newTool: Tool = {
        id: '2',
        ...request,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      const response = {
        success: true,
        data: { tool: newTool },
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      service.createTool(request).subscribe((tool) => {
        expect(tool).toEqual(newTool);
      });

      const req = httpMock.expectOne('/api/admin/tools');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(response);
    });

    it('should handle creation errors', () => {
      const request: CreateToolRequest = {
        key: 'existing-tool',
        name: 'Existing Tool',
        description: 'Tool that already exists',
      };

      service.createTool(request).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeDefined();
        },
      });

      const req = httpMock.expectOne('/api/admin/tools');
      req.flush({}, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('deleteTool', () => {
    it('should delete tool with optimistic update', () => {
      // Setup initial data
      service['toolsSignal'].set([mockTool]);

      const response = {
        success: true,
        message: 'Tool deleted successfully',
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      service.deleteTool('short-link').subscribe();

      // Check optimistic update (tool removed)
      expect(service.tools()).toEqual([]);

      const req = httpMock.expectOne('/api/admin/tools/short-link');
      expect(req.request.method).toBe('DELETE');
      req.flush(response);
    });

    it('should rollback optimistic update on error', () => {
      // Setup initial data
      service['toolsSignal'].set([mockTool]);

      service.deleteTool('short-link').subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error).toBeDefined();
        },
      });

      const req = httpMock.expectOne('/api/admin/tools/short-link');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      // Should trigger rollback request
      const rollbackReq = httpMock.expectOne('/api/admin/tools');
      rollbackReq.flush(mockApiResponse);
    });
  });

  describe('computed properties', () => {
    beforeEach(() => {
      const tools: Tool[] = [
        { ...mockTool, active: true },
        { ...mockTool, id: '2', key: 'inactive-tool', active: false },
      ];
      service['toolsSignal'].set(tools);
    });

    it('should compute active tools correctly', () => {
      expect(service.activeTools()).toHaveLength(1);
      expect(service.activeTools()[0].active).toBe(true);
    });

    it('should compute inactive tools correctly', () => {
      expect(service.inactiveTools()).toHaveLength(1);
      expect(service.inactiveTools()[0].active).toBe(false);
    });

    it('should compute hasTools correctly', () => {
      expect(service.hasTools()).toBe(true);

      service['toolsSignal'].set([]);
      expect(service.hasTools()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should clear error state', () => {
      service['errorSignal'].set('Test error');
      expect(service.error()).toBe('Test error');

      service.clearError();
      expect(service.error()).toBeNull();
    });

    it('should get current error', () => {
      service['errorSignal'].set('Test error');
      expect(service.getCurrentError()).toBe('Test error');

      service['errorSignal'].set(null);
      expect(service.getCurrentError()).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should clear cache manually', () => {
      service['cacheTimestamp'].set(Date.now());
      expect(service['cacheTimestamp']()).toBeGreaterThan(0);

      service.clearCache();
      expect(service['cacheTimestamp']()).toBe(0);
    });

    it('should refresh data', () => {
      service.refresh().subscribe();

      const req = httpMock.expectOne('/api/admin/tools');
      req.flush(mockApiResponse);
    });
  });
});
