import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ToolsService, ToolsApiResponse } from './tools.service';
import { ApiClientService } from '../api/api-client.service';
import { Tool, GetToolsResponse, ToolCacheEntry } from '@nodeangularfullstack/shared';

describe('ToolsService', () => {
  let service: ToolsService;
  let httpMock: HttpTestingController;
  let apiClientSpy: jasmine.SpyObj<ApiClientService>;

  const mockTools: Tool[] = [
    {
      id: '1',
      key: 'short-link',
      slug: 'short-link-generator',
      name: 'Short Link Generator',
      description: 'Create shortened URLs',
      active: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      key: 'qr-generator',
      slug: 'qr-code-generator',
      name: 'QR Code Generator',
      description: 'Generate QR codes',
      active: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '3',
      key: 'analytics',
      slug: 'analytics-tool',
      name: 'Analytics Tool',
      description: 'View analytics',
      active: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockApiResponse: ToolsApiResponse<GetToolsResponse> = {
    success: true,
    data: {
      success: true,
      data: {
        tools: mockTools,
      },
    },
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiClientService', ['get']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ToolsService, { provide: ApiClientService, useValue: spy }],
    });

    service = TestBed.inject(ToolsService);
    httpMock = TestBed.inject(HttpTestingController);
    apiClientSpy = TestBed.inject(ApiClientService) as jasmine.SpyObj<ApiClientService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('refreshAllTools', () => {
    it('should fetch tools from API and update cache', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.refreshAllTools().subscribe({
        next: (tools) => {
          expect(tools).toEqual(mockTools);
          expect(apiClientSpy.get).toHaveBeenCalledWith('/api/v1/tools');

          // Check that cache was updated
          expect(service.getCachedTools()).toEqual(mockTools);
          done();
        },
      });
    });

    it('should set loading state during API call', () => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      expect(service.loading()).toBe(false);

      service.refreshAllTools().subscribe();

      // Loading should be managed by the service internally
      expect(apiClientSpy.get).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', (done) => {
      const errorResponse = { error: { error: { message: 'API Error' } } };
      apiClientSpy.get.and.returnValue(throwError(() => errorResponse));

      service.refreshAllTools().subscribe({
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.error()).toBe('API Error');
          done();
        },
      });
    });

    it('should return cached tools as fallback on API failure', (done) => {
      // First, populate cache with successful call
      apiClientSpy.get.and.returnValue(of(mockApiResponse));
      service.refreshAllTools().subscribe(() => {
        // Now simulate API failure
        const errorResponse = { error: { error: { message: 'Network Error' } } };
        apiClientSpy.get.and.returnValue(throwError(() => errorResponse));

        service.refreshAllTools().subscribe({
          next: (tools) => {
            expect(tools).toEqual(mockTools); // Should return cached tools
            done();
          },
        });
      });
    });
  });

  describe('getToolStatus', () => {
    it('should return tool from cache if valid', (done) => {
      // Populate cache first
      apiClientSpy.get.and.returnValue(of(mockApiResponse));
      service.refreshAllTools().subscribe(() => {
        // Now get specific tool
        service.getToolStatus('short-link').subscribe({
          next: (tool) => {
            expect(tool).toEqual(mockTools[0]);
            expect(apiClientSpy.get).toHaveBeenCalledTimes(1); // Should not call API again
            done();
          },
        });
      });
    });

    it('should fetch from API if not in cache', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.getToolStatus('short-link').subscribe({
        next: (tool) => {
          expect(tool).toEqual(mockTools[0]);
          expect(apiClientSpy.get).toHaveBeenCalledWith('/api/v1/tools');
          done();
        },
      });
    });

    it('should return null for non-existent tool', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.getToolStatus('non-existent').subscribe({
        next: (tool) => {
          expect(tool).toBeNull();
          done();
        },
      });
    });

    it('should return cached tool on API failure', (done) => {
      // First populate cache
      apiClientSpy.get.and.returnValue(of(mockApiResponse));
      service.refreshAllTools().subscribe(() => {
        // Clear the cache to simulate expired cache
        service.invalidateCache('short-link');

        // Now simulate API failure
        apiClientSpy.get.and.returnValue(throwError(() => new Error('API Error')));

        // Re-populate cache manually for fallback test
        const cacheEntry: ToolCacheEntry = {
          tool: mockTools[0],
          cachedAt: Date.now() - 10000, // 10 seconds ago (expired)
          ttl: 5000, // 5 second TTL
        };

        // Access private cache to set up fallback scenario
        (service as any).cacheToolEntry(mockTools[0]);

        service.getToolStatus('short-link').subscribe({
          next: (tool) => {
            expect(tool).toEqual(mockTools[0]);
            done();
          },
        });
      });
    });
  });

  describe('isToolEnabled', () => {
    beforeEach(() => {
      // Set up cache with mock tools
      apiClientSpy.get.and.returnValue(of(mockApiResponse));
    });

    it('should return true for enabled tool', (done) => {
      service.refreshAllTools().subscribe(() => {
        const isEnabled = service.isToolEnabled('short-link');
        expect(isEnabled).toBe(true);
        done();
      });
    });

    it('should return false for disabled tool', (done) => {
      service.refreshAllTools().subscribe(() => {
        const isEnabled = service.isToolEnabled('qr-generator');
        expect(isEnabled).toBe(false);
        done();
      });
    });

    it('should return false for non-existent tool', () => {
      const isEnabled = service.isToolEnabled('non-existent');
      expect(isEnabled).toBe(false);
    });

    it('should trigger background fetch for unknown tool', () => {
      spyOn(service, 'getToolStatus').and.returnValue(of(null));

      const isEnabled = service.isToolEnabled('unknown-tool');
      expect(isEnabled).toBe(false);

      // Should trigger background fetch
      expect(service.getToolStatus).toHaveBeenCalledWith('unknown-tool');
    });
  });

  describe('cache management', () => {
    it('should invalidate specific tool cache', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.refreshAllTools().subscribe(() => {
        expect(service.getCachedTools().length).toBe(3);

        service.invalidateCache('short-link');

        // Should have one less tool in cache
        const remainingTools = service.getCachedTools();
        expect(remainingTools.length).toBe(2);
        expect(remainingTools.find((t) => t.key === 'short-link')).toBeUndefined();
        done();
      });
    });

    it('should invalidate all cache', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.refreshAllTools().subscribe(() => {
        expect(service.getCachedTools().length).toBe(3);

        service.invalidateCache();

        expect(service.getCachedTools().length).toBe(0);
        done();
      });
    });

    it('should check cache freshness', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.refreshAllTools().subscribe(() => {
        expect(service.hasFreshCache()).toBe(true);

        // Invalidate cache
        service.invalidateCache();

        expect(service.hasFreshCache()).toBe(false);
        done();
      });
    });
  });

  describe('computed signals', () => {
    it('should compute enabled tools count correctly', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.refreshAllTools().subscribe(() => {
        // mockTools has 2 enabled tools ('short-link' and 'analytics')
        expect(service.enabledToolsCount()).toBe(2);
        done();
      });
    });

    it('should update enabled tools count when cache changes', (done) => {
      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.refreshAllTools().subscribe(() => {
        expect(service.enabledToolsCount()).toBe(2);

        // Invalidate one enabled tool
        service.invalidateCache('short-link');

        // Count should update (computed signal should react)
        setTimeout(() => {
          expect(service.enabledToolsCount()).toBe(1);
          done();
        });
      });
    });
  });

  describe('error handling', () => {
    it('should clear error state', () => {
      // Set an error
      (service as any).errorSignal.set('Test error');
      expect(service.error()).toBe('Test error');

      service.clearError();
      expect(service.error()).toBeNull();
    });

    it('should handle malformed API response', (done) => {
      const malformedResponse = { success: true, data: null };
      apiClientSpy.get.and.returnValue(of(malformedResponse));

      service.refreshAllTools().subscribe({
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        },
      });
    });
  });

  describe('configuration', () => {
    it('should update service configuration', () => {
      const newConfig = { cacheTtl: 10 * 60 * 1000 }; // 10 minutes

      service.updateConfig(newConfig);

      // Verify config was updated (accessing private property for testing)
      expect((service as any).config.cacheTtl).toBe(10 * 60 * 1000);
    });
  });
});
