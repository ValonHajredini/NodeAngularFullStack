/**
 * Component tests for Story 28.2: Multi-Row Selection and Batch Duplication
 *
 * Tests cover:
 * - Checkbox rendering with aria-labels
 * - Checkbox toggle behavior via FormBuilderService
 * - Keyboard modifiers (Ctrl/Cmd+Click, Shift+Click)
 * - Batch toolbar conditional rendering
 * - Duplicate Selected and Clear Selection button handlers
 * - Published form readonly mode (checkboxes disabled)
 * - Selection cleared after batch duplication
 *
 * @fileoverview Component tests for RowLayoutSidebarComponent Story 28.2 features
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RowLayoutSidebarComponent } from './row-layout-sidebar.component';
import { FormBuilderService } from '../form-builder.service';
import { ConfirmationService } from 'primeng/api';
import { signal, WritableSignal } from '@angular/core';
import { CheckboxChangeEvent } from 'primeng/checkbox';

describe('RowLayoutSidebarComponent - Story 28.2: Multi-Row Selection', () => {
  let component: RowLayoutSidebarComponent;
  let fixture: ComponentFixture<RowLayoutSidebarComponent>;
  let mockFormBuilderService: jasmine.SpyObj<FormBuilderService>;
  let mockConfirmationService: jasmine.SpyObj<ConfirmationService>;

  // Mock signals
  let mockRowLayoutEnabled: WritableSignal<boolean>;
  let mockRowConfigs: WritableSignal<any[]>;
  let mockSelectedRowIds: WritableSignal<string[]>;
  let mockSelectedRowCount: WritableSignal<number>;
  let mockIsPublished: WritableSignal<boolean>;

  beforeEach(async () => {
    // Initialize mock signals
    mockRowLayoutEnabled = signal(true);
    mockRowConfigs = signal([
      { rowId: 'row-1', order: 0, columnCount: 2 },
      { rowId: 'row-2', order: 1, columnCount: 3 },
      { rowId: 'row-3', order: 2, columnCount: 2 },
    ]);
    mockSelectedRowIds = signal<string[]>([]);
    mockSelectedRowCount = signal(0);
    mockIsPublished = signal(false);

    // Create mock FormBuilderService
    mockFormBuilderService = jasmine.createSpyObj(
      'FormBuilderService',
      [
        'selectRow',
        'deselectRow',
        'clearSelection',
        'selectRowRange',
        'isRowSelected',
        'duplicateRows',
        'duplicateRow',
        'enableRowLayout',
        'disableRowLayout',
        'addRow',
        'removeRow',
        'updateRowColumns',
        'getRowLayout',
        'migrateToRowLayout',
        'hasFields',
      ],
      {
        rowLayoutEnabled: mockRowLayoutEnabled.asReadonly(),
        rowConfigs: mockRowConfigs.asReadonly(),
        selectedRowIds: mockSelectedRowIds.asReadonly(),
        selectedRowCount: mockSelectedRowCount.asReadonly(),
        isPublished: mockIsPublished.asReadonly(),
        subColumnsByRowColumn: signal(new Map()).asReadonly(),
        stepFormEnabled: signal(false).asReadonly(),
        steps: signal([]).asReadonly(),
      },
    );

    // Mock isRowSelected method
    mockFormBuilderService.isRowSelected.and.callFake((rowId: string) => {
      return mockSelectedRowIds().includes(rowId);
    });

    // Mock duplicateRows to return new IDs and clear selection
    mockFormBuilderService.duplicateRows.and.callFake((rowIds: string[]) => {
      const newIds = rowIds.map((id) => `${id}-copy`);
      mockSelectedRowIds.set([]);
      mockSelectedRowCount.set(0);
      return newIds;
    });

    // Mock clearSelection
    mockFormBuilderService.clearSelection.and.callFake(() => {
      mockSelectedRowIds.set([]);
      mockSelectedRowCount.set(0);
    });

    // Mock selectRow (toggle behavior)
    mockFormBuilderService.selectRow.and.callFake((rowId: string) => {
      const selected = mockSelectedRowIds();
      const index = selected.indexOf(rowId);
      if (index > -1) {
        const updated = selected.filter((id) => id !== rowId);
        mockSelectedRowIds.set(updated);
        mockSelectedRowCount.set(updated.length);
      } else {
        const updated = [...selected, rowId];
        mockSelectedRowIds.set(updated);
        mockSelectedRowCount.set(updated.length);
      }
    });

    // Mock selectRowRange
    mockFormBuilderService.selectRowRange.and.callFake((startRowId: string, endRowId: string) => {
      const rows = mockRowConfigs();
      const startIndex = rows.findIndex((r) => r.rowId === startRowId);
      const endIndex = rows.findIndex((r) => r.rowId === endRowId);

      if (startIndex === -1 || endIndex === -1) {
        return;
      }

      const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
      const rangeRowIds = rows.slice(min, max + 1).map((r) => r.rowId);

      const selected = mockSelectedRowIds();
      const newSelection = new Set([...selected, ...rangeRowIds]);
      const updated = Array.from(newSelection);
      mockSelectedRowIds.set(updated);
      mockSelectedRowCount.set(updated.length);
    });

    // Create mock ConfirmationService
    mockConfirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [RowLayoutSidebarComponent],
      providers: [
        { provide: FormBuilderService, useValue: mockFormBuilderService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RowLayoutSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('AC #4: Checkbox UI Rendering', () => {
    it('should render a checkbox for each row when row layout enabled', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const checkboxes = compiled.querySelectorAll('p-checkbox');

      expect(checkboxes.length).toBe(3); // 3 rows from mockRowConfigs
    });

    it('should render checkboxes with correct aria-labels', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const checkboxes = compiled.querySelectorAll('p-checkbox');

      expect(checkboxes[0].getAttribute('aria-label')).toBe('Select row 1');
      expect(checkboxes[1].getAttribute('aria-label')).toBe('Select row 2');
      expect(checkboxes[2].getAttribute('aria-label')).toBe('Select row 3');
    });

    it('should bind checkbox state to rowSelectionStates', () => {
      // Select a row via service
      mockSelectedRowIds.set(['row-1']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      // Checkbox state should be synced via effect
      expect(component.rowSelectionStates['row-1']).toBe(true);
      expect(component.rowSelectionStates['row-2']).toBe(false);
      expect(component.rowSelectionStates['row-3']).toBe(false);
    });

    it('should hide checkboxes when row layout disabled', () => {
      mockRowLayoutEnabled.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const checkboxes = compiled.querySelectorAll('p-checkbox');

      expect(checkboxes.length).toBe(0);
    });
  });

  describe('AC #5: Keyboard Modifier Support', () => {
    it('should toggle single row selection on regular click (no modifiers)', () => {
      // Create mock event without modifiers
      const mockEvent = {
        checked: true,
        originalEvent: new MouseEvent('click', {
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        }),
      } as CheckboxChangeEvent;

      component.onRowCheckboxChange('row-1', true, mockEvent);

      expect(mockFormBuilderService.clearSelection).toHaveBeenCalled();
      expect(mockFormBuilderService.selectRow).toHaveBeenCalledWith('row-1');
    });

    it('should not select row on regular click when checkbox unchecked', () => {
      const mockEvent = {
        checked: false,
        originalEvent: new MouseEvent('click', {
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        }),
      } as CheckboxChangeEvent;

      component.onRowCheckboxChange('row-1', false, mockEvent);

      expect(mockFormBuilderService.clearSelection).toHaveBeenCalled();
      expect(mockFormBuilderService.selectRow).not.toHaveBeenCalled();
    });

    it('should toggle row selection on Ctrl+Click (multi-select)', () => {
      const mockEvent = {
        checked: true,
        originalEvent: new MouseEvent('click', {
          shiftKey: false,
          ctrlKey: true,
          metaKey: false,
        }),
      } as CheckboxChangeEvent;

      component.onRowCheckboxChange('row-1', true, mockEvent);

      expect(mockFormBuilderService.clearSelection).not.toHaveBeenCalled();
      expect(mockFormBuilderService.selectRow).toHaveBeenCalledWith('row-1');
    });

    it('should toggle row selection on Cmd+Click (multi-select on macOS)', () => {
      const mockEvent = {
        checked: true,
        originalEvent: new MouseEvent('click', {
          shiftKey: false,
          ctrlKey: false,
          metaKey: true,
        }),
      } as CheckboxChangeEvent;

      component.onRowCheckboxChange('row-2', true, mockEvent);

      expect(mockFormBuilderService.clearSelection).not.toHaveBeenCalled();
      expect(mockFormBuilderService.selectRow).toHaveBeenCalledWith('row-2');
    });

    it('should select range on Shift+Click', () => {
      // First select a row to set anchor
      const firstClickEvent = {
        checked: true,
        originalEvent: new MouseEvent('click', {
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        }),
      } as CheckboxChangeEvent;
      component.onRowCheckboxChange('row-1', true, firstClickEvent);

      // Then Shift+Click another row to select range
      const shiftClickEvent = {
        checked: true,
        originalEvent: new MouseEvent('click', {
          shiftKey: true,
          ctrlKey: false,
          metaKey: false,
        }),
      } as CheckboxChangeEvent;
      component.onRowCheckboxChange('row-3', true, shiftClickEvent);

      expect(mockFormBuilderService.selectRowRange).toHaveBeenCalledWith('row-1', 'row-3');
    });

    it('should not select range on Shift+Click if no previous selection', () => {
      const mockEvent = {
        checked: true,
        originalEvent: new MouseEvent('click', {
          shiftKey: true,
          ctrlKey: false,
          metaKey: false,
        }),
      } as CheckboxChangeEvent;

      // No previous selection, should fall through to Ctrl/regular logic
      component.onRowCheckboxChange('row-2', true, mockEvent);

      expect(mockFormBuilderService.selectRowRange).not.toHaveBeenCalled();
    });

    it('should update lastSelectedRowId after each checkbox change', () => {
      const mockEvent = {
        checked: true,
        originalEvent: new MouseEvent('click'),
      } as CheckboxChangeEvent;

      component.onRowCheckboxChange('row-1', true, mockEvent);
      expect(component['lastSelectedRowId']()).toBe('row-1');

      component.onRowCheckboxChange('row-2', true, mockEvent);
      expect(component['lastSelectedRowId']()).toBe('row-2');
    });
  });

  describe('AC #6: Batch Actions Toolbar', () => {
    it('should show batch toolbar when 2+ rows selected', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const toolbar = compiled.querySelector('.batch-toolbar');

      expect(toolbar).toBeTruthy();
      expect(toolbar?.textContent).toContain('2 rows selected');
    });

    it('should show batch toolbar with correct count for 3+ rows', () => {
      mockSelectedRowIds.set(['row-1', 'row-2', 'row-3']);
      mockSelectedRowCount.set(3);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const toolbar = compiled.querySelector('.batch-toolbar');

      expect(toolbar).toBeTruthy();
      expect(toolbar?.textContent).toContain('3 rows selected');
    });

    it('should hide batch toolbar when only 1 row selected', () => {
      mockSelectedRowIds.set(['row-1']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const toolbar = compiled.querySelector('.batch-toolbar');

      expect(toolbar).toBeFalsy();
    });

    it('should hide batch toolbar when no rows selected', () => {
      mockSelectedRowIds.set([]);
      mockSelectedRowCount.set(0);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const toolbar = compiled.querySelector('.batch-toolbar');

      expect(toolbar).toBeFalsy();
    });

    it('should render Duplicate Selected button with correct attributes', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const duplicateBtn = compiled.querySelector(
        '.batch-toolbar button[label="Duplicate Selected"]',
      );

      expect(duplicateBtn).toBeTruthy();
      expect(duplicateBtn?.getAttribute('icon')).toBe('pi pi-copy');
      expect(duplicateBtn?.getAttribute('severity')).toBe('primary');
    });

    it('should render Clear Selection button with correct attributes', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const clearBtn = compiled.querySelector('.batch-toolbar button[label="Clear"]');

      expect(clearBtn).toBeTruthy();
      expect(clearBtn?.getAttribute('icon')).toBe('pi pi-times');
      expect(clearBtn?.getAttribute('severity')).toBe('secondary');
    });
  });

  describe('AC #6: Batch Button Handlers', () => {
    it('should call duplicateRows when Duplicate Selected clicked', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);

      component.onDuplicateSelected();

      expect(mockFormBuilderService.duplicateRows).toHaveBeenCalledWith(['row-1', 'row-2']);
    });

    it('should call clearSelection when Clear Selection clicked', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);

      component.onClearSelection();

      expect(mockFormBuilderService.clearSelection).toHaveBeenCalled();
    });

    it('should clear lastSelectedRowId when Clear Selection clicked', () => {
      // Set up selection state
      mockSelectedRowIds.set(['row-1']);
      mockSelectedRowCount.set(1);
      component['lastSelectedRowId'].set('row-1');

      component.onClearSelection();

      expect(component['lastSelectedRowId']()).toBeNull();
    });
  });

  describe('AC #7: Visual Selection Feedback', () => {
    it('should apply blue border class to selected rows', () => {
      mockSelectedRowIds.set(['row-1']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const rowItems = compiled.querySelectorAll('.row-item');

      expect(rowItems[0].classList.contains('border-blue-500')).toBe(true);
      expect(rowItems[1].classList.contains('border-blue-500')).toBe(false);
      expect(rowItems[2].classList.contains('border-blue-500')).toBe(false);
    });

    it('should apply blue background class to selected rows', () => {
      mockSelectedRowIds.set(['row-2']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const rowItems = compiled.querySelectorAll('.row-item');

      expect(rowItems[0].classList.contains('bg-blue-50')).toBe(false);
      expect(rowItems[1].classList.contains('bg-blue-50')).toBe(true);
      expect(rowItems[2].classList.contains('bg-blue-50')).toBe(false);
    });

    it('should apply gray border/white background to non-selected rows', () => {
      mockSelectedRowIds.set(['row-1']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const rowItems = compiled.querySelectorAll('.row-item');

      expect(rowItems[1].classList.contains('border-gray-200')).toBe(true);
      expect(rowItems[1].classList.contains('bg-white')).toBe(true);
    });

    it('should update visual feedback when selection changes', () => {
      // Initial selection
      mockSelectedRowIds.set(['row-1']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const rowItems = compiled.querySelectorAll('.row-item');

      expect(rowItems[0].classList.contains('border-blue-500')).toBe(true);
      expect(rowItems[1].classList.contains('border-blue-500')).toBe(false);

      // Change selection
      mockSelectedRowIds.set(['row-2']);
      fixture.detectChanges();

      expect(rowItems[0].classList.contains('border-blue-500')).toBe(false);
      expect(rowItems[1].classList.contains('border-blue-500')).toBe(true);
    });
  });

  describe('AC #9: Published Form Readonly Mode', () => {
    it('should disable checkboxes when form is published', () => {
      mockIsPublished.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const checkboxes = compiled.querySelectorAll('p-checkbox');

      checkboxes.forEach((checkbox) => {
        expect(checkbox.hasAttribute('disabled')).toBe(true);
      });
    });

    it('should enable checkboxes when form is not published', () => {
      mockIsPublished.set(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const checkboxes = compiled.querySelectorAll('p-checkbox');

      checkboxes.forEach((checkbox) => {
        expect(checkbox.hasAttribute('disabled')).toBe(false);
      });
    });

    it('should disable Duplicate Selected button when form published', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);
      mockIsPublished.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const duplicateBtn = compiled.querySelector(
        '.batch-toolbar button[label="Duplicate Selected"]',
      );

      expect(duplicateBtn?.hasAttribute('disabled')).toBe(true);
    });

    it('should keep Clear Selection button enabled when form published', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);
      mockIsPublished.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const clearBtn = compiled.querySelector('.batch-toolbar button[label="Clear"]');

      // Clear button should not have disabled attribute
      expect(clearBtn?.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('AC #3: Batch Duplication with Selection Clearing', () => {
    it('should clear selection after successful batch duplication', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);

      component.onDuplicateSelected();

      // duplicateRows mock already clears selection
      expect(mockSelectedRowIds()).toEqual([]);
      expect(mockSelectedRowCount()).toBe(0);
    });

    it('should return array of new row IDs from duplicateRows', () => {
      mockSelectedRowIds.set(['row-1', 'row-2']);
      mockSelectedRowCount.set(2);

      component.onDuplicateSelected();

      // Verify duplicateRows was called and would return new IDs
      expect(mockFormBuilderService.duplicateRows).toHaveBeenCalledWith(['row-1', 'row-2']);
    });
  });

  describe('AC #10: Backward Compatibility', () => {
    it('should preserve existing single-row duplicate button functionality', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const singleDuplicateBtns = compiled.querySelectorAll('.row-item button[icon="pi pi-copy"]');

      // Should have one duplicate button per row (Story 28.1 functionality)
      expect(singleDuplicateBtns.length).toBe(3);
    });

    it('should call duplicateRow for single-row duplication', () => {
      component.onDuplicateRow('row-1');

      expect(mockFormBuilderService.duplicateRow).toHaveBeenCalledWith('row-1');
    });

    it('should not interfere with single-row duplicate when selection active', () => {
      mockSelectedRowIds.set(['row-2', 'row-3']);
      mockSelectedRowCount.set(2);

      // Single duplicate should still work independently
      component.onDuplicateRow('row-1');

      expect(mockFormBuilderService.duplicateRow).toHaveBeenCalledWith('row-1');
      expect(mockFormBuilderService.duplicateRows).not.toHaveBeenCalled();
    });
  });

  describe('Constructor Effect: Checkbox State Sync', () => {
    it('should sync checkbox states with service selection on init', () => {
      mockSelectedRowIds.set(['row-1', 'row-3']);
      mockSelectedRowCount.set(2);
      fixture.detectChanges();

      expect(component.rowSelectionStates['row-1']).toBe(true);
      expect(component.rowSelectionStates['row-2']).toBe(false);
      expect(component.rowSelectionStates['row-3']).toBe(true);
    });

    it('should update checkbox states when service selection changes', () => {
      // Initial state
      mockSelectedRowIds.set(['row-1']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      expect(component.rowSelectionStates['row-1']).toBe(true);
      expect(component.rowSelectionStates['row-2']).toBe(false);

      // Change selection via service
      mockSelectedRowIds.set(['row-2']);
      mockSelectedRowCount.set(1);
      fixture.detectChanges();

      expect(component.rowSelectionStates['row-1']).toBe(false);
      expect(component.rowSelectionStates['row-2']).toBe(true);
    });
  });
});
