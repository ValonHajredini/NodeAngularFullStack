import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ExportDialogComponent } from './export-dialog.component';
import { FormsApiService } from '../forms-api.service';
import { FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Unit tests for ExportDialogComponent.
 * Tests field selection, date filtering, and CSV download functionality.
 */
describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;
  let formsApiService: jasmine.SpyObj<FormsApiService>;

  const mockFormFields = [
    {
      id: 'field-1',
      type: FormFieldType.TEXT,
      label: 'Name',
      fieldName: 'name',
      required: true,
      order: 1,
    },
    {
      id: 'field-2',
      type: FormFieldType.EMAIL,
      label: 'Email',
      fieldName: 'email',
      required: true,
      order: 2,
    },
    {
      id: 'field-3',
      type: FormFieldType.NUMBER,
      label: 'Age',
      fieldName: 'age',
      required: false,
      order: 3,
    },
  ];

  beforeEach(async () => {
    const formsApiServiceSpy = jasmine.createSpyObj('FormsApiService', ['exportSubmissions']);

    await TestBed.configureTestingModule({
      imports: [ExportDialogComponent, FormsModule],
      providers: [{ provide: FormsApiService, useValue: formsApiServiceSpy }],
    }).compileComponents();

    formsApiService = TestBed.inject(FormsApiService) as jasmine.SpyObj<FormsApiService>;

    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;

    // Set required inputs using signals
    fixture.componentRef.setInput('visible', signal(true));
    fixture.componentRef.setInput('formId', signal('test-form-id'));
    fixture.componentRef.setInput('formFields', signal(mockFormFields));
    fixture.componentRef.setInput('totalSubmissions', signal(100));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should select all fields by default', () => {
      expect(component.selectedFields().length).toBe(3);
      expect(component.selectedFields()).toContain('name');
      expect(component.selectedFields()).toContain('email');
      expect(component.selectedFields()).toContain('age');
    });

    it('should initialize with no date filters', () => {
      expect(component.dateFrom()).toBeNull();
      expect(component.dateTo()).toBeNull();
    });

    it('should initialize with no field filters', () => {
      expect(component.filterField()).toBe('');
      expect(component.filterValue()).toBe('');
    });
  });

  describe('Field Selection', () => {
    it('should select all fields when selectAllFields is called', () => {
      component.selectedFields.set([]);
      component.selectAllFields();

      expect(component.selectedFields().length).toBe(3);
      expect(component.selectedFields()).toContain('name');
      expect(component.selectedFields()).toContain('email');
      expect(component.selectedFields()).toContain('age');
    });

    it('should deselect all non-required fields when deselectAllFields is called', () => {
      component.deselectAllFields();

      expect(component.selectedFields().length).toBe(2); // Only required fields
      expect(component.selectedFields()).toContain('name');
      expect(component.selectedFields()).toContain('email');
      expect(component.selectedFields()).not.toContain('age'); // Not required
    });
  });

  describe('Date Range Validation', () => {
    it('should not show validation error when dates are valid', () => {
      component.dateFrom.set(new Date('2024-01-01'));
      component.dateTo.set(new Date('2024-12-31'));

      expect(component.dateValidationError()).toBeNull();
    });

    it('should show validation error when from date is after to date', () => {
      component.dateFrom.set(new Date('2024-12-31'));
      component.dateTo.set(new Date('2024-01-01'));

      expect(component.dateValidationError()).toBe('From date cannot be after To date');
    });

    it('should not show error when only one date is set', () => {
      component.dateFrom.set(new Date('2024-01-01'));
      component.dateTo.set(null);

      expect(component.dateValidationError()).toBeNull();
    });
  });

  describe('Reset Filters', () => {
    it('should reset all filters to default values', () => {
      component.selectedFields.set(['name']);
      component.dateFrom.set(new Date('2024-01-01'));
      component.dateTo.set(new Date('2024-12-31'));
      component.filterField.set('status');
      component.filterValue.set('approved');

      component.resetFilters();

      expect(component.selectedFields().length).toBe(3);
      expect(component.dateFrom()).toBeNull();
      expect(component.dateTo()).toBeNull();
      expect(component.filterField()).toBe('');
      expect(component.filterValue()).toBe('');
    });
  });

  describe('Export', () => {
    it('should trigger export with correct parameters', () => {
      const mockBlob = new Blob(['test csv data'], { type: 'text/csv' });
      formsApiService.exportSubmissions.and.returnValue(of(mockBlob));

      // Set up test data
      component.selectedFields.set(['name', 'email']);
      component.dateFrom.set(new Date('2024-01-01'));
      component.dateTo.set(new Date('2024-12-31'));
      component.filterField.set('status');
      component.filterValue.set('approved');

      component.onExport();

      expect(formsApiService.exportSubmissions).toHaveBeenCalledWith('test-form-id', {
        fields: 'name,email',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        filterField: 'status',
        filterValue: 'approved',
      });
    });

    it('should not export when date validation fails', () => {
      component.dateFrom.set(new Date('2024-12-31'));
      component.dateTo.set(new Date('2024-01-01'));

      component.onExport();

      expect(formsApiService.exportSubmissions).not.toHaveBeenCalled();
    });

    it('should trigger file download on successful export', (done) => {
      const mockBlob = new Blob(['test csv data'], { type: 'text/csv' });
      formsApiService.exportSubmissions.and.returnValue(of(mockBlob));

      // Spy on URL and createElement
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(window.URL, 'revokeObjectURL');
      spyOn(document, 'createElement').and.callThrough();

      component.onExport();

      // Wait for async operations
      setTimeout(() => {
        expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
        done();
      }, 100);
    });

    it('should close dialog on successful export', (done) => {
      const mockBlob = new Blob(['test csv data'], { type: 'text/csv' });
      formsApiService.exportSubmissions.and.returnValue(of(mockBlob));

      component.visible.set(true);
      component.onExport();

      // Wait for async operations
      setTimeout(() => {
        expect(component.visible()).toBe(false);
        done();
      }, 100);
    });

    it('should handle export errors gracefully', (done) => {
      formsApiService.exportSubmissions.and.returnValue(
        throwError(() => new Error('Export failed')),
      );

      spyOn(console, 'error');

      component.onExport();

      // Wait for async operations
      setTimeout(() => {
        expect(console.error).toHaveBeenCalledWith('Export failed:', jasmine.any(Error));
        expect(component.isExporting()).toBe(false);
        done();
      }, 100);
    });

    it('should set loading state during export', () => {
      const mockBlob = new Blob(['test csv data'], { type: 'text/csv' });
      formsApiService.exportSubmissions.and.returnValue(of(mockBlob));

      expect(component.isExporting()).toBe(false);

      component.onExport();

      expect(component.isExporting()).toBe(true);
    });
  });

  describe('Cancel', () => {
    it('should close dialog when cancel is clicked', () => {
      component.visible.set(true);
      component.onCancel();

      expect(component.visible()).toBe(false);
    });
  });

  describe('Estimated Row Count', () => {
    it('should return total submissions count as estimate', () => {
      expect(component.estimatedRowCount()).toBe(100);
    });
  });
});
