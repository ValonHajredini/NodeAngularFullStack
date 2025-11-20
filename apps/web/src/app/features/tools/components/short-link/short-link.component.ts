import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Imports
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { DataViewModule } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';

// Internal Imports
import { ShortLinkService } from '../../services/short-link.service';
import { ToolGateDirective } from '../../../../shared/directives/tool-gate.directive';
import type { CreateShortLinkRequest, ShortLink } from '@nodeangularfullstack/shared';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import QRCode from 'qrcode';

/**
 * Short Link component for URL shortening functionality.
 * Provides an interface to create short links with optional expiration
 * and displays recent links with copy functionality.
 */
@Component({
  selector: 'app-short-link',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    // PrimeNG
    InputTextModule,
    ButtonModule,
    DatePickerModule,
    CardModule,
    ToastModule,
    ProgressSpinnerModule,
    DividerModule,
    ChipModule,
    DataViewModule,
    TagModule,
    // Internal
    ToolGateDirective,
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
          <!-- URL Input -->
          <div class="field">
            <label for="url" class="block text-sm font-medium text-gray-700 mb-2">
              URL to Shorten *
            </label>
            <input
              id="url"
              type="url"
              pInputText
              formControlName="originalUrl"
              placeholder="https://example.com/very/long/url"
              class="w-full"
              [class.ng-invalid]="urlControl.invalid && urlControl.touched"
            />
            <small class="p-error block mt-1" *ngIf="urlControl.invalid && urlControl.touched">
              @if (urlControl.errors?.['required']) {
                URL is required
              }
              @if (urlControl.errors?.['url']) {
                Please enter a valid URL (must start with http:// or https://)
              }
              @if (urlControl.errors?.['maxlength']) {
                URL is too long (maximum 2048 characters)
              }
            </small>
          </div>

          <!-- Custom Name (Optional) -->
          <div class="field">
            <label for="customName" class="block text-sm font-medium text-gray-700 mb-2">
              Custom Link Name (Optional)
            </label>
            <div class="p-inputgroup">
              <input
                id="customName"
                type="text"
                pInputText
                formControlName="customName"
                placeholder="my-custom-link"
                class="flex-1"
                [class.ng-invalid]="customNameControl.invalid && customNameControl.touched"
              />
              @if (checkingAvailability()) {
                <span class="p-inputgroup-addon">
                  <i class="pi pi-spin pi-spinner text-gray-500"></i>
                </span>
              } @else if (customNameControl.value && customNameAvailable()) {
                <span class="p-inputgroup-addon">
                  <i class="pi pi-check text-green-500"></i>
                </span>
              } @else if (
                customNameControl.value &&
                !customNameAvailable() &&
                !customNameControl.errors?.['pattern']
              ) {
                <span class="p-inputgroup-addon">
                  <i class="pi pi-times text-red-500"></i>
                </span>
              }
            </div>
            <small class="text-gray-500 block mt-1">
              3-30 characters, alphanumeric and hyphens only. Leave empty for auto-generated code.
            </small>
            @if (customNamePreview()) {
              <small class="text-blue-600 block mt-1"> Preview: {{ customNamePreview() }} </small>
            }
            <small
              class="p-error block mt-1"
              *ngIf="customNameControl.invalid && customNameControl.touched"
            >
              @if (customNameControl.errors?.['minlength']) {
                Custom name must be at least 3 characters
              }
              @if (customNameControl.errors?.['maxlength']) {
                Custom name must be at most 30 characters
              }
              @if (customNameControl.errors?.['pattern']) {
                Only letters, numbers, and hyphens (no spaces or special characters)
              }
            </small>
            @if (customNameError()) {
              <small class="p-error block mt-1">{{ customNameError() }}</small>
            }
          </div>

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

        <!-- Result Display -->
        @if (createdShortLink()) {
          <p-divider />
          <div class="result-section">
            <h3 class="text-base font-semibold text-gray-800 mb-3">
              <i class="pi pi-check-circle text-green-500 mr-2"></i>
              Short Link Created
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Short URL Section -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="flex justify-between align-items-center mb-2">
                  <label class="text-sm font-medium text-gray-600">Short URL:</label>
                  <p-button
                    icon="pi pi-copy"
                    size="small"
                    severity="secondary"
                    (onClick)="copyShortUrl()"
                    pTooltip="Copy to clipboard"
                    outlined="true"
                  />
                </div>
                <div class="flex align-items-center gap-2">
                  <code class="flex-1 text-sm bg-white p-2 rounded border text-blue-600 font-mono">
                    {{ generatedShortUrl() }}
                  </code>
                </div>

                <div class="mt-3 text-xs text-gray-500">
                  <div>Original: {{ createdShortLink()?.originalUrl }}</div>
                  @if (createdShortLink()?.expiresAt) {
                    <div>Expires: {{ createdShortLink()?.expiresAt | date: 'medium' }}</div>
                  }
                </div>
              </div>

              <!-- QR Code Section -->
              @if (qrCodeDataUrl()) {
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="flex justify-between align-items-center mb-3">
                    <label class="text-sm font-medium text-gray-600">QR Code:</label>
                    <p-button
                      icon="pi pi-download"
                      size="small"
                      severity="secondary"
                      (onClick)="downloadQRCode()"
                      pTooltip="Download QR Code"
                      outlined="true"
                    />
                  </div>
                  <div class="flex justify-center">
                    <img
                      [src]="qrCodeDataUrl()"
                      alt="QR Code for short link"
                      class="w-48 h-48 border border-gray-200 rounded"
                    />
                  </div>
                  <div class="mt-2 text-xs text-gray-500 text-center">Scan to open link</div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Error Display -->
        @if (error()) {
          <p-divider />
          <div class="error-section">
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <div class="flex align-items-center">
                <i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>
                <span class="text-red-700 text-sm">{{ error() }}</span>
              </div>
            </div>
          </div>
        }
      </p-card>

      <!-- Recent Links -->
      <p-card class="mt-4">
        <ng-template pTemplate="header">
          <div class="flex justify-between align-items-center p-3">
            <h3 class="text-base font-semibold text-gray-800 m-0">
              <i class="pi pi-history text-primary mr-2"></i>
              Recent Short Links
            </h3>
            <p-button
              icon="pi pi-refresh"
              size="small"
              severity="secondary"
              (onClick)="refreshLinks()"
              pTooltip="Refresh list"
              outlined="true"
            />
          </div>
        </ng-template>

        @if (recentLinks().length > 0) {
          <div class="links-container space-y-3">
            @for (link of recentLinks(); track link.id) {
              <div
                class="link-item bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div class="space-y-3">
                  <!-- Short URL Section -->
                  <div class="flex align-items-center justify-between gap-3">
                    <div class="flex align-items-center gap-2 min-w-0 flex-1">
                      <i class="pi pi-link text-blue-500 flex-shrink-0"></i>
                      <code
                        class="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded truncate"
                      >
                        {{ generateShortUrl(link.code) }}
                      </code>
                    </div>
                    <p-button
                      icon="pi pi-copy"
                      size="small"
                      severity="secondary"
                      (onClick)="copyShortUrl(generateShortUrl(link.code))"
                      pTooltip="Copy to clipboard"
                      outlined="true"
                    />
                  </div>

                  <!-- Original URL Section -->
                  <div class="flex align-items-center gap-2">
                    <i class="pi pi-external-link text-gray-400 flex-shrink-0"></i>
                    <a
                      [href]="link.originalUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-gray-600 hover:text-blue-600 transition-colors min-w-0 flex-1 truncate-url"
                      [title]="link.originalUrl"
                    >
                      {{ getTruncatedUrl(link.originalUrl) }}
                    </a>
                  </div>

                  <!-- Metadata Section -->
                  <div class="flex align-items-center justify-between">
                    <div class="flex align-items-center gap-4">
                      <span class="text-xs text-gray-500">
                        <i class="pi pi-calendar mr-1"></i>
                        {{ link.createdAt | date: 'short' }}
                      </span>
                      <span class="text-xs text-gray-500">
                        <i class="pi pi-eye mr-1"></i>
                        {{ link.clickCount || 0 }} clicks
                      </span>
                    </div>
                    @if (link.expiresAt) {
                      <p-tag
                        [value]="getExpirationStatus(link.expiresAt)"
                        [severity]="getExpirationSeverity(link.expiresAt)"
                        size="small"
                      />
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="text-center py-8">
            <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-semibold text-gray-600 mb-2">No Recent Short Links</h3>
            <p class="text-gray-500 mb-4">
              Create your first short link above, or refresh to load existing links.
            </p>
            <p-button
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              (onClick)="refreshLinks()"
              outlined="true"
            />
          </div>
        }
      </p-card>

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
        // max-width: 1000px;
        margin: 0 auto;
        padding: 1rem;
      }

      .field {
        margin-bottom: 1.5rem;
      }

      .result-section,
      .error-section {
        margin-top: 1rem;
      }

      .links-container {
        width: 100%;
      }

      .link-item {
        width: 100%;
        box-sizing: border-box;
      }

      .truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .truncate-url {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-decoration: none;
      }

      .truncate-url:hover {
        text-decoration: underline;
      }

      :host ::ng-deep {
        .p-datepicker input {
          width: 100%;
        }

        .p-dataview-content {
          background: transparent;
          border: none;
          padding: 0;
        }

        .p-card-body {
          padding: 1.5rem;
        }

        .p-card-header {
          padding: 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .space-y-3 > * + * {
          margin-top: 0.75rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortLinkComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly shortLinkService = inject(ShortLinkService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

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
  readonly customNameAvailable = signal<boolean | null>(null);
  readonly customNameError = signal<string | null>(null);
  readonly checkingAvailability = signal<boolean>(false);

  // Computed values
  readonly generatedShortUrl = computed(() => {
    const link = this.createdShortLink();
    return link ? this.shortLinkService.generateShortUrl(link.code) : '';
  });

  readonly customNamePreview = computed(() => {
    const customName = this.shortLinkForm?.get('customName')?.value;
    if (!customName || customName.trim() === '') {
      return null;
    }
    return this.shortLinkService.generateShortUrl(customName.trim().toLowerCase());
  });

  // Form controls for easier access
  get urlControl() {
    return this.shortLinkForm.get('originalUrl')!;
  }

  get expirationControl() {
    return this.shortLinkForm.get('expiresAt')!;
  }

  get customNameControl() {
    return this.shortLinkForm.get('customName')!;
  }

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

    // Real-time custom name validation with debounce
    this.customNameControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((customName) => {
          if (!customName || customName.trim() === '' || this.customNameControl.invalid) {
            this.customNameAvailable.set(null);
            this.customNameError.set(null);
            this.checkingAvailability.set(false);
            return of(null);
          }

          this.checkingAvailability.set(true);
          return this.shortLinkService.checkCustomNameAvailability(customName.trim());
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.checkingAvailability.set(false);
          if (result) {
            this.customNameAvailable.set(result.available);
            this.customNameError.set(result.error || null);
          }
        },
        error: () => {
          this.checkingAvailability.set(false);
          this.customNameAvailable.set(null);
          this.customNameError.set('Failed to check availability');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
            this.qrCodeDataUrl.set(response.data.qrCodeDataUrl || null);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Short link created successfully!',
            });
            this.clearForm();
            // Refresh the recent links list to show the new link
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
    this.customNameAvailable.set(null);
    this.customNameError.set(null);
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
      // Use the generated short URL from form submission
      shortUrl = this.generatedShortUrl();
    } else if (codeOrUrl.startsWith('http')) {
      // It's already a full URL
      shortUrl = codeOrUrl;
    } else {
      // It's just a code, generate the full URL
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

  /**
   * Gets the expiration status text for a link.
   */
  getExpirationStatus(expiresAt: string | Date): string {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const isExpired = expiry < now;

    if (isExpired) {
      return 'Expired';
    }

    const diffHours = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours <= 24) {
      return 'Expires Soon';
    }

    return 'Active';
  }

  /**
   * Gets the PrimeNG severity for expiration status.
   */
  getExpirationSeverity(expiresAt: string | Date): 'success' | 'warn' | 'danger' {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const isExpired = expiry < now;

    if (isExpired) {
      return 'danger';
    }

    const diffHours = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours <= 24) {
      return 'warn';
    }

    return 'success';
  }

  /**
   * Truncates a URL to a maximum length and adds ellipsis if needed.
   */
  getTruncatedUrl(url: string, maxLength = 80): string {
    if (url.length <= maxLength) {
      return url;
    }

    return url.substring(0, maxLength) + '...';
  }
}
