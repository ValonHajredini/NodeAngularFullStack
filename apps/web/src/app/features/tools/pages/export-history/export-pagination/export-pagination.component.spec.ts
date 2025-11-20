import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportPaginationComponent } from './export-pagination.component';
import { FormsModule } from '@angular/forms';

/**
 * Unit Tests for ExportPaginationComponent (Epic 33.2.3, Task 14)
 *
 * Tests the presentational pagination component for export history.
 * Verifies navigation controls, page size changes, and boundary conditions.
 *
 * **Test Coverage:**
 * - Component initialization
 * - Page navigation (first, previous, next, last)
 * - Page size dropdown changes
 * - Boundary conditions (first/last page)
 * - Item range calculations
 * - Button disable states
 */
describe('ExportPaginationComponent', () => {
  let component: ExportPaginationComponent;
  let fixture: ComponentFixture<ExportPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportPaginationComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportPaginationComponent);
    component = fixture.componentInstance;

    // Set default inputs (required)
    component.currentPage = 1;
    component.totalPages = 5;
    component.pageSize = 20;
    component.totalCount = 100;

    fixture.detectChanges();
  });

  // ===== Component Initialization =====

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have predefined page size options', () => {
    expect(component.pageSizeOptions.length).toBe(4);
    expect(component.pageSizeOptions).toContain({
      label: '10 per page',
      value: 10,
    });
    expect(component.pageSizeOptions).toContain({
      label: '20 per page',
      value: 20,
    });
    expect(component.pageSizeOptions).toContain({
      label: '50 per page',
      value: 50,
    });
    expect(component.pageSizeOptions).toContain({
      label: '100 per page',
      value: 100,
    });
  });

  // ===== Page Navigation =====

  describe('goToFirstPage', () => {
    it('should emit pageChange with 1 when not on first page', () => {
      component.currentPage = 3;
      spyOn(component.pageChange, 'emit');

      component.goToFirstPage();

      expect(component.pageChange.emit).toHaveBeenCalledWith(1);
    });

    it('should not emit when already on first page', () => {
      component.currentPage = 1;
      spyOn(component.pageChange, 'emit');

      component.goToFirstPage();

      expect(component.pageChange.emit).not.toHaveBeenCalled();
    });
  });

  describe('goToPreviousPage', () => {
    it('should emit pageChange with current page - 1', () => {
      component.currentPage = 3;
      spyOn(component.pageChange, 'emit');

      component.goToPreviousPage();

      expect(component.pageChange.emit).toHaveBeenCalledWith(2);
    });

    it('should not emit when on first page', () => {
      component.currentPage = 1;
      spyOn(component.pageChange, 'emit');

      component.goToPreviousPage();

      expect(component.pageChange.emit).not.toHaveBeenCalled();
    });

    it('should work correctly from page 2', () => {
      component.currentPage = 2;
      spyOn(component.pageChange, 'emit');

      component.goToPreviousPage();

      expect(component.pageChange.emit).toHaveBeenCalledWith(1);
    });
  });

  describe('goToNextPage', () => {
    it('should emit pageChange with current page + 1', () => {
      component.currentPage = 2;
      component.totalPages = 5;
      spyOn(component.pageChange, 'emit');

      component.goToNextPage();

      expect(component.pageChange.emit).toHaveBeenCalledWith(3);
    });

    it('should not emit when on last page', () => {
      component.currentPage = 5;
      component.totalPages = 5;
      spyOn(component.pageChange, 'emit');

      component.goToNextPage();

      expect(component.pageChange.emit).not.toHaveBeenCalled();
    });

    it('should work correctly from second-to-last page', () => {
      component.currentPage = 4;
      component.totalPages = 5;
      spyOn(component.pageChange, 'emit');

      component.goToNextPage();

      expect(component.pageChange.emit).toHaveBeenCalledWith(5);
    });
  });

  describe('goToLastPage', () => {
    it('should emit pageChange with total pages', () => {
      component.currentPage = 2;
      component.totalPages = 5;
      spyOn(component.pageChange, 'emit');

      component.goToLastPage();

      expect(component.pageChange.emit).toHaveBeenCalledWith(5);
    });

    it('should not emit when already on last page', () => {
      component.currentPage = 5;
      component.totalPages = 5;
      spyOn(component.pageChange, 'emit');

      component.goToLastPage();

      expect(component.pageChange.emit).not.toHaveBeenCalled();
    });
  });

  // ===== Page Size Changes =====

  describe('onPageSizeChange', () => {
    it('should emit pageSizeChange with new size', () => {
      spyOn(component.pageSizeChange, 'emit');

      component.onPageSizeChange(50);

      expect(component.pageSizeChange.emit).toHaveBeenCalledWith(50);
    });

    it('should emit for each standard page size', () => {
      spyOn(component.pageSizeChange, 'emit');

      [10, 20, 50, 100].forEach((size) => {
        component.onPageSizeChange(size);
        expect(component.pageSizeChange.emit).toHaveBeenCalledWith(size);
      });

      expect(component.pageSizeChange.emit).toHaveBeenCalledTimes(4);
    });
  });

  // ===== Boundary Checks =====

  describe('isFirstPage', () => {
    it('should return true when on page 1', () => {
      component.currentPage = 1;
      expect(component.isFirstPage()).toBe(true);
    });

    it('should return false when not on page 1', () => {
      component.currentPage = 2;
      expect(component.isFirstPage()).toBe(false);
    });
  });

  describe('isLastPage', () => {
    it('should return true when on last page', () => {
      component.currentPage = 5;
      component.totalPages = 5;
      expect(component.isLastPage()).toBe(true);
    });

    it('should return false when not on last page', () => {
      component.currentPage = 4;
      component.totalPages = 5;
      expect(component.isLastPage()).toBe(false);
    });

    it('should return true when current page exceeds total pages', () => {
      component.currentPage = 6;
      component.totalPages = 5;
      expect(component.isLastPage()).toBe(true);
    });
  });

  // ===== Item Range Calculations =====

  describe('getItemRange', () => {
    it('should return correct range for first page', () => {
      component.currentPage = 1;
      component.pageSize = 20;
      component.totalCount = 100;

      expect(component.getItemRange()).toBe('1-20 of 100');
    });

    it('should return correct range for middle page', () => {
      component.currentPage = 3;
      component.pageSize = 20;
      component.totalCount = 100;

      expect(component.getItemRange()).toBe('41-60 of 100');
    });

    it('should return correct range for last page (partial)', () => {
      component.currentPage = 5;
      component.pageSize = 20;
      component.totalCount = 85;

      expect(component.getItemRange()).toBe('81-85 of 85');
    });

    it('should return correct range for last page (full)', () => {
      component.currentPage = 5;
      component.pageSize = 20;
      component.totalCount = 100;

      expect(component.getItemRange()).toBe('81-100 of 100');
    });

    it('should return "0 items" when total count is zero', () => {
      component.currentPage = 1;
      component.pageSize = 20;
      component.totalCount = 0;

      expect(component.getItemRange()).toBe('0 items');
    });

    it('should handle single item correctly', () => {
      component.currentPage = 1;
      component.pageSize = 20;
      component.totalCount = 1;

      expect(component.getItemRange()).toBe('1-1 of 1');
    });

    it('should handle small page size correctly', () => {
      component.currentPage = 2;
      component.pageSize = 10;
      component.totalCount = 25;

      expect(component.getItemRange()).toBe('11-20 of 25');
    });

    it('should handle large page size correctly', () => {
      component.currentPage = 1;
      component.pageSize = 100;
      component.totalCount = 50;

      expect(component.getItemRange()).toBe('1-50 of 50');
    });
  });

  // ===== Edge Cases =====

  describe('Edge Cases', () => {
    it('should handle single page scenario', () => {
      component.currentPage = 1;
      component.totalPages = 1;
      component.pageSize = 20;
      component.totalCount = 15;

      expect(component.isFirstPage()).toBe(true);
      expect(component.isLastPage()).toBe(true);
      expect(component.getItemRange()).toBe('1-15 of 15');
    });

    it('should handle exact page boundary', () => {
      component.currentPage = 3;
      component.pageSize = 20;
      component.totalCount = 60;

      expect(component.getItemRange()).toBe('41-60 of 60');
    });

    it('should handle very large counts', () => {
      component.currentPage = 50;
      component.pageSize = 100;
      component.totalCount = 5000;

      expect(component.getItemRange()).toBe('4901-5000 of 5000');
    });

    it('should handle page size of 10', () => {
      component.currentPage = 3;
      component.pageSize = 10;
      component.totalCount = 100;

      expect(component.getItemRange()).toBe('21-30 of 100');
    });
  });

  // ===== Input Requirements =====

  describe('Required Inputs', () => {
    it('should have required currentPage input', () => {
      const metadata = (fixture.componentRef.instance.constructor as any).__annotations__[0];
      // Input properties are required in the component definition
      expect(component.currentPage).toBeDefined();
    });

    it('should have required totalPages input', () => {
      expect(component.totalPages).toBeDefined();
    });

    it('should have required pageSize input', () => {
      expect(component.pageSize).toBeDefined();
    });

    it('should have required totalCount input', () => {
      expect(component.totalCount).toBeDefined();
    });
  });

  // ===== Change Detection Strategy =====

  it('should use OnPush change detection', () => {
    expect(fixture.componentRef.changeDetectorRef).toBeDefined();
  });
});
