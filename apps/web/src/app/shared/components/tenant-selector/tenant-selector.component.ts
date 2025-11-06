import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { Badge } from 'primeng/badge';
import { Skeleton } from 'primeng/skeleton';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import { TenantContext, TenantMembership } from '@nodeangularfullstack/shared';

/**
 * TenantSelectorComponent
 *
 * Provides a dropdown UI for users to switch between their tenant memberships.
 * This component is designed for multi-tenant applications where users can belong
 * to multiple organizations/tenants.
 *
 * Features:
 * - Dropdown with tenant names and plan badges
 * - Auto-loads user's tenants on init
 * - Reactive updates via Angular signals
 * - Shows loading skeleton while fetching
 * - Handles errors gracefully
 * - Optional page reload on tenant switch for cache clearing
 *
 * Usage:
 * ```html
 * <app-tenant-selector></app-tenant-selector>
 * ```
 */
@Component({
  selector: 'app-tenant-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, Select, Badge, Skeleton],
  template: `
    <div class="tenant-selector">
      @if (loading()) {
        <p-skeleton width="250px" height="40px"></p-skeleton>
      } @else if (error()) {
        <div class="error-state">
          <i class="pi pi-exclamation-triangle text-red-500"></i>
          <span class="text-red-500 text-sm">Failed to load tenants</span>
        </div>
      } @else if (hasMultipleTenants()) {
        <p-select
          [options]="availableTenants()"
          [(ngModel)]="selectedTenant"
          (onChange)="onTenantChange($event)"
          optionLabel="tenant.name"
          [placeholder]="'Select Organization'"
          [showClear]="false"
          [filter]="availableTenants().length > 5"
          filterBy="tenant.name,tenant.slug"
          styleClass="tenant-dropdown"
          [style]="{ 'min-width': '250px' }"
        >
          <!-- Selected Item Template -->
          <ng-template pTemplate="selectedItem" let-membership>
            <div class="flex items-center gap-2">
              <i class="pi pi-building text-primary"></i>
              <div class="flex-1">
                <div class="font-semibold text-sm">{{ membership.tenant.name }}</div>
                <div class="text-xs text-gray-500">{{ membership.tenant.slug }}</div>
              </div>
              <p-badge
                [value]="getPlanLabel(membership.tenant.plan)"
                [severity]="getPlanSeverity(membership.tenant.plan)"
                styleClass="text-xs"
              ></p-badge>
            </div>
          </ng-template>

          <!-- Dropdown Items Template -->
          <ng-template pTemplate="item" let-membership>
            <div class="flex items-center justify-between p-2 hover:bg-gray-50">
              <div class="flex items-center gap-2 flex-1">
                <i class="pi pi-building text-gray-400"></i>
                <div>
                  <div class="font-semibold text-sm">{{ membership.tenant.name }}</div>
                  <div class="text-xs text-gray-500">{{ membership.tenant.slug }}</div>
                  @if (membership.isDefault) {
                    <span class="text-xs text-blue-500 flex items-center gap-1 mt-1">
                      <i class="pi pi-star-fill" style="font-size: 0.6rem;"></i>
                      Default
                    </span>
                  }
                </div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <p-badge
                  [value]="getPlanLabel(membership.tenant.plan)"
                  [severity]="getPlanSeverity(membership.tenant.plan)"
                  styleClass="text-xs"
                ></p-badge>
                <span class="text-xs text-gray-400">{{ membership.role }}</span>
              </div>
            </div>
          </ng-template>
        </p-select>
      } @else if (currentTenant()) {
        <!-- Single tenant - show as non-interactive badge -->
        <div class="single-tenant-display">
          <i class="pi pi-building text-primary mr-2"></i>
          <span class="font-semibold">{{ currentTenant()!.name }}</span>
          <p-badge
            [value]="getPlanLabel(currentTenant()!.plan)"
            [severity]="getPlanSeverity(currentTenant()!.plan)"
            styleClass="ml-2"
          ></p-badge>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tenant-selector {
        display: flex;
        align-items: center;
        min-width: 250px;
      }

      .error-state {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 0.375rem;
        background-color: #fee2e2;
      }

      .single-tenant-display {
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        background-color: #f3f4f6;
        border-radius: 0.375rem;
        font-size: 0.875rem;
      }

      :host ::ng-deep .tenant-dropdown {
        width: 100%;
      }

      :host ::ng-deep .p-select {
        border-radius: 0.375rem;
      }

      :host ::ng-deep .p-select-items-wrapper {
        max-height: 400px;
      }

      :host ::ng-deep .p-select-option {
        padding: 0 !important;
      }

      :host ::ng-deep .p-select-option:hover {
        background-color: transparent !important;
      }
    `,
  ],
})
export class TenantSelectorComponent implements OnInit {
  // Inject service using inject() function (Angular 14+)
  private readonly tenantService = inject(TenantContextService);

  // Signals from TenantContextService
  readonly loading = this.tenantService.loading;
  readonly error = this.tenantService.error;
  readonly currentTenant = this.tenantService.currentTenant;
  readonly availableTenants = this.tenantService.availableTenants;

  // Component-specific computed signals
  readonly hasMultipleTenants = computed(() => this.availableTenants().length > 1);

  // Local state for dropdown binding
  selectedTenant = signal<TenantMembership | null>(null);

  async ngOnInit() {
    // Load user's tenants from API
    try {
      await this.tenantService.fetchUserTenants();

      // Set initial selected tenant
      const current = this.currentTenant();
      if (current) {
        const membership = this.availableTenants().find((m) => m.tenant.id === current.id);
        if (membership) {
          this.selectedTenant.set(membership);
        }
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  }

  /**
   * Handle tenant selection change.
   * Updates tenant context and optionally reloads page.
   */
  onTenantChange(event: any) {
    const membership: TenantMembership = event.value;

    if (!membership) return;

    // Update tenant context
    this.tenantService.selectTenant(membership.tenant);

    // Optional: Reload page to clear any tenant-specific cached data
    // You can make this configurable or handle it more gracefully with a service
    // that clears caches without full page reload
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  /**
   * Get display label for plan badge.
   */
  getPlanLabel(plan: string): string {
    const labels: Record<string, string> = {
      free: 'Free',
      starter: 'Starter',
      professional: 'Pro',
      enterprise: 'Enterprise',
    };
    return labels[plan] || plan.toUpperCase();
  }

  /**
   * Get PrimeNG severity for plan badge color.
   */
  getPlanSeverity(plan: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'secondary'> = {
      free: 'secondary',
      starter: 'info',
      professional: 'success',
      enterprise: 'warn',
    };
    return (severityMap[plan] || 'secondary') as
      | 'success'
      | 'info'
      | 'warn'
      | 'danger'
      | 'secondary'
      | 'contrast';
  }
}
