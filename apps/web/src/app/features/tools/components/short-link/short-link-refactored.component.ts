import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// Internal Imports
import { ShortLinkService } from '../../services/short-link.service';
import { ToolGateDirective } from '../../../../shared/directives/tool-gate.directive';
import type { CreateShortLinkRequest, ShortLink } from '@nodeangularfullstack/shared';
import { Subject, takeUntil } from 'rxjs';

// Reusable Components
import { UrlInputComponent } from './components/url-input/url-input.component';
import { CustomNameInputComponent } from './components/custom-name-input/custom-name-input.component';
import { ShortLinkResultComponent } from './components/short-link-result/short-link-result.component';
import { RecentLinksListComponent } from './components/recent-links-list/recent-links-list.component';

/**
 * Short Link component for URL shortening functionality (Refactored with reusable components).
 */
@Component({
  selector: 'app-short-link-refactored',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    // PrimeNG
    ButtonModule,
    DatePickerModule,
    CardModule,
    ToastModule,
    ProgressSpinnerModule,
    // Internal
    ToolGateDirective,
    // Reusable Components
    UrlInputComponent,
    CustomNameInputComponent,
    ShortLinkResultComponent,
    RecentLinksListComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="short-link-container" *appToolGate="'short-link'">
      <!-- Main Creation Card -->
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex align-items-center gap-2 p-3">
            <i class="pi pi-link text-primary text-xl"></i>
            <h2 class="text-lg font-semibold text-gray-800 m-0">URL Shortener</h2>
          </div>
        </ng-template>

        <form [formGroup]="shortLinkForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- URL Input Component -->
          <app-url-input
            formControlName="originalUrl"
            label="URL to Shorten"
            [required]="true"
            inputId="url"
            placeholder="https://example.com/very/long/url"
          />

          <!-- Custom Name Input Component -->
          <app-custom-name-input
            #customNameInput
            formControlName="customName"
            [baseUrl]="baseUrl"
            (checkAvailability)="handleCheckAvailability($event)"
          />

          <!-- Expiration Date (Optional) -->
          <div class="field">
            <label for="expiration" class="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date (Optional)
            </label>
            <p-datepicker
              id="expiration"
              formControlName="expiresAt"
              [showTime]="true"
              [showSeconds]="false"
              [minDate]="minDate()"
              placeholder="Select expiration date and time"
              styleClass="w-full"
              [showIcon]="true"
            />
            <small class="text-gray-500 block mt-1"> Leave empty for permanent links </small>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-between align-items-center pt-2">
            <div class="flex gap-2">
              <p-button
                type="submit"
                label="Shorten URL"
                icon="pi pi-link"
                [disabled]="shortLinkForm.invalid || loading()"
                [loading]="loading()"
                size="large"
              />
              <p-button
                type="button"
                label="Clear"
                icon="pi pi-times"
                severity="secondary"
                (onClick)="clearForm()"
                [disabled]="loading()"
                outlined="true"
              />
            </div>
          </div>
        </form>

        <!-- Result Display Component -->
        <app-short-link-result
          [shortLink]="createdShortLink()"
          [generatedShortUrl]="generatedShortUrl()"
          [qrCodeDataUrl]="qrCodeDataUrl()"
          (copyToClipboard)="copyShortUrl()"
          (downloadQR)="downloadQRCode()"
        />

        <!-- Error Display -->
        @if (error()) {
          <div class="error-section mt-4">
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <div class="flex align-items-center">
                <i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>
                <span class="text-red-700 text-sm">{{ error() }}</span>
              </div>
            </div>
          </div>
        }
      </p-card>

      <!-- Recent Links Component -->
      <app-recent-links-list
        [links]="recentLinks()"
        [urlGenerator]="generateShortUrl.bind(this)"
        (refresh)="refreshLinks()"
        (copyLink)="copyShortUrlByCode($event)"
      />

      <!-- Tool Disabled State -->
      @if (!isToolEnabled()) {
        <p-card>
          <div class="text-center py-8">
            <i class="pi pi-lock text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-semibold text-gray-600 mb-2">Tool Not Available</h3>
            <p class="text-gray-500">
              The URL shortener tool is currently disabled. Please contact your administrator.
            </p>
          </div>
        </p-card>
      }
    </div>
  `,
  styles: [
    `
      .short-link-container {
        margin: 0 auto;
        padding: 1rem;
      }

      .field {
        margin-bottom: 1.5rem;
      }

      .error-section {
        margin-top: 1rem;
      }

      :host ::ng-deep {
        .p-datepicker input {
          width: 100%;
        }

        .p-card-body {
          padding: 1.5rem;
        }

        .p-card-header {
          padding: 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .space-y-4 > * + * {
          margin-top: 1rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortLinkRefactoredComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly shortLinkService = inject(ShortLinkService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('customNameInput') customNameInput?: CustomNameInputComponent;

  // Form
  readonly shortLinkForm: FormGroup;

  // Signals
  readonly loading = this.shortLinkService.loading;
  readonly error = this.shortLinkService.error;
  readonly recentLinks = this.shortLinkService.recentLinks;
  readonly isToolEnabled = this.shortLinkService.isToolEnabled;

  // Component state
  readonly createdShortLink = signal<ShortLink | null>(null);
  readonly minDate = signal<Date>(new Date());
  readonly qrCodeDataUrl = signal<string | null>(null);
  readonly baseUrl = window.location.origin;

  // Computed values
  readonly generatedShortUrl = computed(() => {
    const link = this.createdShortLink();
    return link ? this.shortLinkService.generateShortUrl(link.code) : '';
  });

  constructor() {
    this.shortLinkForm = this.fb.group({
      originalUrl: [
        '',
        [Validators.required, Validators.pattern(/^https?:\/\/.+/), Validators.maxLength(2048)],
      ],
      customName: [
        '',
        [Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9-]+$/)],
      ],
      expiresAt: [null],
    });
  }

  ngOnInit(): void {
    // Set minimum date to current time
    this.minDate.set(new Date());

    // Load recent links when component initializes
    this.refreshLinks();

    // Clear error state when form changes
    this.shortLinkForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.shortLinkService.clearError();
      this.createdShortLink.set(null);
      this.qrCodeDataUrl.set(null);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handles custom name availability check from child component.
   */
  handleCheckAvailability(customName: string): void {
    this.shortLinkService
      .checkCustomNameAvailability(customName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (this.customNameInput) {
            this.customNameInput.setAvailability(result.available, result.error);
          }
        },
        error: () => {
          if (this.customNameInput) {
            this.customNameInput.setAvailability(false, 'Failed to check availability');
          }
        },
      });
  }

  /**
   * Handles form submission to create a short link.
   */
  onSubmit(): void {
    if (this.shortLinkForm.invalid || !this.isToolEnabled()) {
      return;
    }

    const formValue = this.shortLinkForm.value;
    const request: CreateShortLinkRequest = {
      originalUrl: formValue.originalUrl.trim(),
      expiresAt: formValue.expiresAt || null,
      customName: formValue.customName?.trim() || undefined,
    };

    this.createdShortLink.set(null);
    this.qrCodeDataUrl.set(null);

    this.shortLinkService
      .createShortLink(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.createdShortLink.set(response.data.shortLink);
            this.qrCodeDataUrl.set(response.data.qrCodeDataUrl);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Short link created successfully!',
            });
            this.clearForm();
            this.refreshLinks();
          }
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to create short link',
          });
        },
      });
  }

  /**
   * Clears the form and resets component state.
   */
  clearForm(): void {
    this.shortLinkForm.reset();
    this.createdShortLink.set(null);
    this.qrCodeDataUrl.set(null);
    this.shortLinkService.clearError();
  }

  /**
   * Downloads the QR code as a PNG file.
   */
  downloadQRCode(): void {
    const qrCode = this.qrCodeDataUrl();
    if (!qrCode) {
      return;
    }

    const link = document.createElement('a');
    const shortLink = this.createdShortLink();
    const filename = shortLink?.code ? `qr-${shortLink.code}.png` : 'qr-code.png';

    link.href = qrCode;
    link.download = filename;
    link.click();

    this.messageService.add({
      severity: 'success',
      summary: 'Downloaded',
      detail: 'QR code downloaded successfully',
    });
  }

  /**
   * Copies the short URL to clipboard.
   */
  async copyShortUrl(codeOrUrl?: string): Promise<void> {
    let shortUrl: string;

    if (!codeOrUrl) {
      shortUrl = this.generatedShortUrl();
    } else if (codeOrUrl.startsWith('http')) {
      shortUrl = codeOrUrl;
    } else {
      shortUrl = this.shortLinkService.generateShortUrl(codeOrUrl);
    }

    try {
      const success = await this.shortLinkService.copyToClipboard(shortUrl);
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Copied!',
          detail: 'Short URL copied to clipboard',
        });
      } else {
        throw new Error('Copy operation failed');
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Unable to copy to clipboard. Please copy manually.',
      });
    }
  }

  /**
   * Copies short URL by code (used by recent links component).
   */
  copyShortUrlByCode(code: string): void {
    this.copyShortUrl(code);
  }

  /**
   * Refreshes the recent links list.
   */
  refreshLinks(): void {
    this.shortLinkService.refreshRecentLinks();
    this.messageService.add({
      severity: 'info',
      summary: 'Refreshing',
      detail: 'Updating recent links...',
    });
  }

  /**
   * Generates the full short URL for a given code.
   */
  generateShortUrl(code: string): string {
    return this.shortLinkService.generateShortUrl(code);
  }
}
