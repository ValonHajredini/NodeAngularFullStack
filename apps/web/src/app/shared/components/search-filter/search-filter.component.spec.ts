import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SearchFilterComponent } from './search-filter.component';

describe('SearchFilterComponent', () => {
  let component: SearchFilterComponent;
  let fixture: ComponentFixture<SearchFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilterComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Search functionality', () => {
    it('should initialize with empty search query', () => {
      expect(component.searchQuery()).toBe('');
    });

    it('should update search query when model changes', () => {
      component.searchQuery.set('test query');
      expect(component.searchQuery()).toBe('test query');
    });

    it('should clear search query when clearFilters is called', () => {
      component.searchQuery.set('test query');
      component.clearFilters();
      expect(component.searchQuery()).toBe('');
    });
  });

  describe('Status filter functionality', () => {
    it('should initialize with "all" status filter', () => {
      expect(component.statusFilter()).toBe('all');
    });

    it('should update status filter when set', () => {
      component.statusFilter.set('active');
      expect(component.statusFilter()).toBe('active');
    });

    it('should reset status filter to "all" when clearFilters is called', () => {
      component.statusFilter.set('active');
      component.clearFilters();
      expect(component.statusFilter()).toBe('all');
    });

    it('should handle status filter change with checked event', () => {
      component.onStatusFilterChange('active', { checked: true });
      expect(component.statusFilter()).toBe('active');
    });

    it('should default to "all" when unchecking a filter', () => {
      component.statusFilter.set('active');
      component.onStatusFilterChange('active', { checked: false });
      expect(component.statusFilter()).toBe('all');
    });
  });

  describe('Filters expansion', () => {
    it('should initialize with filters collapsed', () => {
      expect(component.filtersExpanded()).toBe(false);
    });

    it('should toggle filters expanded state', () => {
      component.toggleFilters();
      expect(component.filtersExpanded()).toBe(true);

      component.toggleFilters();
      expect(component.filtersExpanded()).toBe(false);
    });
  });

  describe('Output events', () => {
    it('should emit refresh event when onRefresh is called', (done) => {
      component.refresh.subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      component.onRefresh();
    });

    it('should emit bulkActionClick with "enable" when onBulkEnable is called', (done) => {
      component.bulkActionClick.subscribe((action) => {
        expect(action).toBe('enable');
        done();
      });

      component.onBulkEnable();
    });

    it('should emit bulkActionClick with "disable" when onBulkDisable is called', (done) => {
      component.bulkActionClick.subscribe((action) => {
        expect(action).toBe('disable');
        done();
      });

      component.onBulkDisable();
    });

    it('should emit clearSelection event when onClearSelection is called', (done) => {
      component.clearSelection.subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      component.onClearSelection();
    });
  });

  describe('Bulk actions', () => {
    it('should return false when no bulk actions are configured', () => {
      expect(component.hasBulkActions()).toBe(false);
    });

    it('should return true when enable bulk actions are configured', () => {
      fixture.componentRef.setInput('enableBulkActions', [
        { label: 'Enable', icon: 'pi pi-check', severity: 'success' as const },
      ]);
      expect(component.hasBulkActions()).toBe(true);
    });

    it('should return true when disable bulk actions are configured', () => {
      fixture.componentRef.setInput('disableBulkActions', [
        { label: 'Disable', icon: 'pi pi-times', severity: 'danger' as const },
      ]);
      expect(component.hasBulkActions()).toBe(true);
    });
  });

  describe('Input defaults', () => {
    it('should have default search placeholder', () => {
      expect(component.searchPlaceholder()).toBe('Search by name, key, or description...');
    });

    it('should show status filter by default', () => {
      expect(component.showStatusFilter()).toBe(true);
    });

    it('should show refresh button by default', () => {
      expect(component.showRefreshButton()).toBe(true);
    });

    it('should hide bulk actions by default', () => {
      expect(component.showBulkActions()).toBe(false);
    });

    it('should have empty bulk action arrays by default', () => {
      expect(component.enableBulkActions()).toEqual([]);
      expect(component.disableBulkActions()).toEqual([]);
    });

    it('should have zero selected count by default', () => {
      expect(component.selectedCount()).toBe(0);
    });
  });
});
