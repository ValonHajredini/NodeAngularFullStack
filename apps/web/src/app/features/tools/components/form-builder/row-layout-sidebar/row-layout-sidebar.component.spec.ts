import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RowLayoutSidebarComponent } from './row-layout-sidebar.component';
import { FormBuilderService } from '../form-builder.service';
import { signal } from '@angular/core';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';

describe('RowLayoutSidebarComponent', () => {
  let component: RowLayoutSidebarComponent;
  let fixture: ComponentFixture<RowLayoutSidebarComponent>;
  let mockFormBuilderService: jasmine.SpyObj<FormBuilderService>;

  // Helper to create mock form fields
  const createMockField = (
    id: string,
    label: string,
    type: FormFieldType = FormFieldType.TEXT,
  ): FormField => ({
    id,
    label,
    fieldName: label.toLowerCase().replace(/\s+/g, '_'),
    type,
    required: false,
    order: 0,
    options: [],
  });

  beforeEach(async () => {
    // Create mock FormBuilderService with writable signal
    const formFieldsSignal = signal<FormField[]>([]);
    mockFormBuilderService = {
      formFields: formFieldsSignal,
    } as unknown as jasmine.SpyObj<FormBuilderService>;

    await TestBed.configureTestingModule({
      imports: [RowLayoutSidebarComponent],
      providers: [{ provide: FormBuilderService, useValue: mockFormBuilderService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RowLayoutSidebarComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.removeItem('formBuilder.rowSidebarCollapsed');
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with collapsed state from localStorage if available', () => {
      localStorage.setItem('formBuilder.rowSidebarCollapsed', 'true');
      fixture.detectChanges();
      expect(component.isCollapsed()).toBe(true);
    });

    it('should initialize with expanded state from localStorage if available', () => {
      localStorage.setItem('formBuilder.rowSidebarCollapsed', 'false');
      fixture.detectChanges();
      expect(component.isCollapsed()).toBe(false);
    });

    it('should default to collapsed on small screens (< 1024px) when no localStorage value', () => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(800);
      fixture.detectChanges();
      expect(component.isCollapsed()).toBe(true);
    });

    it('should default to expanded on large screens (>= 1024px) when no localStorage value', () => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1280);
      fixture.detectChanges();
      expect(component.isCollapsed()).toBe(false);
    });
  });

  describe('Toggle Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle collapse state from expanded to collapsed', () => {
      component.isCollapsed.set(false);
      component.toggleCollapse();
      expect(component.isCollapsed()).toBe(true);
    });

    it('should toggle collapse state from collapsed to expanded', () => {
      component.isCollapsed.set(true);
      component.toggleCollapse();
      expect(component.isCollapsed()).toBe(false);
    });

    it('should persist collapse state to localStorage when toggled', () => {
      component.isCollapsed.set(false);
      component.toggleCollapse();
      expect(localStorage.getItem('formBuilder.rowSidebarCollapsed')).toBe('true');
    });

    it('should persist expanded state to localStorage when toggled', () => {
      component.isCollapsed.set(true);
      component.toggleCollapse();
      expect(localStorage.getItem('formBuilder.rowSidebarCollapsed')).toBe('false');
    });

    it('should handle rapid toggle clicks without errors', () => {
      expect(() => {
        for (let i = 0; i < 10; i++) {
          component.toggleCollapse();
        }
      }).not.toThrow();
    });

    it('should update toggle button icon when collapsed', () => {
      component.isCollapsed.set(true);
      fixture.detectChanges();
      const toggleBtn = fixture.nativeElement.querySelector('.toggle-btn');
      expect(toggleBtn.classList.contains('pi-angle-left')).toBe(true);
    });

    it('should update toggle button icon when expanded', () => {
      component.isCollapsed.set(false);
      fixture.detectChanges();
      const toggleBtn = fixture.nativeElement.querySelector('.toggle-btn');
      expect(toggleBtn.classList.contains('pi-angle-right')).toBe(true);
    });
  });

  describe('Row List Display', () => {
    it('should display empty state when no fields exist', () => {
      mockFormBuilderService.formFields.set([]);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No rows yet');
    });

    it('should derive rows from form fields (1:1 mapping)', () => {
      const fields = [
        createMockField('1', 'Name'),
        createMockField('2', 'Email'),
        createMockField('3', 'Phone'),
      ];
      mockFormBuilderService.formFields.set(fields);
      fixture.detectChanges();

      const rows = component.rows();
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual({ rowNumber: 1, fieldCount: 1 });
      expect(rows[1]).toEqual({ rowNumber: 2, fieldCount: 1 });
      expect(rows[2]).toEqual({ rowNumber: 3, fieldCount: 1 });
    });

    it('should display row items when fields exist', () => {
      const fields = [createMockField('1', 'Name'), createMockField('2', 'Email')];
      mockFormBuilderService.formFields.set(fields);
      component.isCollapsed.set(false);
      fixture.detectChanges();

      const rowItems = fixture.nativeElement.querySelectorAll('.row-item');
      expect(rowItems.length).toBe(2);
    });

    it('should display correct row numbers', () => {
      const fields = [createMockField('1', 'Name'), createMockField('2', 'Email')];
      mockFormBuilderService.formFields.set(fields);
      component.isCollapsed.set(false);
      fixture.detectChanges();

      const rowItems = fixture.nativeElement.querySelectorAll('.row-item');
      expect(rowItems[0].textContent).toContain('Row 1');
      expect(rowItems[1].textContent).toContain('Row 2');
    });

    it('should display correct field count for each row', () => {
      const fields = [createMockField('1', 'Name')];
      mockFormBuilderService.formFields.set(fields);
      component.isCollapsed.set(false);
      fixture.detectChanges();

      const rowItem = fixture.nativeElement.querySelector('.row-item');
      expect(rowItem.textContent).toContain('1 field');
    });

    it('should update rows when form fields change', () => {
      mockFormBuilderService.formFields.set([createMockField('1', 'Name')]);
      fixture.detectChanges();
      expect(component.rows().length).toBe(1);

      mockFormBuilderService.formFields.set([
        createMockField('1', 'Name'),
        createMockField('2', 'Email'),
      ]);
      fixture.detectChanges();
      expect(component.rows().length).toBe(2);
    });
  });

  describe('Styling and Layout', () => {
    it('should apply collapsed class when sidebar is collapsed', () => {
      component.isCollapsed.set(true);
      fixture.detectChanges();

      const sidebar = fixture.nativeElement.querySelector('.row-layout-sidebar');
      expect(sidebar.classList.contains('collapsed')).toBe(true);
    });

    it('should remove collapsed class when sidebar is expanded', () => {
      component.isCollapsed.set(false);
      fixture.detectChanges();

      const sidebar = fixture.nativeElement.querySelector('.row-layout-sidebar');
      expect(sidebar.classList.contains('collapsed')).toBe(false);
    });

    it('should hide sidebar content when collapsed', () => {
      component.isCollapsed.set(true);
      fixture.detectChanges();

      const sidebarContent = fixture.nativeElement.querySelector('.sidebar-content');
      expect(sidebarContent).toBeNull();
    });

    it('should show sidebar content when expanded', () => {
      component.isCollapsed.set(false);
      fixture.detectChanges();

      const sidebarContent = fixture.nativeElement.querySelector('.sidebar-content');
      expect(sidebarContent).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on toggle button', () => {
      fixture.detectChanges();
      const toggleBtn = fixture.nativeElement.querySelector('.toggle-btn');
      expect(toggleBtn.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-expanded attribute matching collapse state', () => {
      component.isCollapsed.set(false);
      fixture.detectChanges();
      const toggleBtn = fixture.nativeElement.querySelector('.toggle-btn');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

      component.isCollapsed.set(true);
      fixture.detectChanges();
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('should update aria-label based on collapse state', () => {
      component.isCollapsed.set(true);
      fixture.detectChanges();
      const toggleBtn = fixture.nativeElement.querySelector('.toggle-btn');
      expect(toggleBtn.getAttribute('aria-label')).toContain('Expand');

      component.isCollapsed.set(false);
      fixture.detectChanges();
      expect(toggleBtn.getAttribute('aria-label')).toContain('Collapse');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined localStorage value gracefully', () => {
      localStorage.removeItem('formBuilder.rowSidebarCollapsed');
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle invalid localStorage value gracefully', () => {
      localStorage.setItem('formBuilder.rowSidebarCollapsed', 'invalid-value');
      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle empty field list', () => {
      mockFormBuilderService.formFields.set([]);
      fixture.detectChanges();
      expect(component.rows().length).toBe(0);
    });

    it('should handle large number of fields', () => {
      const fields = Array.from({ length: 100 }, (_, i) =>
        createMockField(`${i + 1}`, `Field ${i + 1}`),
      );
      mockFormBuilderService.formFields.set(fields);
      fixture.detectChanges();
      expect(component.rows().length).toBe(100);
    });
  });

  describe('Story 28.1: Row Duplication Functionality (AC 10)', () => {
    beforeEach(() => {
      // Setup mock methods for duplication tests
      mockFormBuilderService.duplicateRow = jasmine
        .createSpy('duplicateRow')
        .and.returnValue('new-row-id-123');
      mockFormBuilderService.isPublished = jasmine.createSpy('isPublished').and.returnValue(false);
      mockFormBuilderService.rowConfigs = signal([
        { rowId: 'row-1', columnCount: 2, order: 0 },
        { rowId: 'row-2', columnCount: 3, order: 1 },
      ]);
      fixture.detectChanges();
    });

    it('should render duplicate button for each row with correct icon and label', () => {
      const duplicateButtons = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="Duplicate row"]',
      );
      expect(duplicateButtons.length).toBe(2);

      // Verify first button has correct icon and label
      const firstButton = duplicateButtons[0];
      expect(firstButton.querySelector('.pi-copy')).toBeTruthy();
      expect(firstButton.getAttribute('aria-label')).toBe('Duplicate row 1');

      // Verify second button has correct icon and label
      const secondButton = duplicateButtons[1];
      expect(secondButton.querySelector('.pi-copy')).toBeTruthy();
      expect(secondButton.getAttribute('aria-label')).toBe('Duplicate row 2');
    });

    it('should call formBuilderService.duplicateRow() with correct rowId when duplicate button clicked', () => {
      const duplicateButtons = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="Duplicate row"]',
      );
      const firstButton = duplicateButtons[0];

      firstButton.click();
      fixture.detectChanges();

      expect(mockFormBuilderService.duplicateRow).toHaveBeenCalledWith('row-1');
      expect(mockFormBuilderService.duplicateRow).toHaveBeenCalledTimes(1);
    });

    it('should disable duplicate button when form is published', () => {
      mockFormBuilderService.isPublished.and.returnValue(true);
      fixture.detectChanges();

      const duplicateButtons = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="Duplicate row"]',
      );

      duplicateButtons.forEach((button: HTMLButtonElement) => {
        expect(button.disabled).toBe(true);
      });
    });

    it('should update UI reactively when row is duplicated', () => {
      const initialRowCount = mockFormBuilderService.rowConfigs().length;
      expect(initialRowCount).toBe(2);

      // Simulate successful duplication by updating signal
      mockFormBuilderService.rowConfigs.set([
        { rowId: 'row-1', columnCount: 2, order: 0 },
        { rowId: 'new-row-id-123', columnCount: 2, order: 1 },
        { rowId: 'row-2', columnCount: 3, order: 2 },
      ]);
      fixture.detectChanges();

      const duplicateButtons = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="Duplicate row"]',
      );
      expect(duplicateButtons.length).toBe(3);
    });

    it('should have correct aria-label for accessibility compliance', () => {
      const duplicateButtons = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="Duplicate row"]',
      );

      // Verify aria-labels match pattern: "Duplicate row {order + 1}"
      expect(duplicateButtons[0].getAttribute('aria-label')).toBe('Duplicate row 1');
      expect(duplicateButtons[1].getAttribute('aria-label')).toBe('Duplicate row 2');

      // Verify aria-labels are present (required for screen readers)
      duplicateButtons.forEach((button: HTMLButtonElement) => {
        expect(button.hasAttribute('aria-label')).toBe(true);
        expect(button.getAttribute('aria-label')).toContain('Duplicate row');
      });
    });

    it('should log success message when duplication succeeds', () => {
      spyOn(console, 'log');
      const duplicateButtons = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="Duplicate row"]',
      );

      duplicateButtons[0].click();
      fixture.detectChanges();

      expect(console.log).toHaveBeenCalledWith(
        'Row duplicated successfully. New row ID:',
        'new-row-id-123',
      );
    });

    it('should log error message when duplication fails', () => {
      mockFormBuilderService.duplicateRow.and.returnValue('');
      spyOn(console, 'error');

      const duplicateButtons = fixture.nativeElement.querySelectorAll(
        'button[aria-label*="Duplicate row"]',
      );
      duplicateButtons[0].click();
      fixture.detectChanges();

      expect(console.error).toHaveBeenCalledWith('Failed to duplicate row:', 'row-1');
    });
  });
});
