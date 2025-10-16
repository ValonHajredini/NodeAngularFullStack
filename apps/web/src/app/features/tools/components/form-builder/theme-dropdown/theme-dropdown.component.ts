import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay } from 'primeng/overlay';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { FormTheme } from '@nodeangularfullstack/shared';
import { ThemesApiService } from '../themes-api.service';
import { ThemeCardComponent } from './theme-card/theme-card.component';

/**
 * Component for displaying theme selection dropdown with responsive grid layout.
 * Fetches themes from API and provides keyboard navigation support.
 */
@Component({
  selector: 'app-theme-dropdown',
  standalone: true,
  imports: [CommonModule, Overlay, SkeletonModule, ButtonModule, ThemeCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      id="themeDropdownToggle"
      pButton
      type="button"
      label="Styling Themes"
      icon="pi pi-palette"
      severity="secondary"
      size="small"
      (click)="toggleDropdown()"
    ></button>

    <p-overlay
      [(visible)]="panelVisible"
      target="#themeDropdownToggle"
      styleClass="theme-dropdown-panel"
      (onShow)="onPanelShow()"
    >
      <div class="theme-dropdown-header">
        <h3>Styling Themes</h3>
        <span class="theme-count">{{ themes().length }} themes</span>
      </div>

      <div *ngIf="loading(); else themeGrid" class="loading-skeleton">
        <p-skeleton
          *ngFor="let i of [1, 2, 3, 4, 5, 6, 7, 8]"
          width="240px"
          height="200px"
          class="skeleton-card"
        />
      </div>

      <ng-template #themeGrid>
        <div class="theme-grid" role="grid" (keydown)="handleKeyboardNav($event)">
          <app-theme-card
            *ngFor="let theme of themes()"
            [theme]="theme"
            [isActive]="theme.id === currentThemeIdValue()"
            (selected)="onThemeSelect($event)"
          />
        </div>
      </ng-template>
    </p-overlay>
  `,
  styles: [
    `
      :host ::ng-deep .theme-dropdown-panel {
        /* The theme picker should not inherit per‑theme transparency. */
        background-color: #ffffff; /* fixed, non-themed */
        opacity: 1 !important; /* always fully opaque */
        border-radius: 8px;
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
        padding: 1.5rem;
        margin-top: 0.5rem;
        max-width: 95vw;
        max-height: 80vh;
        overflow: hidden;
      }

      .theme-grid {
        display: grid;
        gap: 1rem;
        max-height: calc(80vh - 120px);
        overflow-y: auto;
        overflow-x: hidden;
      }

      /* Desktop: 4 columns */
      @media (min-width: 1280px) {
        .theme-grid {
          grid-template-columns: repeat(4, minmax(200px, 1fr));
        }
        :host ::ng-deep .theme-dropdown-panel {
          width: min(1000px, 95vw);
        }
      }

      /* Tablet: 3 columns */
      @media (min-width: 768px) and (max-width: 1279px) {
        .theme-grid {
          grid-template-columns: repeat(3, minmax(200px, 1fr));
        }
        :host ::ng-deep .theme-dropdown-panel {
          width: min(720px, 95vw);
        }
      }

      /* Mobile: 2 columns */
      @media (max-width: 767px) {
        .theme-grid {
          grid-template-columns: repeat(2, minmax(150px, 1fr));
        }
        :host ::ng-deep .theme-dropdown-panel {
          width: min(480px, 95vw);
        }
      }

      .theme-dropdown-header {
        @apply flex justify-between items-center mb-4 pb-2 border-b;
        transition:
          background-color 0.3s ease,
          color 0.3s ease,
          border-color 0.3s ease,
          opacity 0.3s ease;
      }

      .theme-dropdown-header h3 {
        @apply text-lg font-semibold;
        color: var(--theme-text-primary, #1f2937);
      }

      .theme-count {
        @apply text-sm;
        color: var(--theme-text-secondary, #9ca3af);
      }

      .loading-skeleton {
        @apply grid gap-4;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      }

      .skeleton-card {
        @apply rounded-lg;
      }
    `,
  ],
})
export class ThemeDropdownComponent {
  /** Currently selected theme ID (internal signal) */
  private readonly _currentThemeIdSignal = signal<string | undefined>(undefined);

  /** Public readonly accessor for template binding */
  readonly currentThemeIdValue = this._currentThemeIdSignal.asReadonly();

  /** Input setter for currentThemeId to convert to signal */
  @Input()
  set currentThemeId(value: string | undefined) {
    this._currentThemeIdSignal.set(value);
  }

  /** Getter for currentThemeId */
  get currentThemeId(): string | undefined {
    return this._currentThemeIdSignal();
  }

  /** Event emitted when a theme is selected */
  @Output() themeSelected = new EventEmitter<FormTheme>();

  private readonly themesApi = inject(ThemesApiService);

  /** Signal for themes list */
  readonly themes = signal<FormTheme[]>([]);

  /** Signal for loading state */
  readonly loading = signal<boolean>(false);

  /** Overlay panel visibility */
  panelVisible = false;

  /**
   * Toggles the dropdown panel visibility.
   */
  toggleDropdown(): void {
    this.panelVisible = !this.panelVisible;
  }

  /**
   * Called when overlay panel is shown. Fetches themes on first show.
   */
  onPanelShow(): void {
    if (this.themes().length === 0) {
      this.fetchThemes();
    }
  }

  /**
   * Fetches themes from the API and updates the themes signal.
   * Loads both predefined and custom themes with visual indicators.
   * Shows loading state during fetch.
   */
  private fetchThemes(): void {
    this.loading.set(true);
    this.themesApi.getAllThemes().subscribe({
      next: (themes) => {
        this.themes.set(themes);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load themes:', err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Handles theme selection and closes the dropdown.
   * @param theme - Selected theme
   */
  onThemeSelect(theme: FormTheme): void {
    this.themeSelected.emit(theme);
    this.panelVisible = false;
  }

  /**
   * Handles keyboard navigation within the theme grid.
   * Supports arrow keys, Enter, and Escape.
   * @param event - Keyboard event
   */
  handleKeyboardNav(event: KeyboardEvent): void {
    const cards = (event.currentTarget as HTMLElement)?.querySelectorAll(
      '.theme-card',
    ) as NodeListOf<HTMLElement>;
    const currentIndex = Array.from(cards).findIndex((card) => card === document.activeElement);

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (currentIndex < cards.length - 1) {
          cards[currentIndex + 1]?.focus();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (currentIndex > 0) {
          cards[currentIndex - 1]?.focus();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        // Move to next row (responsive column count)
        const columnsPerRow = this.getColumnsPerRow();
        const nextRowIndex = Math.min(currentIndex + columnsPerRow, cards.length - 1);
        cards[nextRowIndex]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        // Move to previous row (responsive column count)
        const columnsPerRowUp = this.getColumnsPerRow();
        const prevRowIndex = Math.max(currentIndex - columnsPerRowUp, 0);
        cards[prevRowIndex]?.focus();
        break;
      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < cards.length) {
          const theme = this.themes()[currentIndex];
          if (theme) {
            this.onThemeSelect(theme);
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.panelVisible = false;
        break;
    }
  }

  /**
   * Gets the number of columns per row based on current viewport width.
   * @returns Number of columns (2, 3, or 4)
   */
  private getColumnsPerRow(): number {
    const width = window.innerWidth;
    if (width >= 1280) return 4; // Desktop
    if (width >= 768) return 3; // Tablet
    return 2; // Mobile
  }
}
