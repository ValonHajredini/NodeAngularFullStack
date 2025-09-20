import { Directive, ElementRef, inject, OnInit, OnDestroy, Input, Renderer2 } from '@angular/core';
import { fromEvent, merge, Subject } from 'rxjs';
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';

/**
 * Directive that enhances components with touch-friendly interactions and responsive behaviors.
 * Provides automatic touch target sizing, focus management, and gesture support.
 */
@Directive({
  selector: '[appResponsiveEnhancements]',
  standalone: true
})
export class ResponsiveEnhancementsDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly destroy$ = new Subject<void>();

  /**
   * Enable touch-friendly enhancements (larger touch targets, etc.)
   */
  @Input() touchFriendly: boolean = true;

  /**
   * Enable keyboard navigation enhancements
   */
  @Input() keyboardFriendly: boolean = true;

  /**
   * Enable responsive text scaling
   */
  @Input() responsiveText: boolean = true;

  /**
   * Enable swipe gesture support for mobile
   */
  @Input() swipeGestures: boolean = false;

  /**
   * Minimum touch target size in pixels (following WCAG guidelines)
   */
  @Input() minTouchTarget: number = 44;

  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  private isCurrentlyTouching: boolean = false;

  ngOnInit(): void {
    this.setupResponsiveEnhancements();
    this.setupScreenSizeMonitoring();

    if (this.touchFriendly) {
      this.enhanceTouchTargets();
    }

    if (this.keyboardFriendly) {
      this.enhanceKeyboardNavigation();
    }

    if (this.swipeGestures) {
      this.setupSwipeGestures();
    }

    if (this.responsiveText) {
      this.setupResponsiveText();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets up basic responsive enhancements
   */
  private setupResponsiveEnhancements(): void {
    const element = this.el.nativeElement;

    // Add responsive classes
    this.renderer.addClass(element, 'responsive-enhanced');

    // Ensure proper box-sizing
    this.renderer.setStyle(element, 'box-sizing', 'border-box');

    // Add meta viewport support classes
    this.renderer.addClass(element, 'viewport-responsive');
  }

  /**
   * Monitors screen size changes and applies appropriate classes
   */
  private setupScreenSizeMonitoring(): void {
    const resize$ = fromEvent(window, 'resize').pipe(
      debounceTime(100),
      startWith(null)
    );

    const orientationChange$ = fromEvent(window, 'orientationchange').pipe(
      debounceTime(200)
    );

    merge(resize$, orientationChange$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateScreenSizeClasses();
      });
  }

  /**
   * Updates CSS classes based on screen size
   */
  private updateScreenSizeClasses(): void {
    const element = this.el.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Remove existing size classes
    element.classList.remove('screen-xs', 'screen-sm', 'screen-md', 'screen-lg', 'screen-xl');
    element.classList.remove('orientation-portrait', 'orientation-landscape');

    // Add appropriate size class
    if (width < 640) {
      this.renderer.addClass(element, 'screen-xs');
    } else if (width < 768) {
      this.renderer.addClass(element, 'screen-sm');
    } else if (width < 1024) {
      this.renderer.addClass(element, 'screen-md');
    } else if (width < 1280) {
      this.renderer.addClass(element, 'screen-lg');
    } else {
      this.renderer.addClass(element, 'screen-xl');
    }

    // Add orientation class
    if (height > width) {
      this.renderer.addClass(element, 'orientation-portrait');
    } else {
      this.renderer.addClass(element, 'orientation-landscape');
    }

    // Add mobile/desktop class
    if (this.isMobileDevice()) {
      this.renderer.addClass(element, 'device-mobile');
      this.renderer.removeClass(element, 'device-desktop');
    } else {
      this.renderer.addClass(element, 'device-desktop');
      this.renderer.removeClass(element, 'device-mobile');
    }
  }

  /**
   * Enhances touch targets for better mobile usability
   */
  private enhanceTouchTargets(): void {
    const element = this.el.nativeElement;

    // Find all interactive elements
    const interactiveElements = element.querySelectorAll(
      'button, a, input, select, textarea, [tabindex], [role="button"], [role="link"]'
    );

    interactiveElements.forEach((el: HTMLElement) => {
      const rect = el.getBoundingClientRect();

      // Check if element is smaller than minimum touch target
      if (rect.width < this.minTouchTarget || rect.height < this.minTouchTarget) {
        // Add touch-friendly padding
        const paddingNeeded = Math.max(0, (this.minTouchTarget - Math.max(rect.width, rect.height)) / 2);

        this.renderer.setStyle(el, 'padding', `${paddingNeeded}px`);
        this.renderer.setStyle(el, 'min-width', `${this.minTouchTarget}px`);
        this.renderer.setStyle(el, 'min-height', `${this.minTouchTarget}px`);
        this.renderer.addClass(el, 'touch-enhanced');
      }

      // Add touch feedback
      this.addTouchFeedback(el);
    });
  }

  /**
   * Adds visual feedback for touch interactions
   */
  private addTouchFeedback(element: HTMLElement): void {
    const touchStart$ = fromEvent(element, 'touchstart');
    const touchEnd$ = fromEvent(element, 'touchend');
    const touchCancel$ = fromEvent(element, 'touchcancel');

    touchStart$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.renderer.addClass(element, 'touch-active');
    });

    merge(touchEnd$, touchCancel$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Delay removal to ensure visual feedback is seen
        setTimeout(() => {
          this.renderer.removeClass(element, 'touch-active');
        }, 150);
      });
  }

  /**
   * Enhances keyboard navigation
   */
  private enhanceKeyboardNavigation(): void {
    const element = this.el.nativeElement;

    // Add keyboard navigation support
    fromEvent<KeyboardEvent>(element, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.handleKeyboardNavigation(event);
      });

    // Improve focus visibility
    const focusableElements = element.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((el: HTMLElement) => {
      this.renderer.addClass(el, 'keyboard-focusable');

      // Add focus indicators
      fromEvent(el, 'focus').pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.renderer.addClass(el, 'keyboard-focused');
      });

      fromEvent(el, 'blur').pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.renderer.removeClass(el, 'keyboard-focused');
      });
    });
  }

  /**
   * Handles keyboard navigation events
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const element = this.el.nativeElement;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (event.ctrlKey || event.metaKey) {
          this.focusNext(element);
          event.preventDefault();
        }
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        if (event.ctrlKey || event.metaKey) {
          this.focusPrevious(element);
          event.preventDefault();
        }
        break;
      case 'Home':
        if (event.ctrlKey || event.metaKey) {
          this.focusFirst(element);
          event.preventDefault();
        }
        break;
      case 'End':
        if (event.ctrlKey || event.metaKey) {
          this.focusLast(element);
          event.preventDefault();
        }
        break;
    }
  }

  /**
   * Sets up swipe gesture support
   */
  private setupSwipeGestures(): void {
    const element = this.el.nativeElement;

    fromEvent<TouchEvent>(element, 'touchstart', { passive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.handleTouchStart(event);
      });

    fromEvent<TouchEvent>(element, 'touchend', { passive: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.handleTouchEnd(event);
      });
  }

  /**
   * Sets up responsive text scaling
   */
  private setupResponsiveText(): void {
    const element = this.el.nativeElement;
    this.renderer.addClass(element, 'responsive-text');

    // Apply responsive text classes based on screen size
    this.updateTextScaling();

    // Update on resize
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateTextScaling();
      });
  }

  /**
   * Updates text scaling based on screen size
   */
  private updateTextScaling(): void {
    const element = this.el.nativeElement;
    const width = window.innerWidth;

    // Remove existing text size classes
    element.classList.remove('text-scale-xs', 'text-scale-sm', 'text-scale-md', 'text-scale-lg');

    // Apply appropriate text scaling
    if (width < 640) {
      this.renderer.addClass(element, 'text-scale-sm');
    } else if (width < 1024) {
      this.renderer.addClass(element, 'text-scale-md');
    } else {
      this.renderer.addClass(element, 'text-scale-lg');
    }
  }

  /**
   * Handles touch start for swipe gestures
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.swipeStartX = event.touches[0].clientX;
      this.swipeStartY = event.touches[0].clientY;
      this.isCurrentlyTouching = true;
    }
  }

  /**
   * Handles touch end for swipe gestures
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isCurrentlyTouching || event.changedTouches.length !== 1) {
      return;
    }

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - this.swipeStartX;
    const deltaY = endY - this.swipeStartY;

    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
      this.handleSwipe(deltaX, deltaY);
    }

    this.isCurrentlyTouching = false;
  }

  /**
   * Handles swipe gestures
   */
  private handleSwipe(deltaX: number, deltaY: number): void {
    const element = this.el.nativeElement;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 0) {
        this.dispatchCustomEvent('swiperight', element);
      } else {
        this.dispatchCustomEvent('swipeleft', element);
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        this.dispatchCustomEvent('swipedown', element);
      } else {
        this.dispatchCustomEvent('swipeup', element);
      }
    }
  }

  /**
   * Dispatches a custom swipe event
   */
  private dispatchCustomEvent(eventName: string, element: HTMLElement): void {
    const customEvent = new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(customEvent);
  }

  /**
   * Focuses the next focusable element
   */
  private focusNext(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    }
  }

  /**
   * Focuses the previous focusable element
   */
  private focusPrevious(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
    }
  }

  /**
   * Focuses the first focusable element
   */
  private focusFirst(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Focuses the last focusable element
   */
  private focusLast(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }

  /**
   * Gets all focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Detects if the current device is mobile
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }
}