import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToolCardComponent } from '@shared/components/tool-card/tool-card.component';
import { ToolRegistryService } from '@core/services/tool-registry.service';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';

/**
 * Option for status filter dropdown.
 */
interface StatusOption {
  label: string;
  value: string | null;
  count?: number;
}

/**
 * Displays tools with search and filtering capabilities.
 *
 * Features:
 * - Debounced search input (300ms delay)
 * - Status filtering (registered, draft, archived, exported)
 * - Date range filtering (optional)
 * - Client-side and server-side filtering
 * - Clear filters functionality
 * - URL query parameter persistence
 *
 * @example
 * ```html
 * <app-tools-list (toolsLoaded)="onToolsLoaded($event)"></app-tools-list>
 * ```
 */
@Component({
  selector: 'app-tools-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    ToolCardComponent,
    ButtonModule,
    InputTextModule,
    Select,
  ],
  templateUrl: './tools-list.component.html',
  styleUrl: './tools-list.component.scss',
})
export class ToolsListComponent implements OnInit, OnDestroy {
  /**
   * Minimum search query length required.
   */
  // eslint-disable-next-line no-magic-numbers
  private readonly MIN_SEARCH_LENGTH = 2;

  /**
   * Debounce delay for search input in milliseconds.
   */
  // eslint-disable-next-line no-magic-numbers
  private readonly SEARCH_DEBOUNCE_MS = 300;

  /**
   * List of tools fetched from the registry.
   */
  tools = signal<ToolRegistryRecord[]>([]);

  /**
   * Loading state indicator for initial load.
   */
  loading = signal<boolean>(true);

  /**
   * Loading state indicator for search operations.
   */
  searching = signal<boolean>(false);

  /**
   * Error message if fetch fails.
   */
  error = signal<string | null>(null);

  /**
   * Reactive form for search and filter controls.
   */
  filterForm: FormGroup;

