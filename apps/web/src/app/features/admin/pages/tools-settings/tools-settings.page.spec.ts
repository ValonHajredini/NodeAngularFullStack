import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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

  const mockTool: Tool = {
    id: '1',
    key: 'short-link',
    name: 'Short Link Generator',
    description: 'Generate shortened URLs',
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const toolsServiceSpy = jasmine.createSpyObj(
      'ToolsService',
      ['getTools', 'refresh', 'updateToolStatus', 'clearError'],
      {
        tools: jasmine.createSpy().and.returnValue([mockTool]),
        loading: jasmine.createSpy().and.returnValue(false),
        error: jasmine.createSpy().and.returnValue(null),
        activeTools: jasmine.createSpy().and.returnValue([mockTool]),
        inactiveTools: jasmine.createSpy().and.returnValue([]),
      },
    );

    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [ToolsSettingsPage, NoopAnimationsModule],
      providers: [
        { provide: ToolsService, useValue: toolsServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolsSettingsPage);
    component = fixture.componentInstance;
    mockToolsService = TestBed.inject(ToolsService) as jasmine.SpyObj<ToolsService>;
    mockMessageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    mockConfirmationService = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load tools on init', () => {
      mockToolsService.getTools.and.returnValue(of([mockTool]));

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
  });

  describe('refreshTools', () => {
    it('should refresh tools successfully', () => {
      mockToolsService.refresh.and.returnValue(of([mockTool]));

      component.refreshTools();

      expect(mockToolsService.refresh).toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Refreshed',
        detail: 'Loaded 1 tools',
      });
    });

    it('should handle refresh error', () => {
      mockToolsService.refresh.and.returnValue(throwError(() => new Error('Refresh failed')));

      component.refreshTools();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to refresh tools. Please try again.',
      });
    });
  });

  describe('onToggleStatus', () => {
    it('should show confirmation dialog for enabling tool', () => {
      component.onToggleStatus(mockTool, true);

      expect(mockConfirmationService.confirm).toHaveBeenCalledWith({
        message:
          'Are you sure you want to enable the "Short Link Generator" tool? This change will affect all users immediately.',
        header: 'Enable Tool',
        icon: 'pi pi-question-circle',
        accept: jasmine.any(Function),
        reject: jasmine.any(Function),
      });
    });

    it('should show confirmation dialog for disabling tool', () => {
      component.onToggleStatus(mockTool, false);

      expect(mockConfirmationService.confirm).toHaveBeenCalledWith({
        message:
          'Are you sure you want to disable the "Short Link Generator" tool? This change will affect all users immediately.',
        header: 'Disable Tool',
        icon: 'pi pi-question-circle',
        accept: jasmine.any(Function),
        reject: jasmine.any(Function),
      });
    });

    it('should update tool status when confirmed', () => {
      const updatedTool = { ...mockTool, active: false };
      mockToolsService.updateToolStatus.and.returnValue(of(updatedTool));

      let confirmConfig: any;
      mockConfirmationService.confirm.and.callFake((config) => {
        confirmConfig = config;
      });

      component.onToggleStatus(mockTool, false);

      // Simulate confirm acceptance
      confirmConfig.accept();

      expect(mockToolsService.updateToolStatus).toHaveBeenCalledWith('short-link', false);
    });
  });

  describe('updateToolStatus', () => {
    it('should update tool status successfully', () => {
      const updatedTool = { ...mockTool, active: false };
      mockToolsService.updateToolStatus.and.returnValue(of(updatedTool));

      component['updateToolStatus'](mockTool, false, 'disabled');

      expect(mockToolsService.updateToolStatus).toHaveBeenCalledWith('short-link', false);
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Tool Updated',
        detail: '"Short Link Generator" has been disabled successfully.',
      });
    });

    it('should handle update error', () => {
      mockToolsService.updateToolStatus.and.returnValue(
        throwError(() => new Error('Update failed')),
      );

      component['updateToolStatus'](mockTool, false, 'disabled');

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Update Failed',
        detail: 'Failed to disable "Short Link Generator". Please try again.',
      });
    });

    it('should track updating state', () => {
      const updatedTool = { ...mockTool, active: false };
      mockToolsService.updateToolStatus.and.returnValue(of(updatedTool));

      // Initially not updating
      expect(component.isUpdating('short-link')).toBe(false);

      component['updateToolStatus'](mockTool, false, 'disabled');

      // Should be updated after successful update
      expect(component.isUpdating('short-link')).toBe(false);
    });
  });

  describe('isUpdating', () => {
    it('should return false for tools not being updated', () => {
      expect(component.isUpdating('short-link')).toBe(false);
    });

    it('should return true for tools being updated', () => {
      // Set tool as updating
      const updating = new Set(['short-link']);
      component['updatingTools'].set(updating);

      expect(component.isUpdating('short-link')).toBe(true);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display tools table', () => {
      const tableElement = fixture.nativeElement.querySelector('p-table');
      expect(tableElement).toBeTruthy();
    });

    it('should display summary statistics', () => {
      const statsElements = fixture.nativeElement.querySelectorAll('.grid > div');
      expect(statsElements.length).toBe(3); // Active, Inactive, Total
    });

    it('should display information section', () => {
      const infoElement = fixture.nativeElement.querySelector('.bg-blue-50');
      expect(infoElement).toBeTruthy();
    });

    it('should display refresh button', () => {
      const refreshButton = fixture.nativeElement.querySelector('p-button[icon="pi pi-refresh"]');
      expect(refreshButton).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should display error message when present', () => {
      // Mock error state
      mockToolsService.error.and.returnValue('Test error message');
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.bg-red-50');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Test error message');
    });

    it('should hide error message when no error', () => {
      mockToolsService.error.and.returnValue(null);
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.bg-red-50');
      expect(errorElement).toBeFalsy();
    });

    it('should allow clearing error', () => {
      mockToolsService.error.and.returnValue('Test error');
      fixture.detectChanges();

      const clearButton = fixture.nativeElement.querySelector('.bg-red-50 button');
      expect(clearButton).toBeTruthy();

      clearButton.click();
      expect(mockToolsService.clearError).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading state', () => {
      mockToolsService.loading.and.returnValue(true);
      fixture.detectChanges();

      const tableElement = fixture.nativeElement.querySelector('p-table');
      expect(tableElement.getAttribute('ng-reflect-loading')).toBe('true');
    });

    it('should hide loading state', () => {
      mockToolsService.loading.and.returnValue(false);
      fixture.detectChanges();

      const tableElement = fixture.nativeElement.querySelector('p-table');
      expect(tableElement.getAttribute('ng-reflect-loading')).toBe('false');
    });
  });
});
