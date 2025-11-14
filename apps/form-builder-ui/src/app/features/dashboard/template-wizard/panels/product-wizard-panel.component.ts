import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { TemplateWizardService } from '../services/template-wizard.service';

/**
 * Product item interface for inventory
 */
interface ProductItem {
  name: string;
  sku: string;
  price: number;
  stock: number;
}

/**
 * Product Wizard Panel Component
 *
 * Provides a 4-step wizard interface for creating e-commerce product templates:
 * 1. Inventory Items - Add products with SKUs
 * 2. Pricing Tiers - Configure pricing and discounts
 * 3. Availability - Set stock levels and limits
 * 4. Fulfillment - Configure shipping and delivery options
 *
 * Binds to TemplateWizardService config signals for reactive state management.
 * Emits changes through wizard service for centralized state.
 *
 * @since Epic 30, Story 30.11
 *
 * @example
 * ```html
 * <app-product-wizard-panel></app-product-wizard-panel>
 * ```
 */
@Component({
  selector: 'app-product-wizard-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    Select,
    InputNumberModule,
    CheckboxModule,
    MessageModule,
    TooltipModule,
    TableModule,
  ],
  templateUrl: './product-wizard-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductWizardPanelComponent implements OnInit {
  /**
   * Injected services
   */
  private readonly wizardService = inject(TemplateWizardService);
  private readonly fb = inject(FormBuilder);

  /**
   * Current wizard step (0-based index)
   * Maps to 4-step product configuration flow
   */
  public readonly currentStep = computed(() => this.wizardService.currentStep());

  /**
   * Product configuration form group
   * Contains all 4 steps' form controls
   */
  public productForm!: FormGroup;

  /**
   * Product inventory array signal
   * Holds all products with SKU, price, and stock info
   */
  public readonly productInventory = signal<ProductItem[]>([]);

  /**
   * Step metadata for display
   * Controls step navigation and labels
   */
  public readonly steps = [
    { label: 'Inventory', icon: 'pi pi-box' },
    { label: 'Pricing', icon: 'pi pi-dollar' },
    { label: 'Availability', icon: 'pi pi-shopping-cart' },
    { label: 'Fulfillment', icon: 'pi pi-send' },
  ];

  /**
   * Shipping method options
   */
  public readonly shippingMethodOptions = [
    { label: 'Standard Shipping', value: 'standard' },
    { label: 'Express Shipping', value: 'express' },
    { label: 'Overnight Shipping', value: 'overnight' },
    { label: 'In-Store Pickup', value: 'pickup' },
  ];

  /**
   * Validation error messages signal
   * Updated reactively based on form validation state
   */
  public readonly validationErrors = computed(() => {
    const errors: string[] = [];

    if (this.currentStep() === 0 && this.productInventory().length < 1) {
      errors.push('Product template must have at least 1 product');
    }

    if (this.currentStep() === 1) {
      const taxRate = this.productForm?.get('taxRate')?.value;
      if (this.productForm?.get('enableTax')?.value && (taxRate < 0 || taxRate > 100)) {
        errors.push('Tax rate must be between 0 and 100');
      }
    }

    if (this.currentStep() === 2) {
      const maxPerOrder = this.productForm?.get('maxItemsPerOrder')?.value;
      if (maxPerOrder < 1) {
        errors.push('Maximum items per order must be at least 1');
      }
    }

    if (this.currentStep() === 3) {
      if (!this.productForm?.get('shippingMethod')?.value) {
        errors.push('Shipping method is required');
      }
    }

    return errors;
  });

  /**
   * Is current step valid computed signal
   * Used to enable/disable "Next" button
   */
  public readonly isStepValid = computed(() => {
    const errors = this.validationErrors();
    return errors.length === 0;
  });

  /**
   * Total inventory value computed signal
   * Sums up all product values (price * stock)
   */
  public readonly totalInventoryValue = computed(() => {
    return this.productInventory().reduce((sum, item) => sum + item.price * item.stock, 0);
  });

  constructor() {
    // Effect: Sync form state to wizard service config on changes
    effect(() => {
      if (this.productForm) {
        const formValue = this.productForm.value;
        this.wizardService.updateConfig({
          categoryData: {
            products: this.productInventory(),
            enableTax: formValue.enableTax,
            taxRate: formValue.taxRate,
            enableDiscounts: formValue.enableDiscounts,
            discountPercentage: formValue.discountPercentage,
            enableInventoryTracking: formValue.enableInventoryTracking,
            lowStockThreshold: formValue.lowStockThreshold,
            maxItemsPerOrder: formValue.maxItemsPerOrder,
            shippingMethod: formValue.shippingMethod,
            shippingCost: formValue.shippingCost,
            enableFreeShipping: formValue.enableFreeShipping,
            freeShippingThreshold: formValue.freeShippingThreshold,
          },
        });
      }
    });
  }

  /**
   * Component initialization
   * Creates form controls and hydrates from wizard service if resuming
   */
  ngOnInit(): void {
    this.initializeForm();
    this.hydrateFromWizardConfig();
  }

  /**
   * Initializes the product configuration form
   * Sets up form controls with validation rules
   * @private
   */
  private initializeForm(): void {
    this.productForm = this.fb.group({
      // Step 1: Inventory Items (handled via productInventory signal)

      // Step 2: Pricing Tiers
      enableTax: [false],
      taxRate: [8, [Validators.min(0), Validators.max(100)]],
      enableDiscounts: [false],
      discountPercentage: [0, [Validators.min(0), Validators.max(100)]],

      // Step 3: Availability
      enableInventoryTracking: [true],
      lowStockThreshold: [10, [Validators.min(0)]],
      maxItemsPerOrder: [10, [Validators.required, Validators.min(1)]],

      // Step 4: Fulfillment
      shippingMethod: ['standard', Validators.required],
      shippingCost: [5.99, [Validators.min(0)]],
      enableFreeShipping: [false],
      freeShippingThreshold: [50, [Validators.min(0)]],
    });
  }

  /**
   * Hydrates form from existing wizard configuration
   * Called when resuming a saved draft
   * @private
   */
  private hydrateFromWizardConfig(): void {
    const config = this.wizardService.config();
    const categoryData = config.categoryData as Record<string, any>;

    if (categoryData['enableTax'] !== undefined) {
      this.productForm.patchValue({
        enableTax: categoryData['enableTax'] ?? false,
        taxRate: categoryData['taxRate'] ?? 8,
        enableDiscounts: categoryData['enableDiscounts'] ?? false,
        discountPercentage: categoryData['discountPercentage'] ?? 0,
        enableInventoryTracking: categoryData['enableInventoryTracking'] ?? true,
        lowStockThreshold: categoryData['lowStockThreshold'] ?? 10,
        maxItemsPerOrder: categoryData['maxItemsPerOrder'] ?? 10,
        shippingMethod: categoryData['shippingMethod'] || 'standard',
        shippingCost: categoryData['shippingCost'] ?? 5.99,
        enableFreeShipping: categoryData['enableFreeShipping'] ?? false,
        freeShippingThreshold: categoryData['freeShippingThreshold'] ?? 50,
      });
    }

    if (Array.isArray(categoryData['products']) && categoryData['products'].length > 0) {
      this.productInventory.set(categoryData['products'] as ProductItem[]);
    }
  }

  /**
   * Navigate to previous step
   * Delegates to wizard service
   */
  public previousStep(): void {
    this.wizardService.previousStep();
  }

  /**
   * Navigate to next step
   * Validates current step before proceeding
   */
  public nextStep(): void {
    if (this.isStepValid()) {
      this.wizardService.nextStep();
    }
  }

  /**
   * Add a new product to inventory
   * @param name - Product name
   * @param sku - Stock keeping unit (SKU)
   * @param price - Product price
   * @param stock - Initial stock quantity
   */
  public addProduct(name: string, sku: string, price: number, stock: number): void {
    const trimmedName = name.trim();
    const trimmedSku = sku.trim();

    if (trimmedName && trimmedSku && price > 0 && stock >= 0) {
      // Check for duplicate SKU
      const existingSku = this.productInventory().find((p) => p.sku === trimmedSku);
      if (existingSku) {
        return; // Don't add duplicate SKU
      }

      this.productInventory.update((products) => [
        ...products,
        { name: trimmedName, sku: trimmedSku, price, stock },
      ]);
    }
  }

  /**
   * Remove a product from inventory by index
   * @param index - Product index to remove
   */
  public removeProduct(index: number): void {
    this.productInventory.update((products) => products.filter((_, i) => i !== index));
  }

  /**
   * Update product stock level
   * @param index - Product index
   * @param stock - New stock quantity
   */
  public updateProductStock(index: number, stock: number): void {
    this.productInventory.update((products) => {
      const updated = [...products];
      updated[index] = { ...updated[index], stock };
      return updated;
    });
  }

  /**
   * Update product price
   * @param index - Product index
   * @param price - New price
   */
  public updateProductPrice(index: number, price: number): void {
    this.productInventory.update((products) => {
      const updated = [...products];
      updated[index] = { ...updated[index], price };
      return updated;
    });
  }

  /**
   * Get help text for current step
   * Displayed in tooltip or info message
   */
  public getStepHelpText(): string {
    switch (this.currentStep()) {
      case 0:
        return 'Add products to your inventory with unique SKUs, prices, and stock quantities.';
      case 1:
        return 'Configure pricing options including tax rates and discount percentages.';
      case 2:
        return 'Set availability rules like inventory tracking, stock thresholds, and order limits.';
      case 3:
        return 'Define fulfillment options including shipping methods, costs, and free shipping thresholds.';
      default:
        return '';
    }
  }
}
