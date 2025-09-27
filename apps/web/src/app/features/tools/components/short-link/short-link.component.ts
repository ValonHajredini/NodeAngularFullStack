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
import { Subject, takeUntil } from 'rxjs';

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
      @if (recentLinks().length > 0) {
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

          <p-dataView [value]="recentLinks()" [paginator]="false" [rows]="10">
            <ng-template let-link pTemplate="listItem">
              <div class="link-item border-bottom border-gray-200 py-3">
                <div class="flex justify-between align-items-start gap-3">
                  <div class="flex-1">
                    <div class="flex align-items-center gap-2 mb-1">
                      <code class="text-sm text-blue-600 font-mono">
                        {{ generateShortUrl(link.code) }}
                      </code>
                      <p-button
                        icon="pi pi-copy"
                        size="small"
                        severity="secondary"
                        (onClick)="copyShortUrl(link.code)"
                        pTooltip="Copy to clipboard"
                        outlined="true"
                      />
                    </div>
                    <div class="text-sm text-gray-600 truncate" [title]="link.originalUrl">
                      {{ link.originalUrl }}
                    </div>
                    <div class="flex align-items-center gap-4 mt-2">
                      <span class="text-xs text-gray-500">
                        <i class="pi pi-calendar mr-1"></i>
                        {{ link.createdAt | date: 'short' }}
                      </span>
                      <span class="text-xs text-gray-500">
                        <i class="pi pi-eye mr-1"></i>
                        {{ link.clickCount || 0 }} clicks
                      </span>
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
              </div>
            </ng-template>
          </p-dataView>
        </p-card>
      }

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
        max-width: 800px;
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

      .link-item:last-child {
        border-bottom: none !important;
      }

      .truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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

  // Computed values
  readonly generatedShortUrl = computed(() => {
    const link = this.createdShortLink();
    return link ? this.shortLinkService.generateShortUrl(link.code) : '';
  });

  // Form controls for easier access
  get urlControl() {
    return this.shortLinkForm.get('originalUrl')!;
  }

  get expirationControl() {
    return this.shortLinkForm.get('expiresAt')!;
  }

  constructor() {
    this.shortLinkForm = this.fb.group({
      originalUrl: [
        '',
        [Validators.required, Validators.pattern(/^https?:\/\/.+/), Validators.maxLength(2048)],
      ],
      expiresAt: [null],
    });
  }

  ngOnInit(): void {
    // Set minimum date to current time
    this.minDate.set(new Date());

    // Clear error state when form changes
    this.shortLinkForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.shortLinkService.clearError();
      this.createdShortLink.set(null);
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
    };

    this.createdShortLink.set(null);

    this.shortLinkService
      .createShortLink(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.createdShortLink.set(response.data.shortLink);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Short link created successfully!',
            });
            this.clearForm();
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
    this.shortLinkService.clearError();
  }

  /**
   * Copies the short URL to clipboard.
   */
  async copyShortUrl(code?: string): Promise<void> {
    const shortUrl = code ? this.shortLinkService.generateShortUrl(code) : this.generatedShortUrl();

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
  getExpirationSeverity(expiresAt: string | Date): 'success' | 'warning' | 'danger' {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const isExpired = expiry < now;

    if (isExpired) {
      return 'danger';
    }

    const diffHours = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours <= 24) {
      return 'warning';
    }

    return 'success';
  }
}
