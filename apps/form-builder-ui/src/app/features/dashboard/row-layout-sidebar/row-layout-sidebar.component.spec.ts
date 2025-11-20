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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Story 28.1: Row Duplication Functionality (AC 10)', () => {
    beforeEach(() => {
      // Setup mock methods for duplication tests
      (mockFormBuilderService as any).duplicateRow = jasmine
        .createSpy('duplicateRow')
        .and.returnValue('new-row-id-123');
      (mockFormBuilderService as any).isPublished = jasmine
        .createSpy('isPublished')
        .and.returnValue(false);
      (mockFormBuilderService as any).rowConfigs = signal([
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
      (mockFormBuilderService.rowConfigs as any).set([
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