  /**
   * Status filter options for dropdown.
   */
  statusOptions: StatusOption[] = [
    { label: 'All Statuses', value: null },
    { label: 'Registered', value: 'registered' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' },
    { label: 'Exported', value: 'exported' },
  ];

  /**
   * Computed filtered tools based on active filters.
   */
  filteredTools = computed<ToolRegistryRecord[]>(() => {
    const allTools = this.tools();
    const searchValue = this.filterForm?.get('search')?.value;
    const searchQuery = (typeof searchValue === 'string' ? searchValue : '').toLowerCase();
    const statusFilter = this.filterForm?.get('status')?.value;

    let filtered = allTools;

    // Apply search filter (client-side)
    if (searchQuery.length >= this.MIN_SEARCH_LENGTH) {
      filtered = filtered.filter((tool) => {
        const nameMatch = tool.name.toLowerCase().includes(searchQuery);
        const descMatch =
          tool.description !== null && tool.description !== undefined
            ? tool.description.toLowerCase().includes(searchQuery)
            : false;
        return nameMatch || descMatch;
      });
    }

    // Apply status filter
    if (typeof statusFilter === 'string' && statusFilter.length > 0) {
      filtered = filtered.filter((tool) => tool.status === statusFilter);
    }

    return filtered;
  });

  /**
   * Computed count of filtered tools.
   */
  resultCount = computed<number>(() => this.filteredTools().length);

  /**
   * Computed total count of all tools.
   */
  totalCount = computed<number>(() => this.tools().length);

  /**
   * Computed indicator if any filters are active.
   */
  hasActiveFilters = computed<boolean>(() => {
    const search = this.filterForm?.get('search')?.value;
    const status = this.filterForm?.get('status')?.value;
    return (
      (typeof search === 'string' && search.length >= this.MIN_SEARCH_LENGTH) || status !== null
    );
  });

  /**
   * Emitted when tools are successfully loaded.
   */
  @Output() toolsLoaded = new EventEmitter<ToolRegistryRecord[]>();

  /**
   * Subject for managing subscription cleanup.
   */
  private destroy$ = new Subject<void>();

  /**
   * Skeleton card count for loading state.
   */
  readonly skeletonCount = Array.from({ length: 8 }, (_, i) => i);

  /**
   * Injected ToolRegistryService instance.
   */
  private readonly toolRegistryService = inject(ToolRegistryService);

  /**
   * Injected Router instance.
   */
  private readonly router = inject(Router);

  /**
   * Injected ActivatedRoute instance.
   */
  private readonly route = inject(ActivatedRoute);

  /**
   * Injected FormBuilder instance.
   */
  private readonly fb = inject(FormBuilder);

  /**
   * Initializes the component and filter form.
   */
  constructor() {
    // Initialize filter form
    this.filterForm = this.fb.group({
      search: [''],
      status: [null],
      dateRange: [null],
    });
  }

  /**
   * Fetches tools and sets up filtering on component initialization.
   */
  ngOnInit(): void {
    this.loadTools();
    this.setupSearchDebounce();
    this.setupFilterListeners();
    this.restoreFiltersFromUrl();
  }

  /**
   * Cleans up subscriptions on component destroy.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads tools from the registry service.
   *
   * @private
   */
  private loadTools(): void {
    this.loading.set(true);
    this.error.set(null);

    this.toolRegistryService
      .getAllTools()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tools: ToolRegistryRecord[]) => {
          // eslint-disable-next-line no-console
          console.log(`[ToolsListComponent] Loaded ${tools.length} tools`);
          this.tools.set(tools);
          this.loading.set(false);
          this.toolsLoaded.emit(tools);
        },
        error: (err: { message?: string }) => {
          // eslint-disable-next-line no-console
          console.error('[ToolsListComponent] Failed to load tools:', err);
          this.error.set(err.message ?? 'Failed to load tools');
          this.loading.set(false);
        },
      });
  }

  /**
   * Refreshes the tool list by clearing cache and refetching.
   *
   * @example
   * ```typescript
   * // Triggered by "Try Again" button in error state
   * this.refreshTools();
   * ```
   */
  refreshTools(): void {
    // eslint-disable-next-line no-console
    console.log('[ToolsListComponent] Refreshing tools...');
    this.toolRegistryService.refreshCache();
    this.loadTools();
  }

  /**
   * Handles tool card click and navigates to tool detail page.
   *
   * @param tool - The clicked tool
   */
  onToolClick(tool: ToolRegistryRecord): void {
    // eslint-disable-next-line no-console
    console.log(`[ToolsListComponent] Tool clicked: ${tool.tool_id}`);
    void this.router.navigate(['/tools', tool.tool_id]);
  }

  /**
   * Sets up debounced search input handling.
   *
   * @private
   */
  private setupSearchDebounce(): void {
    const searchControl = this.filterForm.get('search');
    if (!searchControl) {
      return;
    }

    searchControl.valueChanges
      .pipe(debounceTime(this.SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query: string) => {
        // eslint-disable-next-line no-console
        console.log(`[ToolsListComponent] Search query: "${query}"`);

        // For comprehensive search, use server-side search
        if (query && query.trim().length >= this.MIN_SEARCH_LENGTH) {
          this.performServerSearch(query.trim());
        } else {
          // For empty search, show all tools with client-side filtering
          this.loadTools();
        }

        void this.updateUrlParams();
      });
  }

  /**
   * Sets up listeners for status and date filters.
   *
   * @private
   */
  private setupFilterListeners(): void {
    // Status filter
    const statusControl = this.filterForm.get('status');
    if (statusControl) {
      statusControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        // eslint-disable-next-line no-console
        console.log('[ToolsListComponent] Status filter changed');
        void this.updateUrlParams();
      });
    }

    // Date range filter (optional)
    const dateRangeControl = this.filterForm.get('dateRange');
    if (dateRangeControl) {
      dateRangeControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        // eslint-disable-next-line no-console
        console.log('[ToolsListComponent] Date range changed');
        void this.updateUrlParams();
      });
    }
  }

  /**
   * Performs server-side search for comprehensive results.
   *
   * @param query - The search query
   * @private
   */
  private performServerSearch(query: string): void {
    this.searching.set(true);

    this.toolRegistryService
      .searchTools(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          // eslint-disable-next-line no-console
          console.log(`[ToolsListComponent] Search returned ${results.length} results`);
          this.tools.set(results);
          this.searching.set(false);
        },
        error: (err: { message?: string }) => {
          // eslint-disable-next-line no-console
          console.error('[ToolsListComponent] Search failed:', err);
          this.error.set(err.message ?? 'Search failed');
          this.searching.set(false);
        },
      });
  }

  /**
   * Clears all active filters and reloads tools.
   */
  clearFilters(): void {
    // eslint-disable-next-line no-console
    console.log('[ToolsListComponent] Clearing filters');
    this.filterForm.patchValue({
      search: '',
      status: null,
      dateRange: null,
    });
    this.loadTools();
    void this.updateUrlParams();
  }

  /**
   * Updates URL query parameters to reflect current filters.
   *
   * @private
   */
  private async updateUrlParams(): Promise<void> {
    const queryParams: Record<string, string> = {};

    const search = this.filterForm.get('search')?.value;
    if (typeof search === 'string' && search.length >= this.MIN_SEARCH_LENGTH) {
      queryParams['q'] = search;
    }

    const status = this.filterForm.get('status')?.value;
    if (typeof status === 'string' && status.length > 0) {
      queryParams['status'] = status;
    }

    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Restores filters from URL query parameters on init.
   *
   * @private
   */
  private restoreFiltersFromUrl(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const searchParam = params['q'];
      if (typeof searchParam === 'string' && searchParam.length > 0) {
        this.filterForm.patchValue({ search: searchParam }, { emitEvent: false });
      }
      const statusParam = params['status'];
      if (typeof statusParam === 'string' && statusParam.length > 0) {
        this.filterForm.patchValue({ status: statusParam }, { emitEvent: false });
      }
    });
  }
}
