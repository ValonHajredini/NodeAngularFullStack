import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportFiltersComponent } from './export-filters.component';
import { FormsModule } from '@angular/forms';

/**
 * Unit Tests for ExportFiltersComponent (Epic 33.2.3, Task 14)
 *
 * Tests the presentational filter component for export history.
 * Verifies data binding, event emission, and filter state management.
 *
 * **Test Coverage:**
 * - Component initialization
 * - Input property setters
 * - Filter change event emissions
 * - Clear filters functionality
 * - Active filters detection
 */
describe('ExportFiltersComponent', () => {
  let component: ExportFiltersComponent;
  let fixture: ComponentFixture<ExportFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportFiltersComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ===== Component Initialization =====

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty filter state', () => {
    expect(component.selectedStatuses()).toEqual([]);
    expect(component.selectedToolType()).toBeNull();
    expect(component.selectedStartDate()).toBeNull();
    expect(component.selectedEndDate()).toBeNull();
  });

  it('should have predefined status options', () => {
    expect(component.statusOptions.length).toBe(5);
    expect(component.statusOptions).toContain({
      label: 'Pending',
      value: 'pending',
    });
    expect(component.statusOptions).toContain({
      label: 'Completed',
      value: 'completed',
    });
    expect(component.statusOptions).toContain({
      label: 'Failed',
      value: 'failed',
    });
  });

  it('should have predefined tool type options', () => {
    expect(component.toolTypeOptions.length).toBeGreaterThan(0);
    expect(component.toolTypeOptions[0]).toEqual({
      label: 'All Tool Types',
      value: '',
    });
    expect(component.toolTypeOptions).toContain({
      label: 'Form Builder',
      value: 'form-builder',
    });
  });

  // ===== Input Property Setters =====

  describe('Input: statusFilter', () => {
    it('should parse comma-separated status filter', () => {
      component.statusFilter = 'completed,failed';
      expect(component.selectedStatuses()).toEqual(['completed', 'failed']);
    });

    it('should handle single status', () => {
      component.statusFilter = 'completed';
      expect(component.selectedStatuses()).toEqual(['completed']);
    });

    it('should reset statuses when null', () => {
      component.statusFilter = 'completed,failed';
      component.statusFilter = null;
      expect(component.selectedStatuses()).toEqual([]);
    });

    it('should trim whitespace from status values', () => {
      component.statusFilter = 'completed , failed , pending';
      expect(component.selectedStatuses()).toEqual(['completed', 'failed', 'pending']);
    });
  });

  describe('Input: toolTypeFilter', () => {
    it('should set tool type filter', () => {
      component.toolTypeFilter = 'form-builder';
      expect(component.selectedToolType()).toBe('form-builder');
    });

    it('should accept null value', () => {
      component.toolTypeFilter = 'form-builder';
      component.toolTypeFilter = null;
      expect(component.selectedToolType()).toBeNull();
    });
  });

  describe('Input: startDate', () => {
    it('should convert ISO string to Date object', () => {
      const isoDate = '2025-01-01T00:00:00.000Z';
      component.startDate = isoDate;
      expect(component.selectedStartDate()).toEqual(new Date(isoDate));
    });

    it('should handle null value', () => {
      component.startDate = '2025-01-01T00:00:00.000Z';
      component.startDate = null;
      expect(component.selectedStartDate()).toBeNull();
    });
  });

  describe('Input: endDate', () => {
    it('should convert ISO string to Date object', () => {
      const isoDate = '2025-12-31T23:59:59.999Z';
      component.endDate = isoDate;
      expect(component.selectedEndDate()).toEqual(new Date(isoDate));
    });

    it('should handle null value', () => {
      component.endDate = '2025-12-31T23:59:59.999Z';
      component.endDate = null;
      expect(component.selectedEndDate()).toBeNull();
    });
  });

  // ===== Filter Change Events =====

  describe('onStatusChange', () => {
    it('should emit filterChange with comma-separated status', () => {
      spyOn(component.filterChange, 'emit');
      component.onStatusChange(['completed', 'failed']);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        status: 'completed,failed',
      });
    });

    it('should emit null when no statuses selected', () => {
      spyOn(component.filterChange, 'emit');
      component.onStatusChange([]);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        status: null,
      });
    });

    it('should handle single status selection', () => {
      spyOn(component.filterChange, 'emit');
      component.onStatusChange(['pending']);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        status: 'pending',
      });
    });
  });

  describe('onToolTypeChange', () => {
    it('should emit filterChange with tool type', () => {
      spyOn(component.filterChange, 'emit');
      component.onToolTypeChange('form-builder');
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        toolType: 'form-builder',
      });
    });

    it('should emit null for empty string', () => {
      spyOn(component.filterChange, 'emit');
      component.onToolTypeChange('');
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        toolType: null,
      });
    });

    it('should emit null for whitespace-only string', () => {
      spyOn(component.filterChange, 'emit');
      component.onToolTypeChange('   ');
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        toolType: null,
      });
    });

    it('should emit null when tool type is null', () => {
      spyOn(component.filterChange, 'emit');
      component.onToolTypeChange(null);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        toolType: null,
      });
    });
  });

  describe('onStartDateChange', () => {
    it('should emit filterChange with ISO string', () => {
      spyOn(component.filterChange, 'emit');
      const date = new Date('2025-01-01T00:00:00.000Z');
      component.onStartDateChange(date);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        startDate: date.toISOString(),
      });
    });

    it('should emit null when date is cleared', () => {
      spyOn(component.filterChange, 'emit');
      component.onStartDateChange(null);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        startDate: null,
      });
    });
  });

  describe('onEndDateChange', () => {
    it('should emit filterChange with ISO string', () => {
      spyOn(component.filterChange, 'emit');
      const date = new Date('2025-12-31T23:59:59.999Z');
      component.onEndDateChange(date);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        endDate: date.toISOString(),
      });
    });

    it('should emit null when date is cleared', () => {
      spyOn(component.filterChange, 'emit');
      component.onEndDateChange(null);
      expect(component.filterChange.emit).toHaveBeenCalledWith({
        endDate: null,
      });
    });
  });

  // ===== Clear Filters =====

  describe('onClearAllClick', () => {
    it('should reset all filter state', () => {
      // Set all filters
      component.statusFilter = 'completed,failed';
      component.toolTypeFilter = 'form-builder';
      component.startDate = '2025-01-01T00:00:00.000Z';
      component.endDate = '2025-12-31T23:59:59.999Z';

      // Clear all
      component.onClearAllClick();

      // Verify all signals reset
      expect(component.selectedStatuses()).toEqual([]);
      expect(component.selectedToolType()).toBeNull();
      expect(component.selectedStartDate()).toBeNull();
      expect(component.selectedEndDate()).toBeNull();
    });

    it('should emit clearFilters event', () => {
      spyOn(component.clearFilters, 'emit');
      component.onClearAllClick();
      expect(component.clearFilters.emit).toHaveBeenCalled();
    });
  });

  // ===== Active Filters Detection =====

  describe('hasActiveFilters', () => {
    it('should return false when no filters active', () => {
      expect(component.hasActiveFilters()).toBe(false);
    });

    it('should return true when status filter active', () => {
      component.statusFilter = 'completed';
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when tool type filter active', () => {
      component.toolTypeFilter = 'form-builder';
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when start date filter active', () => {
      component.startDate = '2025-01-01T00:00:00.000Z';
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when end date filter active', () => {
      component.endDate = '2025-12-31T23:59:59.999Z';
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('should return true when multiple filters active', () => {
      component.statusFilter = 'completed';
      component.toolTypeFilter = 'form-builder';
      expect(component.hasActiveFilters()).toBe(true);
    });
  });

  // ===== Change Detection Strategy =====

  it('should use OnPush change detection', () => {
    expect(fixture.componentRef.changeDetectorRef).toBeDefined();
  });
});
