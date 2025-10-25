import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { ToolDetailComponent } from './tool-detail.component';
import { ToolRegistryService } from '@core/services/tool-registry.service';
import { AuthService } from '@core/auth/auth.service';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';
import { User } from '@core/auth/user.interface';

/**
 * Epic 32.2 - Task 5: Integration Tests for ToolDetailComponent
 *
 * Tests component integration with multiple services:
 * - ToolRegistryService for tool data fetching
 * - AuthService for permission checks
 * - Router for navigation
 * - ActivatedRoute for route parameter changes
 *
 * Covers:
 * - Component initialization and data loading
 * - Computed signal behavior (canExport, exportButtonTooltip, statusSeverity, permissionChips)
 * - Route parameter changes
 * - User role and permission changes
 * - Error handling and 404 redirects
 * - Component cleanup
 */
describe('ToolDetailComponent Integration Tests', () => {
  let component: ToolDetailComponent;
  let fixture: ComponentFixture<ToolDetailComponent>;
  let toolRegistryService: jest.Mocked<ToolRegistryService>;
  let authService: { user: jest.Mock };
  let router: jest.Mocked<Router>;
  let messageService: jest.Mocked<MessageService>;
  let paramMapSubject: BehaviorSubject<Map<string, string>>;

  const mockTool: ToolRegistryRecord = {
    toolId: 'form-builder',
    toolName: 'Form Builder',
    toolType: 'forms',
    description: 'Visual form builder',
    version: '1.0.0',
    status: 'registered',
    active: true,
    permissions: ['read', 'write', 'export'],
    config: { enableAdvancedMode: true },
    manifest: { version: '1.0.0', dependencies: [] },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockAdminUser: User = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
    tenantId: null,
  };

  const mockUserWithExportPermission = {
    userId: 'user-456',
    email: 'user@example.com',
    role: 'user',
    tenantId: null,
    permissions: ['read', 'write', 'export'],
  };

  const mockUserWithoutExportPermission: User = {
    userId: 'user-789',
    email: 'readonly@example.com',
    role: 'readonly',
    tenantId: null,
  };

  beforeEach(() => {
    // Create service mocks
    const mockToolRegistryService = {
      getToolById: jest.fn(),
    };

    const mockAuthService = {
      user: jest.fn(),
    };

    const mockRouter = {
      navigate: jest.fn(),
    };

    const mockMessageService = {
      add: jest.fn(),
    };

    // Create paramMap observable
    paramMapSubject = new BehaviorSubject<Map<string, string>>(
      new Map([['toolId', 'form-builder']]),
    );

    const mockActivatedRoute = {
      paramMap: paramMapSubject.asObservable(),
    };

    // Setup TestBed
    TestBed.configureTestingModule({
      imports: [ToolDetailComponent],
      providers: [
        { provide: ToolRegistryService, useValue: mockToolRegistryService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    });

    toolRegistryService = TestBed.inject(ToolRegistryService) as jest.Mocked<ToolRegistryService>;
    authService = TestBed.inject(AuthService) as any;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    messageService = TestBed.inject(MessageService) as jest.Mocked<MessageService>;
  });

  describe('Component Initialization', () => {
    it('should create component successfully', () => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;

      expect(component).toBeDefined();
    });

    it('should load tool data on init', (done) => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Wait for ngOnInit to complete
      setTimeout(() => {
        expect(toolRegistryService.getToolById).toHaveBeenCalledWith('form-builder');
        expect(component.tool()).toEqual(mockTool);
        expect(component.loading()).toBe(false);
        expect(component.error()).toBeNull();
        done();
      }, 100);
    });

    it('should set loading state during data fetch', () => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;

      // Before ngOnInit
      expect(component.loading()).toBe(true);

      fixture.detectChanges();

      // After ngOnInit completes, loading should be false
      fixture.whenStable().then(() => {
        expect(component.loading()).toBe(false);
      });
    });
  });

  describe('Route Parameter Changes', () => {
    it('should reload tool data when toolId parameter changes', (done) => {
      const anotherTool: ToolRegistryRecord = {
        ...mockTool,
        toolId: 'another-tool',
        toolName: 'Another Tool',
      };

      toolRegistryService.getToolById.mockReturnValueOnce(of(mockTool));
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Wait for initial load
      setTimeout(() => {
        expect(component.tool()?.toolId).toBe('form-builder');

        // Change route parameter
        toolRegistryService.getToolById.mockReturnValueOnce(of(anotherTool));
        paramMapSubject.next(new Map([['toolId', 'another-tool']]));

        // Wait for reload
        setTimeout(() => {
          expect(toolRegistryService.getToolById).toHaveBeenCalledWith('another-tool');
          expect(component.tool()?.toolId).toBe('another-tool');
          done();
        }, 100);
      }, 100);
    });

    it('should handle missing toolId parameter', (done) => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;

      // Emit empty paramMap
      paramMapSubject.next(new Map());
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.error()).toBe('Invalid tool URL');
        expect(component.loading()).toBe(false);
        expect(toolRegistryService.getToolById).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('canExport Computed Signal', () => {
    beforeEach(() => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
    });

    it('should return true for admin user', (done) => {
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.canExport()).toBe(true);
        done();
      }, 100);
    });

    it('should return true for user with export permission', (done) => {
      authService.user.mockReturnValue(mockUserWithExportPermission);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.canExport()).toBe(true);
        done();
      }, 100);
    });

    it('should return false for user without export permission', (done) => {
      authService.user.mockReturnValue(mockUserWithoutExportPermission);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.canExport()).toBe(false);
        done();
      }, 100);
    });

    it('should return false when user is null', (done) => {
      authService.user.mockReturnValue(null);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.canExport()).toBe(false);
        done();
      }, 100);
    });

    it('should update when user role changes', (done) => {
      // Start with non-admin user
      authService.user.mockReturnValue(mockUserWithoutExportPermission);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.canExport()).toBe(false);

        // Change to admin user
        authService.user.mockReturnValue(mockAdminUser);
        fixture.detectChanges();

        setTimeout(() => {
          expect(component.canExport()).toBe(true);
          done();
        }, 50);
      }, 100);
    });

    it('should update when user permissions change', (done) => {
      // Start with user without export permission
      authService.user.mockReturnValue(mockUserWithoutExportPermission);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.canExport()).toBe(false);

        // Change to user with export permission
        authService.user.mockReturnValue(mockUserWithExportPermission);
        fixture.detectChanges();

        setTimeout(() => {
          expect(component.canExport()).toBe(true);
          done();
        }, 50);
      }, 100);
    });
  });

  describe('exportButtonTooltip Computed Signal', () => {
    beforeEach(() => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
    });

    it('should show export message when user has permission', (done) => {
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.exportButtonTooltip()).toBe('Export this tool as a standalone package');
        done();
      }, 100);
    });

    it('should show permission denied message when user lacks permission', (done) => {
      authService.user.mockReturnValue(mockUserWithoutExportPermission);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.exportButtonTooltip()).toBe(
          "You don't have permission to export this tool",
        );
        done();
      }, 100);
    });

    it('should update when permission state changes', (done) => {
      authService.user.mockReturnValue(mockUserWithoutExportPermission);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.exportButtonTooltip()).toContain("don't have permission");

        // Change to admin
        authService.user.mockReturnValue(mockAdminUser);
        fixture.detectChanges();

        setTimeout(() => {
          expect(component.exportButtonTooltip()).toBe('Export this tool as a standalone package');
          done();
        }, 50);
      }, 100);
    });
  });

  describe('statusSeverity Computed Signal', () => {
    beforeEach(() => {
      authService.user.mockReturnValue(mockAdminUser);
    });

    it('should return "success" for registered status', (done) => {
      const registeredTool = { ...mockTool, status: 'registered' as const };
      toolRegistryService.getToolById.mockReturnValue(of(registeredTool));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.statusSeverity()).toBe('success');
        done();
      }, 100);
    });

    it('should return "warning" for draft status', (done) => {
      const draftTool = { ...mockTool, status: 'draft' as const };
      toolRegistryService.getToolById.mockReturnValue(of(draftTool));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.statusSeverity()).toBe('warning');
        done();
      }, 100);
    });

    it('should return "secondary" for archived status', (done) => {
      const archivedTool = { ...mockTool, status: 'archived' as const };
      toolRegistryService.getToolById.mockReturnValue(of(archivedTool));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.statusSeverity()).toBe('secondary');
        done();
      }, 100);
    });

    it('should return "info" for exported status', (done) => {
      const exportedTool = { ...mockTool, status: 'exported' as const };
      toolRegistryService.getToolById.mockReturnValue(of(exportedTool));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.statusSeverity()).toBe('info');
        done();
      }, 100);
    });

    it('should return "secondary" when tool is null', (done) => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;

      // Set tool to null manually
      component.tool.set(null);
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.statusSeverity()).toBe('secondary');
        done();
      }, 100);
    });
  });

  describe('permissionChips Computed Signal', () => {
    beforeEach(() => {
      authService.user.mockReturnValue(mockAdminUser);
    });

    it('should return permission chips with correct labels', (done) => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        const chips = component.permissionChips();
        expect(chips).toHaveLength(3);
        expect(chips.map((c) => c.label)).toEqual(['read', 'write', 'export']);
        done();
      }, 100);
    });

    it('should assign correct severity to read permissions', (done) => {
      const toolWithReadPerm = { ...mockTool, permissions: ['read'] };
      toolRegistryService.getToolById.mockReturnValue(of(toolWithReadPerm));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        const chips = component.permissionChips();
        expect(chips[0].severity).toBe('info');
        done();
      }, 100);
    });

    it('should assign correct severity to write permissions', (done) => {
      const toolWithWritePerm = { ...mockTool, permissions: ['write', 'create'] };
      toolRegistryService.getToolById.mockReturnValue(of(toolWithWritePerm));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        const chips = component.permissionChips();
        expect(chips[0].severity).toBe('warn');
        expect(chips[1].severity).toBe('warn');
        done();
      }, 100);
    });

    it('should assign correct severity to delete/admin permissions', (done) => {
      const toolWithDeletePerm = { ...mockTool, permissions: ['delete', 'admin'] };
      toolRegistryService.getToolById.mockReturnValue(of(toolWithDeletePerm));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        const chips = component.permissionChips();
        expect(chips[0].severity).toBe('danger');
        expect(chips[1].severity).toBe('danger');
        done();
      }, 100);
    });

    it('should return empty array when tool has no permissions', (done) => {
      const toolWithoutPerms = { ...mockTool, permissions: [] };
      toolRegistryService.getToolById.mockReturnValue(of(toolWithoutPerms));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.permissionChips()).toEqual([]);
        done();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      authService.user.mockReturnValue(mockAdminUser);
    });

    it('should handle 404 error and redirect', (done) => {
      const notFoundError = { status: 404, message: 'Tool not found' };
      toolRegistryService.getToolById.mockReturnValue(throwError(() => notFoundError));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.error()).toBe('Failed to load tool. Please try again.');
        expect(component.loading()).toBe(false);

        // Wait for redirect timeout (2000ms)
        setTimeout(() => {
          expect(router.navigate).toHaveBeenCalledWith(['/404']);
          done();
        }, 2100);
      }, 100);
    });

    it('should handle network errors gracefully', (done) => {
      const networkError = new Error('Network error');
      toolRegistryService.getToolById.mockReturnValue(throwError(() => networkError));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.error()).toBe('Failed to load tool. Please try again.');
        expect(component.loading()).toBe(false);
        expect(component.tool()).toBeNull();
        done();
      }, 100);
    });

    it('should log errors to console', (done) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      toolRegistryService.getToolById.mockReturnValue(throwError(() => error));

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load tool:', error);
        consoleSpy.mockRestore();
        done();
      }, 100);
    });
  });

  describe('Component Cleanup', () => {
    it('should not leak subscriptions on destroy', (done) => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        // Destroy component
        fixture.destroy();

        // Change route params after destroy (should not crash or trigger new API calls)
        const callCount = toolRegistryService.getToolById.mock.calls.length;
        paramMapSubject.next(new Map([['toolId', 'another-tool']]));

        setTimeout(() => {
          // Should not make new API calls after destroy
          expect(toolRegistryService.getToolById.mock.calls.length).toBe(callCount);
          done();
        }, 100);
      }, 100);
    });
  });

  describe('openExportModal Method', () => {
    beforeEach(() => {
      toolRegistryService.getToolById.mockReturnValue(of(mockTool));
    });

    it('should open modal when user has export permission', (done) => {
      authService.user.mockReturnValue(mockAdminUser);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        component.openExportModal();
        expect(component.showExportModal()).toBe(true);
        expect(messageService.add).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should show warning toast when user lacks permission', (done) => {
      authService.user.mockReturnValue(mockUserWithoutExportPermission);

      fixture = TestBed.createComponent(ToolDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      setTimeout(() => {
        component.openExportModal();
        expect(component.showExportModal()).toBe(false);
        expect(messageService.add).toHaveBeenCalledWith({
          severity: 'warn',
          summary: 'Permission Denied',
          detail: "You don't have permission to export this tool",
          life: 5000,
        });
        done();
      }, 100);
    });
  });
});
