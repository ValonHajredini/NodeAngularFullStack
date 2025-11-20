import { TestBed } from '@angular/core/testing';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  convertToParamMap,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { toolIdGuard } from './tool.guard';
import { ToolRegistryService } from '../services/tool-registry.service';
import { ToolRegistryRecord, ToolStatus } from '@nodeangularfullstack/shared';
import { mockToolActive } from '../../../../../../../tests/e2e/fixtures/tool-fixtures';

/**
 * Epic 32.2 - Task 4: Integration Tests for toolIdGuard
 *
 * Tests guard integration with Router and ToolRegistryService:
 * - Guard allows access for valid toolId
 * - Guard denies access and redirects for invalid toolId
 * - Guard handles API errors gracefully
 * - Guard doesn't block navigation to other routes
 */
describe('toolIdGuard Integration Tests', () => {
  let router: jasmine.SpyObj<Router>;
  let toolRegistryService: jasmine.SpyObj<ToolRegistryService>;
  let route: ActivatedRouteSnapshot;
  let state: RouterStateSnapshot;

  // Use correct ToolRegistryRecord structure from fixtures
  const mockTool: ToolRegistryRecord = mockToolActive;

  beforeEach(() => {
    // Create mocks with Jasmine
    const mockToolRegistryService = jasmine.createSpyObj('ToolRegistryService', ['getToolById']);
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Setup TestBed
    TestBed.configureTestingModule({
      providers: [
        { provide: ToolRegistryService, useValue: mockToolRegistryService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    toolRegistryService = TestBed.inject(
      ToolRegistryService,
    ) as jasmine.SpyObj<ToolRegistryService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Create route snapshot with correct paramMap
    route = {
      paramMap: convertToParamMap({ toolId: 'form-builder' }),
    } as any;

    state = { url: '/app/tools/detail/form-builder' } as RouterStateSnapshot;
  });

  describe('Valid Tool Access', () => {
    it('should return true for valid and active tool', (done) => {
      toolRegistryService.getToolById.and.returnValue(of(mockTool));

      const result = toolIdGuard(route, state);

      if (result instanceof Promise || (result as any).subscribe) {
        (result as any).subscribe((allowed: boolean) => {
          expect(allowed).toBe(true);
          expect(toolRegistryService.getToolById).toHaveBeenCalledWith('form-builder');
          expect(router.navigate).not.toHaveBeenCalled();
          done();
        });
      } else {
        fail('Guard should return Observable');
      }
    });

    it('should inject ToolRegistryService and Router correctly', (done) => {
      toolRegistryService.getToolById.and.returnValue(of(mockTool));

      const result = toolIdGuard(route, state);

      (result as any).subscribe(() => {
        expect(toolRegistryService).toBeDefined();
        expect(router).toBeDefined();
        done();
      });
    });
  });

  describe('Invalid Tool Access', () => {
    it('should return false and redirect for beta/inactive tool', (done) => {
      const betaTool = { ...mockTool, status: ToolStatus.BETA };
      toolRegistryService.getToolById.and.returnValue(of(betaTool));

      const result = toolIdGuard(route, state);

      (result as any).subscribe((allowed: boolean) => {
        expect(allowed).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/404']);
        done();
      });
    });

    it('should return false and redirect when tool not found (404)', (done) => {
      toolRegistryService.getToolById.and.returnValue(
        throwError(() => ({ status: 404, message: 'Tool not found' })),
      );

      const result = toolIdGuard(route, state);

      (result as any).subscribe((allowed: boolean) => {
        expect(allowed).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/404']);
        done();
      });
    });

    it('should return false when toolId parameter is missing', (done) => {
      route.paramMap = convertToParamMap({}); // No toolId

      const result = toolIdGuard(route, state);

      (result as any).subscribe((allowed: boolean) => {
        expect(allowed).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/404']);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API network errors gracefully', (done) => {
      toolRegistryService.getToolById.and.returnValue(throwError(() => new Error('Network error')));

      const result = toolIdGuard(route, state);

      (result as any).subscribe((allowed: boolean) => {
        expect(allowed).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/404']);
        done();
      });
    });

    it('should handle timeout errors', (done) => {
      toolRegistryService.getToolById.and.returnValue(
        throwError(() => ({ name: 'TimeoutError', message: 'Request timeout' })),
      );

      const result = toolIdGuard(route, state);

      (result as any).subscribe((allowed: boolean) => {
        expect(allowed).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/404']);
        done();
      });
    });
  });

  describe('Route Parameter Extraction', () => {
    it('should extract toolId from route params correctly', (done) => {
      const customToolId = 'custom-tool-123';
      route.paramMap = convertToParamMap({ toolId: customToolId });
      toolRegistryService.getToolById.and.returnValue(of({ ...mockTool, tool_id: customToolId }));

      const result = toolIdGuard(route, state);

      (result as any).subscribe(() => {
        expect(toolRegistryService.getToolById).toHaveBeenCalledWith(customToolId);
        done();
      });
    });
  });

  describe('Logging and Debugging', () => {
    it('should log validation messages to console', (done) => {
      const consoleSpy = spyOn(console, 'log');
      toolRegistryService.getToolById.and.returnValue(of(mockTool));

      const result = toolIdGuard(route, state);

      (result as any).subscribe(() => {
        expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringContaining('[ToolIdGuard]'));
        done();
      });
    });
  });
});
