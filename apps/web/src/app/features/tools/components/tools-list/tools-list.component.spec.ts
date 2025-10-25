// tools-list.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { ToolsListComponent } from './tools-list.component';
import { ToolRegistryService } from '@core/services/tool-registry.service';
import { ToolRegistryRecord, ToolStatus } from '@nodeangularfullstack/shared';
import { By } from '@angular/platform-browser';

describe('ToolsListComponent', () => {
  let component: ToolsListComponent;
  let fixture: ComponentFixture<ToolsListComponent>;
  let mockToolRegistryService: jasmine.SpyObj<ToolRegistryService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let queryParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockTools: ToolRegistryRecord[] = [
    {
      id: '1',
      tool_id: 'form-builder',
      name: 'Form Builder',
      description: 'Build custom forms',
      version: '1.0.0',
      icon: 'pi-box',
      route: '/tools/form-builder',
      api_base: '/api/form-builder',
      permissions: ['read', 'write'],
      status: 'registered' as ToolStatus,
      is_exported: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '2',
      tool_id: 'analytics',
      name: 'Analytics',
      description: 'View analytics dashboard',
      version: '1.0.0',
      icon: 'pi-chart-bar',
      route: '/tools/analytics',
      api_base: '/api/analytics',
      permissions: ['read'],
      status: 'draft' as ToolStatus,
      is_exported: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '3',
      tool_id: 'reporting',
      name: 'Reporting',
      description: 'Generate reports',
      version: '1.0.0',
      icon: 'pi-file',
      route: '/tools/reporting',
      api_base: '/api/reporting',
      permissions: ['read'],
      status: 'registered' as ToolStatus,
      is_exported: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<Record<string, string>>({});

    mockToolRegistryService = jasmine.createSpyObj('ToolRegistryService', [
      'getAllTools',
      'refreshCache',
      'searchTools',
    ]);
    mockToolRegistryService.getAllTools.and.returnValue(of(mockTools));
    mockToolRegistryService.searchTools.and.returnValue(of(mockTools));

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ToolsListComponent],
      providers: [
        { provide: ToolRegistryService, useValue: mockToolRegistryService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Data Fetching', () => {
    it('should fetch tools on init', () => {
      fixture.detectChanges();
      expect(mockToolRegistryService.getAllTools).toHaveBeenCalled();
    });

    it('should update tools signal on success', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.tools().length).toBe(3);
        expect(component.tools()[0].tool_id).toBe('form-builder');
        done();
      }, 0);
    });

    it('should set loading false after fetch', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.loading()).toBe(false);
        done();
      }, 0);
    });

    it('should handle fetch error', (done) => {
      const errorMessage = 'Network error';
      mockToolRegistryService.getAllTools.and.returnValue(
        throwError(() => ({ message: errorMessage })),
      );

      fixture.detectChanges();

      setTimeout(() => {
        expect(component.error()).toBe(errorMessage);
        expect(component.loading()).toBe(false);
        done();
      }, 0);
    });

    it('should emit toolsLoaded event', (done) => {
      spyOn(component.toolsLoaded, 'emit');
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.toolsLoaded.emit).toHaveBeenCalledWith(mockTools);
        done();
      }, 0);
    });
  });

  describe('Rendering', () => {
    it('should display loading skeleton initially', () => {
      const compiled = fixture.debugElement;
      const skeletonCards = compiled.queryAll(By.css('.tools-grid-skeleton app-tool-card'));

      expect(skeletonCards.length).toBe(8);
    });

    it('should render tool cards after loading', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const toolCards = fixture.debugElement.queryAll(By.css('.tools-grid app-tool-card'));
        expect(toolCards.length).toBe(3);
        done();
      }, 0);
    });

    it('should display empty state when no tools', (done) => {
      mockToolRegistryService.getAllTools.and.returnValue(of([]));
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const emptyState = fixture.debugElement.query(By.css('.empty-state'));
        expect(emptyState).toBeTruthy();
        expect(emptyState.nativeElement.textContent).toContain('No Tools Found');
        done();
      }, 0);
    });

    it('should display error state on failure', (done) => {
      mockToolRegistryService.getAllTools.and.returnValue(
        throwError(() => ({ message: 'Failed to load' })),
      );
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const errorState = fixture.debugElement.query(By.css('.error-state'));
        expect(errorState).toBeTruthy();
        expect(errorState.nativeElement.textContent).toContain('Failed to load');
        done();
      }, 0);
    });
  });

  describe('Interactions', () => {
    it('should navigate on tool click', (done) => {
      fixture.detectChanges();

      setTimeout(() => {
        component.onToolClick(mockTools[0]);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/tools', 'form-builder']);
        done();
      }, 0);
    });

    it('should refresh tools on retry', () => {
      component.refreshTools();
      expect(mockToolRegistryService.refreshCache).toHaveBeenCalled();
      expect(mockToolRegistryService.getAllTools).toHaveBeenCalledTimes(2); // init + refresh
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
      tick(); // Complete initial load
    });

    it('should debounce search input', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'form' });
      tick(100); // Not enough time
      expect(mockToolRegistryService.searchTools).not.toHaveBeenCalled();

      tick(200); // Total 300ms
      expect(mockToolRegistryService.searchTools).toHaveBeenCalledWith('form');
      flush();
    }));

    it('should not search for queries < 2 chars', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'a' });
      tick(300);
      expect(mockToolRegistryService.searchTools).not.toHaveBeenCalled();
      flush();
    }));

    it('should call searchTools service method', fakeAsync(() => {
      const searchQuery = 'analytics';
      mockToolRegistryService.searchTools.and.returnValue(of([mockTools[1]]));

      component.filterForm.patchValue({ search: searchQuery });
      tick(300);

      expect(mockToolRegistryService.searchTools).toHaveBeenCalledWith(searchQuery);
      flush();
    }));

    it('should clear search on X button', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'test' });
      tick(300);

      component.filterForm.patchValue({ search: '' });
      tick(300);

      expect(component.filterForm.get('search')?.value).toBe('');
      flush();
    }));

    it('should set searching state during search', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'form' });
      tick(300);

      expect(component.searching()).toBe(true);

      tick(); // Complete observable
      expect(component.searching()).toBe(false);
      flush();
    }));

    it('should handle search error', fakeAsync(() => {
      const errorMessage = 'Search failed';
      mockToolRegistryService.searchTools.and.returnValue(
        throwError(() => ({ message: errorMessage })),
      );

      component.filterForm.patchValue({ search: 'error' });
      tick(300);
      tick(); // Complete observable

      expect(component.error()).toBe(errorMessage);
      expect(component.searching()).toBe(false);
      flush();
    }));

    it('should use distinctUntilChanged', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'form' });
      tick(300);
      expect(mockToolRegistryService.searchTools).toHaveBeenCalledTimes(1);

      component.filterForm.patchValue({ search: 'form' }); // Same value
      tick(300);
      expect(mockToolRegistryService.searchTools).toHaveBeenCalledTimes(1); // Not called again
      flush();
    }));
  });

  describe('Status Filtering', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should filter by status', fakeAsync(() => {
      component.filterForm.patchValue({ status: 'registered' });
      tick();

      const filtered = component.filteredTools();
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.status === ('registered' as ToolStatus))).toBe(true);
    }));

    it('should show all tools when status is null', fakeAsync(() => {
      component.filterForm.patchValue({ status: null });
      tick();

      const filtered = component.filteredTools();
      expect(filtered.length).toBe(3);
    }));

    it('should combine search and status filters', fakeAsync(() => {
      // Set tools with search query
      mockToolRegistryService.searchTools.and.returnValue(
        of([mockTools[0], mockTools[2]]), // Both registered
      );

      component.filterForm.patchValue({ search: 'form' });
      tick(300);
      tick();

      component.filterForm.patchValue({ status: 'registered' });
      tick();

      const filtered = component.filteredTools();
      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.status === ('registered' as ToolStatus))).toBe(true);
      flush();
    }));

    it('should update URL params on status change', fakeAsync(() => {
      component.filterForm.patchValue({ status: 'draft' });
      tick();

      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: jasmine.anything(),
        queryParams: { status: 'draft' },
        queryParamsHandling: 'merge',
      });
    }));
  });

  describe('Clear Filters', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should clear all filters on clear button', fakeAsync(() => {
      component.filterForm.patchValue({
        search: 'test',
        status: 'draft',
      });
      tick(300);

      component.clearFilters();
      tick();

      expect(component.filterForm.get('search')?.value).toBe('');
      expect(component.filterForm.get('status')?.value).toBeNull();
      flush();
    }));

    it('should reload tools after clearing filters', fakeAsync(() => {
      const initialCallCount = mockToolRegistryService.getAllTools.calls.count();

      component.filterForm.patchValue({ search: 'test' });
      tick(300);

      component.clearFilters();
      tick();

      expect(mockToolRegistryService.getAllTools.calls.count()).toBeGreaterThan(initialCallCount);
      flush();
    }));

    it('should update hasActiveFilters computed', fakeAsync(() => {
      expect(component.hasActiveFilters()).toBe(false);

      component.filterForm.patchValue({ search: 'test' });
      tick();
      expect(component.hasActiveFilters()).toBe(true);

      component.clearFilters();
      tick();
      expect(component.hasActiveFilters()).toBe(false);
      flush();
    }));
  });

  describe('Result Count', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should update result count correctly', fakeAsync(() => {
      expect(component.resultCount()).toBe(3);

      component.filterForm.patchValue({ status: 'registered' });
      tick();
      expect(component.resultCount()).toBe(2);

      component.filterForm.patchValue({ status: 'draft' });
      tick();
      expect(component.resultCount()).toBe(1);
    }));

    it('should calculate total count', fakeAsync(() => {
      expect(component.totalCount()).toBe(3);
    }));
  });

  describe('Empty States', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should show no-results state for no matches with filters', fakeAsync(() => {
      component.filterForm.patchValue({ status: 'archived' });
      tick();
      fixture.detectChanges();

      const noResultsState = fixture.debugElement.query(By.css('.no-results-state'));
      expect(noResultsState).toBeTruthy();
      expect(noResultsState.nativeElement.textContent).toContain('No Tools Match Your Filters');
    }));

    it('should show empty state when no tools and no filters', fakeAsync(() => {
      mockToolRegistryService.getAllTools.and.returnValue(of([]));
      component.filterForm.reset();
      tick();
      // Trigger reload
      component['loadTools']();
      tick();
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
      expect(emptyState.nativeElement.textContent).toContain('No Tools Found');
    }));

    it('should display active filters in no-results state', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'nonexistent', status: 'archived' });
      tick(300);
      tick();
      fixture.detectChanges();

      const filterChips = fixture.debugElement.queryAll(By.css('.filter-chip'));
      expect(filterChips.length).toBeGreaterThan(0);
    }));
  });

  describe('URL Query Parameters', () => {
    it('should restore filters from URL on init', fakeAsync(() => {
      queryParamsSubject.next({ q: 'analytics', status: 'draft' });

      const newFixture = TestBed.createComponent(ToolsListComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();
      tick();

      expect(newComponent.filterForm.get('search')?.value).toBe('analytics');
      expect(newComponent.filterForm.get('status')?.value).toBe('draft');
      flush();
    }));

    it('should update URL on search change', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'analytics' });
      tick(300);

      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: jasmine.anything(),
        queryParams: { q: 'analytics' },
        queryParamsHandling: 'merge',
      });
      flush();
    }));

    it('should not add query param for search < 2 chars', fakeAsync(() => {
      mockRouter.navigate.calls.reset();
      component.filterForm.patchValue({ search: 'a' });
      tick(300);

      const calls = mockRouter.navigate.calls.all();
      const hasShortQuery = calls.some((call) => call.args[1]?.queryParams?.['q'] === 'a');
      expect(hasShortQuery).toBe(false);
      flush();
    }));
  });

  describe('Client-Side Filtering', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should filter tools case-insensitively', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'FORM' });
      tick();

      const filtered = component.filteredTools();
      const hasFormBuilder = filtered.some((t) => t.tool_id === 'form-builder');
      expect(hasFormBuilder).toBe(true);
    }));

    it('should search in both name and description', fakeAsync(() => {
      component.filterForm.patchValue({ search: 'dashboard' });
      tick();

      const filtered = component.filteredTools();
      const hasAnalytics = filtered.some((t) => t.tool_id === 'analytics');
      expect(hasAnalytics).toBe(true);
    }));

    it('should handle edge cases gracefully', fakeAsync(() => {
      component.filterForm.patchValue({ search: null, status: null });
      tick();

      expect(() => component.filteredTools()).not.toThrow();
      expect(component.filteredTools().length).toBe(3);
    }));
  });
});
