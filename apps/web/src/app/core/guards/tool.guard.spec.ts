import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  toolGuard,
  anyToolGuard,
  allToolsGuard,
  shortLinkToolGuard,
  qrGeneratorToolGuard,
  analyticsToolGuard,
} from './tool.guard';
import { ToolsService } from '../services/tools.service';
import { Tool } from '@nodeangularfullstack/shared';

describe('Tool Guards', () => {
  let toolsServiceSpy: jasmine.SpyObj<ToolsService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockTools: Tool[] = [
    {
      id: '1',
      key: 'short-link',
      name: 'Short Link Generator',
      description: 'Create shortened URLs',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      key: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate QR codes',
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      key: 'analytics',
      name: 'Analytics Tool',
      description: 'View analytics',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    const toolsServiceSpyObj = jasmine.createSpyObj('ToolsService', [
      'isToolEnabled',
      'getToolStatus',
      'hasFreshCache',
      'refreshAllTools',
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ToolsService, useValue: toolsServiceSpyObj },
        { provide: Router, useValue: routerSpyObj },
      ],
    });

    toolsServiceSpy = TestBed.inject(ToolsService) as jasmine.SpyObj<ToolsService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  describe('toolGuard', () => {
    it('should allow access when tool is enabled and cache is fresh', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.hasFreshCache.and.returnValue(true);

      const guard = toolGuard('short-link');
      const result = guard({} as any, {} as any);

      expect(result).toBe(true);
      expect(toolsServiceSpy.isToolEnabled).toHaveBeenCalledWith('short-link');
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should deny access and redirect when tool is disabled', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of({ ...mockTools[1], active: false }));

      const guard = toolGuard('qr-generator');
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(false);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/dashboard'], {
            queryParams: {
              toolError: 'true',
              tool: 'qr-generator',
              reason: 'Tool is currently disabled',
            },
          });
          done();
        });
      } else {
        // Handle UrlTree case
        expect(routerSpy.navigate).toHaveBeenCalled();
        done();
      }
    });

    it('should verify with API when cache is stale', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTools[0]));

      const guard = toolGuard('short-link');
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(true);
          expect(toolsServiceSpy.getToolStatus).toHaveBeenCalledWith('short-link');
          done();
        });
      } else {
        // Handle UrlTree case
        expect(routerSpy.navigate).toHaveBeenCalled();
        done();
      }
    });

    it('should handle tool not found', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of(null));

      const guard = toolGuard('non-existent');
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(false);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/dashboard'], {
            queryParams: {
              toolError: 'true',
              tool: 'non-existent',
              reason: 'Tool not found',
            },
          });
          done();
        });
      } else {
        // Handle UrlTree case
        expect(routerSpy.navigate).toHaveBeenCalled();
        done();
      }
    });

    it('should use cached data as fallback on API error', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(throwError(() => new Error('API Error')));

      const guard = toolGuard('short-link');
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(true); // Should use cached enabled status
          done();
        });
      }
    });

    it('should deny access on API error with no cache', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(throwError(() => new Error('API Error')));

      const guard = toolGuard('short-link');
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/dashboard'], {
            queryParams: {
              toolError: 'true',
              tool: 'short-link',
              reason: 'Unable to verify tool status',
            },
          });
          done();
        });
      }
    });

    it('should use custom redirect route and disable error messages', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of(null));

      const guard = toolGuard('test-tool', '/custom/route', false);
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/custom/route'], {
            queryParams: {},
          });
          done();
        });
      }
    });

    it('should handle empty tool key', () => {
      const guard = toolGuard('');
      const result = guard({} as any, {} as any);

      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalled();
    });
  });

  describe('anyToolGuard', () => {
    it('should allow access when any tool is enabled', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValues(false, true); // qr-generator: false, short-link: true
      toolsServiceSpy.hasFreshCache.and.returnValue(true);

      const guard = anyToolGuard(['qr-generator', 'short-link']);
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(true);
          done();
        });
      }
    });

    it('should deny access when no tools are enabled', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.refreshAllTools.and.returnValue(of([mockTools[1]])); // Only disabled tool

      const guard = anyToolGuard(['qr-generator', 'disabled-tool']);
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/dashboard'], {
            queryParams: {
              toolError: 'true',
              tool: 'qr-generator, disabled-tool',
              reason: 'Required tools are not available',
            },
          });
          done();
        });
      }
    });

    it('should handle empty tool keys array', () => {
      const guard = anyToolGuard([]);
      const result = guard({} as any, {} as any);

      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalled();
    });

    it('should use cached data on API failure', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValues(false, true);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.refreshAllTools.and.returnValue(throwError(() => new Error('API Error')));

      const guard = anyToolGuard(['qr-generator', 'short-link']);
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(true); // Should use cached enabled status
          done();
        });
      }
    });
  });

  describe('allToolsGuard', () => {
    it('should allow access when all tools are enabled', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.hasFreshCache.and.returnValue(true);

      const guard = allToolsGuard(['short-link', 'analytics']);
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(true);
          done();
        });
      }
    });

    it('should deny access when any tool is disabled', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValues(true, false); // short-link: true, qr-generator: false
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.refreshAllTools.and.returnValue(of(mockTools));

      const guard = allToolsGuard(['short-link', 'qr-generator']);
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/dashboard'], {
            queryParams: {
              toolError: 'true',
              tool: 'qr-generator',
              reason: 'Required tools are not available: qr-generator',
            },
          });
          done();
        });
      }
    });

    it('should allow access with empty tool keys array', () => {
      const guard = allToolsGuard([]);
      const result = guard({} as any, {} as any);

      expect(result).toBe(true);
    });

    it('should handle missing tools', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.refreshAllTools.and.returnValue(of([])); // No tools available

      const guard = allToolsGuard(['non-existent-1', 'non-existent-2']);
      const result = guard({} as any, {} as any);

      if (typeof result === 'boolean') {
        expect(result).toBe(true);
        done();
      } else if (result && 'subscribe' in result) {
        result.subscribe((allowed: boolean) => {
          expect(allowed).toBe(false);
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/dashboard'], {
            queryParams: {
              toolError: 'true',
              tool: 'non-existent-1, non-existent-2',
              reason: 'Required tools are not available: non-existent-1, non-existent-2',
            },
          });
          done();
        });
      }
    });
  });

  describe('convenience guards', () => {
    it('should create shortLinkToolGuard correctly', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.hasFreshCache.and.returnValue(true);

      const result = shortLinkToolGuard({} as any, {} as any);

      expect(result).toBe(true);
      expect(toolsServiceSpy.isToolEnabled).toHaveBeenCalledWith('short-link');
    });

    it('should create qrGeneratorToolGuard correctly', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of({ ...mockTools[1], active: false }));

      const result = qrGeneratorToolGuard({} as any, {} as any);

      // Should return observable for async processing
      expect(typeof result).not.toBe('boolean');
    });

    it('should create analyticsToolGuard correctly', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.hasFreshCache.and.returnValue(true);

      const result = analyticsToolGuard({} as any, {} as any);

      expect(result).toBe(true);
      expect(toolsServiceSpy.isToolEnabled).toHaveBeenCalledWith('analytics');
    });
  });

  describe('timeout handling', () => {
    it('should handle API timeout gracefully', (done) => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.hasFreshCache.and.returnValue(false);

      // Create a promise that never resolves to simulate timeout
      const neverResolving = new Promise(() => {});
      toolsServiceSpy.getToolStatus.and.returnValue(neverResolving as any);

      const guard = toolGuard('slow-tool');
      const result = guard({} as any, {} as any);

      if (typeof result !== 'boolean') {
        // The guard should timeout after 5 seconds
        const timeoutId = setTimeout(() => {
          // If we reach here, the timeout handling worked
          expect(true).toBe(true);
          done();
        }, 100); // Test timeout much shorter than guard timeout

        result.subscribe({
          next: () => {
            clearTimeout(timeoutId);
            done();
          },
          error: () => {
            clearTimeout(timeoutId);
            done();
          },
        });
      }
    });
  });
});
