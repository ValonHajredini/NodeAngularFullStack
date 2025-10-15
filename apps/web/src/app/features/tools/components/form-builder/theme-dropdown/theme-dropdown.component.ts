import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Menu } from 'primeng/menu';
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
  imports: [CommonModule, Menu, SkeletonModule, ButtonModule, ThemeCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      pButton
      type="button"
      label="Styling Themes"
      icon="pi pi-palette"
      severity="secondary"
      size="small"
      (click)="toggleDropdown($event)"
    ></button>

    <p-menu #themePanel [popup]="true" styleClass="theme-dropdown-panel">
      <ng-template pTemplate="content">
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
              [isActive]="theme.id === currentThemeId"
              (selected)="onThemeSelect($event)"
            />
          </div>
        </ng-template>
      </ng-template>
    </p-menu>
  `,
  styles: [
    `
      .theme-grid {
        display: grid;
        gap: 1rem;
        max-height: 500px;
        overflow-y: auto;
      }

      /* Desktop: 4 columns */
      @media (min-width: 1280px) {
        .theme-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        .theme-dropdown-panel {
          width: 1000px;
        }
      }

      /* Tablet: 3 columns */
      @media (min-width: 768px) and (max-width: 1279px) {
        .theme-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .theme-dropdown-panel {
          width: 720px;
        }
      }

      /* Mobile: 2 columns */
      @media (max-width: 767px) {
        .theme-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .theme-dropdown-panel {
          width: 480px;
          max-width: 90vw;
        }
      }

      .theme-dropdown-header {
        @apply flex justify-between items-center mb-4 pb-2 border-b border-gray-200;
      }

      .theme-dropdown-header h3 {
        @apply text-lg font-semibold text-gray-800;
      }

      .theme-count {
        @apply text-sm text-gray-600;
      }

      .loading-skeleton {
        @apply grid gap-4;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }

      .skeleton-card {
        @apply rounded-lg;
      }
    `,
  ],
})
export class ThemeDropdownComponent {
  @ViewChild('themePanel') themePanel!: Menu;

  /** Currently selected theme ID */
  @Input() currentThemeId: string | undefined;

  /** Event emitted when a theme is selected */
  @Output() themeSelected = new EventEmitter<FormTheme>();

  private readonly themesApi = inject(ThemesApiService);

  /** Signal for themes list */
  readonly themes = signal<FormTheme[]>([]);

  /** Signal for loading state */
  readonly loading = signal<boolean>(false);

  /**
   * Toggles the dropdown panel and fetches themes on first open.
   * @param event - Click event from button
   */
  toggleDropdown(event: Event): void {
    if (this.themes().length === 0) {
      this.fetchThemes();
    }
    this.themePanel.toggle(event);
  }

  /**
   * Fetches themes from the API and updates the themes signal.
   * Shows loading state during fetch.
   */
  private fetchThemes(): void {
    this.loading.set(true);
    this.themesApi.getThemes().subscribe({
      next: (response) => {
        this.themes.set(response.data || []);
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
    this.themePanel.hide();
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
        this.themePanel.hide();
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
