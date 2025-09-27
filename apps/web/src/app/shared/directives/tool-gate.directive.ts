import {
  Directive,
  Input,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  inject,
  signal,
  effect,
  DestroyRef,
  Injector,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { ToolsService } from '../../core/services/tools.service';

/**
 * Structural directive that conditionally renders content based on tool enablement status.
 * Provides reactive rendering that automatically updates when tool status changes.
 *
 * @example
 * // Basic usage - show content only if 'short-link' tool is enabled
 * <div *appToolGate="'short-link'">
 *   <app-short-link-form></app-short-link-form>
 * </div>
 *
 * @example
 * // With loading template
 * <div *appToolGate="'short-link'; loading: loadingTemplate">
 *   <app-short-link-form></app-short-link-form>
 * </div>
 * <ng-template #loadingTemplate>
 *   <app-tool-loading></app-tool-loading>
 * </ng-template>
 *
 * @example
 * // Inverted logic - show when tool is disabled
 * <div *appToolGate="'short-link'; invert: true">
 *   <p>Short link tool is currently disabled</p>
 * </div>
 */
@Directive({
  selector: '[appToolGate]',
  standalone: true,
})
export class ToolGateDirective implements OnInit, OnDestroy {
  private readonly toolsService = inject(ToolsService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  // Directive inputs
  private readonly toolKeySignal = signal<string>('');
  private readonly invertSignal = signal<boolean>(false);
  private readonly showLoadingSignal = signal<boolean>(true);
  private readonly loadingTemplateSignal = signal<TemplateRef<unknown> | null>(null);

  // Internal state
  private readonly isVisibleSignal = signal<boolean>(false);
  private readonly isLoadingSignal = signal<boolean>(false);
  private hasViewCreated = false;
  private hasLoadingViewCreated = false;
  private lastToolKey = '';
  private readonly toolKeyChange$ = new BehaviorSubject<string>('');

  /**
   * Tool key to check for enablement status.
   * @param toolKey - Unique identifier for the tool (e.g., 'short-link')
   */
  @Input()
  set appToolGate(toolKey: string) {
    this.toolKeySignal.set(toolKey);
  }

  /**
   * Whether to invert the logic (show when tool is disabled).
   * @param invert - If true, shows content when tool is disabled
   */
  @Input()
  set appToolGateInvert(invert: boolean) {
    this.invertSignal.set(invert);
  }

  /**
   * Whether to show loading state while checking tool status.
   * @param showLoading - If false, hides content during loading
   */
  @Input()
  set appToolGateShowLoading(showLoading: boolean) {
    this.showLoadingSignal.set(showLoading);
  }

  /**
   * Template to show during loading state.
   * @param template - Template reference for loading state
   */
  @Input()
  set appToolGateLoading(template: TemplateRef<unknown> | null) {
    this.loadingTemplateSignal.set(template);
  }

  constructor() {
    // Effects will be created in ngOnInit to ensure injection context
  }

  ngOnInit(): void {
    // Initialize debounced status checking
    this.initializeDebouncedStatusCheck();

    // Reactive effect to handle view updates
    effect(
      () => {
        const isVisible = this.isVisibleSignal();
        const isLoading = this.isLoadingSignal();

        this.updateView(isVisible, isLoading);
      },
      { injector: this.injector },
    );

    // Effect to monitor tool status changes (with reduced frequency)
    effect(
      () => {
        const toolKey = this.toolKeySignal();
        if (toolKey && toolKey !== this.lastToolKey) {
          this.checkToolStatus(toolKey);
        }
      },
      { injector: this.injector },
    );

    // Monitor tool service loading state using effect
    effect(
      () => {
        const isLoading = this.toolsService.loading();
        this.isLoadingSignal.set(isLoading);
      },
      { allowSignalWrites: true, injector: this.injector },
    );

    // Initial tool status check
    const toolKey = this.toolKeySignal();
    if (toolKey) {
      this.checkToolStatus(toolKey);
    }
  }

  ngOnDestroy(): void {
    this.clearView();
  }

  /**
   * Checks the current status of the specified tool.
   * Updates internal state based on tool enablement and invert setting.
   * Optimized to prevent excessive API calls with debouncing.
   */
  private checkToolStatus(toolKey: string): void {
    if (!toolKey.trim()) {
      // eslint-disable-next-line no-console
      console.warn('ToolGateDirective: Empty tool key provided');
      this.isVisibleSignal.set(false);
      return;
    }

    // Avoid redundant checks for the same tool
    if (this.lastToolKey === toolKey) {
      return;
    }
    this.lastToolKey = toolKey;

    try {
      // Get immediate status (uses cache if available)
      const isEnabled = this.toolsService.isToolEnabled(toolKey);
      const shouldShow = this.invertSignal() ? !isEnabled : isEnabled;

      this.isVisibleSignal.set(shouldShow);

      // Only make API call if cache is stale or missing
      if (!this.toolsService.hasFreshCache()) {
        // Debounce API calls through the subject
        this.toolKeyChange$.next(toolKey);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`ToolGateDirective: Error checking tool '${toolKey}':`, error);
      this.isVisibleSignal.set(false);
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Initializes debounced API call handling.
   */
  private initializeDebouncedStatusCheck(): void {
    this.toolKeyChange$
      .pipe(
        debounceTime(200), // Wait 200ms before making API call
        distinctUntilChanged(), // Only process if toolKey actually changed
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((toolKey) => {
        if (toolKey) {
          this.performApiStatusCheck(toolKey);
        }
      });
  }

  /**
   * Performs the actual API status check with error handling.
   */
  private performApiStatusCheck(toolKey: string): void {
    this.toolsService
      .getToolStatus(toolKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tool) => {
          if (tool) {
            const isCurrentlyEnabled = tool.active;
            const shouldShowUpdated = this.invertSignal()
              ? !isCurrentlyEnabled
              : isCurrentlyEnabled;
            this.isVisibleSignal.set(shouldShowUpdated);
          } else {
            // Tool not found - hide content unless inverted
            this.isVisibleSignal.set(this.invertSignal());
          }
        },
        error: (error) => {
          // eslint-disable-next-line no-console
          console.error(`ToolGateDirective: Failed to check tool status for '${toolKey}':`, error);
          // On error, keep current state but ensure loading is cleared
          this.isLoadingSignal.set(false);
        },
      });
  }

  /**
   * Updates the view based on visibility and loading states.
   */
  private updateView(isVisible: boolean, isLoading: boolean): void {
    this.clearView();

    if (isLoading && this.showLoadingSignal()) {
      this.showLoadingView();
    } else if (isVisible) {
      this.showMainView();
    }
  }

  /**
   * Shows the main content template.
   */
  private showMainView(): void {
    if (!this.hasViewCreated) {
      try {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasViewCreated = true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('ToolGateDirective: Failed to create main view:', error);
      }
    }
  }

  /**
   * Shows the loading template if available.
   */
  private showLoadingView(): void {
    const loadingTemplate = this.loadingTemplateSignal();

    if (loadingTemplate && !this.hasLoadingViewCreated) {
      try {
        this.viewContainer.createEmbeddedView(loadingTemplate);
        this.hasLoadingViewCreated = true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('ToolGateDirective: Failed to create loading view:', error);
      }
    }
  }

  /**
   * Clears all views from the container.
   */
  private clearView(): void {
    if (this.hasViewCreated || this.hasLoadingViewCreated) {
      try {
        this.viewContainer.clear();
        this.hasViewCreated = false;
        this.hasLoadingViewCreated = false;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('ToolGateDirective: Failed to clear view:', error);
      }
    }
  }
}
