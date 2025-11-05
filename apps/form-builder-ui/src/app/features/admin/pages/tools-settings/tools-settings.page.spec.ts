import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ToolsSettingsPage } from './tools-settings.page';
import { ToolsService } from '../../services/tools.service';
import { Tool } from '@nodeangularfullstack/shared';

describe('ToolsSettingsPage', () => {
  let component: ToolsSettingsPage;
  let fixture: ComponentFixture<ToolsSettingsPage>;
  let mockToolsService: jasmine.SpyObj<ToolsService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockConfirmationService: jasmine.SpyObj<ConfirmationService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockTools: Tool[] = [
    {
      id: '1',
      key: 'short-link',
      slug: 'short-link-generator',
      name: 'Short Link Generator',
      description: 'Generate shortened URLs for better sharing',
      active: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: '2',
      key: 'qr-code',
      slug: 'qr-code-generator',
      name: 'QR Code Generator',
      description: 'Create QR codes for various purposes',
      active: false,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    },
    {
      id: '3',
      key: 'text-editor',
      slug: 'text-editor-tool',
      name: 'Text Editor',
      description: 'Advanced text editing capabilities',
      active: true,
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-03'),
    },
  ];

  beforeEach(async () => {
    const toolsServiceSpy = jasmine.createSpyObj(
      'ToolsService',
      ['getTools', 'refresh', 'updateToolStatus', 'clearError'],
      {
        tools: jasmine.createSpy().and.returnValue(mockTools),
        loading: jasmine.createSpy().and.returnValue(false),
        error: jasmine.createSpy().and.returnValue(null),
        activeTools: jasmine.createSpy().and.returnValue(mockTools.filter((t) => t.active)),
        inactiveTools: jasmine.createSpy().and.returnValue(mockTools.filter((t) => !t.active)),
      },
    );

    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ToolsSettingsPage, NoopAnimationsModule],
      providers: [
        { provide: ToolsService, useValue: toolsServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolsSettingsPage);
    component = fixture.componentInstance;
    mockToolsService = TestBed.inject(ToolsService) as jasmine.SpyObj<ToolsService>;
    mockMessageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    mockConfirmationService = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should load tools on init', () => {
      mockToolsService.getTools.and.returnValue(of(mockTools));

      component.ngOnInit();

      expect(mockToolsService.getTools).toHaveBeenCalled();
    });

    it('should handle load error', () => {
      mockToolsService.getTools.and.returnValue(throwError(() => new Error('Load failed')));

      component.ngOnInit();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load tools. Please try again.',
      });
    });

    it('should initialize signals with default values', () => {
      expect(component.searchQuery()).toBe('');
      expect(component.statusFilter()).toBe('all');
      expect(component.selectedTools().length).toBe(0);
      expect(component.showDetailsModal()).toBe(false);
      expect(component.selectedToolForDetails()).toBeNull();
    });
  });

  describe('Search and Filter Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter tools by search query', () => {
      component.searchQuery.set('short');
      expect(component.filteredTools().length).toBe(1);
      expect(component.filteredTools()[0].key).toBe('short-link');
    });

    it('should filter tools by status', () => {
      component.statusFilter.set('active');
      expect(component.filteredTools().length).toBe(2);
      expect(component.filteredTools().every((t) => t.active)).toBe(true);

      component.statusFilter.set('inactive');
      expect(component.filteredTools().length).toBe(1);
      expect(component.filteredTools().every((t) => !t.active)).toBe(true);
    });

    it('should combine search and status filters', () => {
      component.searchQuery.set('generator');
      component.statusFilter.set('active');
      expect(component.filteredTools().length).toBe(1);
      expect(component.filteredTools()[0].key).toBe('short-link');
    });

    it('should clear filters', () => {
      component.searchQuery.set('test');
      component.statusFilter.set('active');

      component.clearFilters();

      expect(component.searchQuery()).toBe('');
      expect(component.statusFilter()).toBe('all');
    });
  });

  describe('Tool Selection', () => {
    it('should select and deselect tools', () => {
      expect(component.isToolSelected('short-link')).toBe(false);

      component.toggleToolSelection('short-link', true);
      expect(component.isToolSelected('short-link')).toBe(true);
      expect(component.selectedTools().length).toBe(1);

      component.toggleToolSelection('short-link', false);
      expect(component.isToolSelected('short-link')).toBe(false);
      expect(component.selectedTools().length).toBe(0);
    });

    it('should clear all selections', () => {
      component.toggleToolSelection('short-link', true);
      component.toggleToolSelection('qr-code', true);
      expect(component.selectedTools().length).toBe(2);

      component.clearSelection();
      expect(component.selectedTools().length).toBe(0);
    });

    it('should track multiple selected tools', () => {
      component.toggleToolSelection('short-link', true);
      component.toggleToolSelection('text-editor', true);

      expect(component.selectedTools().length).toBe(2);
      expect(component.selectedTools().map((t) => t.key)).toContain('short-link');
      expect(component.selectedTools().map((t) => t.key)).toContain('text-editor');
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      component.toggleToolSelection('short-link', true);
      component.toggleToolSelection('qr-code', true);
    });

    it('should show confirmation for bulk enable', () => {
      component.bulkUpdateStatus(true);

      expect(mockConfirmationService.confirm).toHaveBeenCalledWith({
        message:
          'Are you sure you want to enable 2 selected tool(s)? This change will affect all users immediately.',
        header: 'Bulk Enable Tools',
        icon: 'pi pi-question-circle',
        accept: jasmine.any(Function),
      });
    });

    it('should show confirmation for bulk disable', () => {
      component.bulkUpdateStatus(false);

      expect(mockConfirmationService.confirm).toHaveBeenCalledWith({
        message:
          'Are you sure you want to disable 2 selected tool(s)? This change will affect all users immediately.',
        header: 'Bulk Disable Tools',
        icon: 'pi pi-question-circle',
        accept: jasmine.any(Function),
      });
    });

    it('should not proceed with bulk update if no tools selected', () => {
      component.clearSelection();
      component.bulkUpdateStatus(true);

      expect(mockConfirmationService.confirm).not.toHaveBeenCalled();
    });

    it('should perform bulk update when confirmed', () => {
      mockToolsService.updateToolStatus.and.returnValue(of(mockTools[0]));

      let confirmConfig: any;
      mockConfirmationService.confirm.and.callFake((config) => {
        confirmConfig = config;
        return mockConfirmationService;
      });

      component.bulkUpdateStatus(true);
      confirmConfig.accept();

      expect(mockToolsService.updateToolStatus).toHaveBeenCalledTimes(2);
    });

    it('should show success message after successful bulk update', (done) => {
      mockToolsService.updateToolStatus.and.returnValue(of(mockTools[0]));

      let confirmConfig: any;
      mockConfirmationService.confirm.and.callFake((config) => {
        confirmConfig = config;
        return mockConfirmationService;
      });

      component.bulkUpdateStatus(true);
      confirmConfig.accept();

      setTimeout(() => {
        expect(mockMessageService.add).toHaveBeenCalledWith({
          severity: 'success',
          summary: 'Bulk Update Complete',
          detail: 'Successfully enabled 2 tool(s).',
        });
        done();
      }, 100);
    });
  });

  describe('Tool Details Modal', () => {
    it('should show tool details modal', () => {
      component.showToolDetails(mockTools[0]);

      expect(component.showDetailsModal()).toBe(true);
      expect(component.selectedToolForDetails()).toEqual(mockTools[0]);
    });

    it('should display correct tool icon', () => {
      expect(component.getToolIcon(mockTools[0])).toBe('pi pi-link');
      expect(component.getToolIcon(mockTools[1])).toBe('pi pi-qrcode');
      expect(component.getToolIcon(mockTools[2])).toBe('pi pi-file-edit');
    });

    it('should fall back to default icon for unknown tools', () => {
      const unknownTool = { ...mockTools[0], key: 'unknown-tool', slug: 'unknown-tool-slug' };
      expect(component.getToolIcon(unknownTool)).toBe('pi pi-wrench');
    });
  });

  describe('Navigation and Actions', () => {
    it('should show coming soon message for create tool', () => {
      component.navigateToCreateTool();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Coming Soon',
        detail: 'Tool registration wizard will be available in the next update.',
      });
    });

    it('should show coming soon message for configure tool', () => {
      component.configureTool(mockTools[0]);

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Coming Soon',
        detail: 'Configuration for "Short Link Generator" will be available in a future update.',
      });
    });
  });

  describe('Tool Status Toggle', () => {
    it('should show confirmation dialog for enabling tool', () => {
      component.onToggleStatus(mockTools[1], true);

      expect(mockConfirmationService.confirm).toHaveBeenCalledWith({
        message:
          'Are you sure you want to enable the "QR Code Generator" tool? This change will affect all users immediately.',
        header: 'Enable Tool',
        icon: 'pi pi-question-circle',
        accept: jasmine.any(Function),
        reject: jasmine.any(Function),
      });
    });

    it('should update tool status when confirmed', () => {
      const updatedTool = { ...mockTools[1], active: true };
      mockToolsService.updateToolStatus.and.returnValue(of(updatedTool));

      let confirmConfig: any;
      mockConfirmationService.confirm.and.callFake((config) => {
        confirmConfig = config;
        return mockConfirmationService;
      });

      component.onToggleStatus(mockTools[1], true);
      confirmConfig.accept();

      expect(mockToolsService.updateToolStatus).toHaveBeenCalledWith('qr-code', true);
    });
  });

  describe('Utility Functions', () => {
    it('should track tools by key', () => {
      expect(component.trackByTool(0, mockTools[0])).toBe('short-link');
      expect(component.trackByTool(1, mockTools[1])).toBe('qr-code');
    });

    it('should track updating state correctly', () => {
      expect(component.isUpdating('short-link')).toBe(false);

      // Simulate updating state (private method test)
      const updating = new Set(['short-link']);
      component['updatingTools'].set(updating);

      expect(component.isUpdating('short-link')).toBe(true);
      expect(component.isUpdating('qr-code')).toBe(false);
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display create new tool button', () => {
      const createButton = fixture.nativeElement.querySelector('.create-tool-btn');
      expect(createButton).toBeTruthy();
      expect(createButton.textContent).toContain('Create New Tool');
    });

    it('should display search input', () => {
      const searchInput = fixture.nativeElement.querySelector('input[placeholder*="Search"]');
      expect(searchInput).toBeTruthy();
    });

    it('should display status filter buttons', () => {
      const statusButtons = fixture.nativeElement.querySelectorAll(
        'p-button[label="All"], p-button[label="Active"], p-button[label="Inactive"]',
      );
      expect(statusButtons.length).toBe(3);
    });

    it('should display tools in card grid layout', () => {
      const toolCards = fixture.nativeElement.querySelectorAll('p-card');
      expect(toolCards.length).toBe(mockTools.length);
    });

    it('should display bulk action buttons', () => {
      const enableButton = fixture.nativeElement.querySelector('p-button[label="Enable Selected"]');
      const disableButton = fixture.nativeElement.querySelector(
        'p-button[label="Disable Selected"]',
      );

      expect(enableButton).toBeTruthy();
      expect(disableButton).toBeTruthy();
    });

    it('should display summary statistics', () => {
      const statsElements = fixture.nativeElement.querySelectorAll('.grid .border-l-4');
      expect(statsElements.length).toBe(3); // Active, Inactive, Total
    });

    it('should show empty state when no tools', () => {
      mockToolsService.tools.and.returnValue([]);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.text-center .pi-inbox');
      expect(emptyState).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when present', () => {
      mockToolsService.error.and.returnValue('Test error message');
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.bg-red-50');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Test error message');
    });

    it('should allow clearing error', () => {
      mockToolsService.error.and.returnValue('Test error');
      fixture.detectChanges();

      const clearButton = fixture.nativeElement.querySelector('.bg-red-50 button');
      clearButton.click();

      expect(mockToolsService.clearError).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when loading', () => {
      mockToolsService.loading.and.returnValue(true);
      fixture.detectChanges();

      const loadingSpinner = fixture.nativeElement.querySelector('p-progressSpinner');
      expect(loadingSpinner).toBeTruthy();
    });

    it('should hide tools grid when loading', () => {
      mockToolsService.loading.and.returnValue(true);
      fixture.detectChanges();

      const toolsGrid = fixture.nativeElement.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
      expect(toolsGrid).toBeFalsy();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      fixture.detectChanges();

      const toolsGrid = fixture.nativeElement.querySelector(
        '.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3',
      );
      expect(toolsGrid).toBeTruthy();
    });

    it('should have responsive header layout', () => {
      const headerFlex = fixture.nativeElement.querySelector('.flex.flex-col.sm\\:flex-row');
      expect(headerFlex).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper labels for form controls', () => {
      const searchLabel = fixture.nativeElement.querySelector('label[for="search"]');
      const statusLabel = fixture.nativeElement.querySelector('label[for="statusFilter"]');

      expect(searchLabel).toBeTruthy();
      expect(statusLabel).toBeTruthy();
    });

    it('should have tooltips on action buttons', () => {
      const viewButton = fixture.nativeElement.querySelector('p-button[pTooltip="View details"]');
      const configButton = fixture.nativeElement.querySelector(
        'p-button[pTooltip="Configure tool"]',
      );

      expect(viewButton).toBeTruthy();
      expect(configButton).toBeTruthy();
    });

    it('should have proper button labels', () => {
      const refreshButton = fixture.nativeElement.querySelector(
        'p-button[pTooltip="Refresh tools list"]',
      );
      expect(refreshButton).toBeTruthy();
    });
  });
});
