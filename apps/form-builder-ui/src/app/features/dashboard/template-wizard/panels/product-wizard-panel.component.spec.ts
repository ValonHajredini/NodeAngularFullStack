import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ProductWizardPanelComponent } from './product-wizard-panel.component';
import { TemplateWizardService } from '../services/template-wizard.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

describe('ProductWizardPanelComponent', () => {
  let component: ProductWizardPanelComponent;
  let fixture: ComponentFixture<ProductWizardPanelComponent>;
  let mockWizardService: jasmine.SpyObj<TemplateWizardService>;

  beforeEach(async () => {
    // Create mock wizard service with signals
    mockWizardService = jasmine.createSpyObj('TemplateWizardService', [
      'updateConfig',
      'nextStep',
      'previousStep',
    ]);

    // Mock signal properties
    Object.defineProperty(mockWizardService, 'currentStep', {
      value: signal(0),
      writable: true,
    });

    Object.defineProperty(mockWizardService, 'config', {
      value: signal({
        templateName: '',
        templateDescription: '',
        categoryData: {},
      }),
      writable: true,
    });

    Object.defineProperty(mockWizardService, 'category', {
      value: signal(TemplateCategory.ECOMMERCE),
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [ProductWizardPanelComponent],
      providers: [{ provide: TemplateWizardService, useValue: mockWizardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductWizardPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize with default form values', () => {
      expect(component.productForm).toBeDefined();
      expect(component.productForm.get('enableTax')?.value).toBe(false);
      expect(component.productForm.get('taxRate')?.value).toBe(8);
      expect(component.productForm.get('enableDiscounts')?.value).toBe(false);
      expect(component.productForm.get('enableInventoryTracking')?.value).toBe(true);
      expect(component.productForm.get('maxItemsPerOrder')?.value).toBe(10);
      expect(component.productForm.get('shippingMethod')?.value).toBe('standard');
    });

    it('should hydrate from wizard config on init', () => {
      const config = {
        templateName: 'Test Product',
        templateDescription: '',
        categoryData: {
          products: [{ name: 'Widget', sku: 'W-001', price: 29.99, stock: 100 }],
          enableTax: true,
          taxRate: 10,
          enableDiscounts: true,
          discountPercentage: 15,
          shippingMethod: 'express',
          shippingCost: 12.99,
        },
      };

      mockWizardService.config.set(config);

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.productInventory().length).toBe(1);
      expect(component.productForm.get('enableTax')?.value).toBe(true);
      expect(component.productForm.get('taxRate')?.value).toBe(10);
      expect(component.productForm.get('enableDiscounts')?.value).toBe(true);
      expect(component.productForm.get('discountPercentage')?.value).toBe(15);
      expect(component.productForm.get('shippingMethod')?.value).toBe('express');
    });
  });

  describe('Step 1: Inventory Items', () => {
    it('should add products to inventory', () => {
      component.addProduct('Widget', 'W-001', 29.99, 100);
      expect(component.productInventory().length).toBe(1);
      expect(component.productInventory()[0].name).toBe('Widget');
      expect(component.productInventory()[0].sku).toBe('W-001');
      expect(component.productInventory()[0].price).toBe(29.99);
      expect(component.productInventory()[0].stock).toBe(100);
    });

    it('should trim whitespace when adding products', () => {
      component.addProduct('  Widget  ', '  W-001  ', 29.99, 100);
      expect(component.productInventory()[0].name).toBe('Widget');
      expect(component.productInventory()[0].sku).toBe('W-001');
    });

    it('should not add products with duplicate SKU', () => {
      component.addProduct('Widget', 'W-001', 29.99, 100);
      component.addProduct('Widget 2', 'W-001', 39.99, 50);
      expect(component.productInventory().length).toBe(1);
    });

    it('should not add products with invalid data', () => {
      component.addProduct('', 'W-001', 29.99, 100);
      expect(component.productInventory().length).toBe(0);

      component.addProduct('Widget', '', 29.99, 100);
      expect(component.productInventory().length).toBe(0);

      component.addProduct('Widget', 'W-001', 0, 100);
      expect(component.productInventory().length).toBe(0);
    });

    it('should remove products from inventory', () => {
      component.productInventory.set([
        { name: 'Product 1', sku: 'P-001', price: 10, stock: 50 },
        { name: 'Product 2', sku: 'P-002', price: 20, stock: 30 },
        { name: 'Product 3', sku: 'P-003', price: 30, stock: 20 },
      ]);

      component.removeProduct(1);
      expect(component.productInventory().length).toBe(2);
      expect(component.productInventory()[1].sku).toBe('P-003');
    });

    it('should validate minimum 1 product', () => {
      mockWizardService.currentStep.set(0);
      component.productInventory.set([]);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Product template must have at least 1 product');
    });

    it('should calculate total inventory value', () => {
      component.productInventory.set([
        { name: 'Product 1', sku: 'P-001', price: 10, stock: 5 },
        { name: 'Product 2', sku: 'P-002', price: 20, stock: 3 },
      ]);

      expect(component.totalInventoryValue()).toBe(110); // (10*5) + (20*3)
    });
  });

  describe('Step 2: Pricing Tiers', () => {
    it('should validate tax rate range 0-100', () => {
      const taxRateControl = component.productForm.get('taxRate');

      taxRateControl?.setValue(-5);
      expect(taxRateControl?.hasError('min')).toBe(true);

      taxRateControl?.setValue(110);
      expect(taxRateControl?.hasError('max')).toBe(true);

      taxRateControl?.setValue(8);
      expect(taxRateControl?.valid).toBe(true);
    });

    it('should validate discount percentage range 0-100', () => {
      const discountControl = component.productForm.get('discountPercentage');

      discountControl?.setValue(-10);
      expect(discountControl?.hasError('min')).toBe(true);

      discountControl?.setValue(110);
      expect(discountControl?.hasError('max')).toBe(true);

      discountControl?.setValue(15);
      expect(discountControl?.valid).toBe(true);
    });

    it('should show validation error for invalid tax rate when tax enabled', () => {
      mockWizardService.currentStep.set(1);
      component.productForm.get('enableTax')?.setValue(true);
      component.productForm.get('taxRate')?.setValue(150);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Tax rate must be between 0 and 100');
    });
  });

  describe('Step 3: Availability', () => {
    it('should validate maxItemsPerOrder minimum 1', () => {
      const maxItemsControl = component.productForm.get('maxItemsPerOrder');

      maxItemsControl?.setValue(0);
      expect(maxItemsControl?.hasError('min')).toBe(true);

      maxItemsControl?.setValue(10);
      expect(maxItemsControl?.valid).toBe(true);
    });

    it('should show validation error for invalid maxItemsPerOrder', () => {
      mockWizardService.currentStep.set(2);
      component.productForm.get('maxItemsPerOrder')?.setValue(0);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Maximum items per order must be at least 1');
    });

    it('should update product stock', () => {
      component.productInventory.set([{ name: 'Widget', sku: 'W-001', price: 29.99, stock: 100 }]);

      component.updateProductStock(0, 75);
      expect(component.productInventory()[0].stock).toBe(75);
    });

    it('should update product price', () => {
      component.productInventory.set([{ name: 'Widget', sku: 'W-001', price: 29.99, stock: 100 }]);

      component.updateProductPrice(0, 39.99);
      expect(component.productInventory()[0].price).toBe(39.99);
    });
  });

  describe('Step 4: Fulfillment', () => {
    it('should have shipping method options', () => {
      expect(component.shippingMethodOptions.length).toBe(4);
      expect(component.shippingMethodOptions[0].value).toBe('standard');
      expect(component.shippingMethodOptions[3].value).toBe('pickup');
    });

    it('should default to standard shipping method', () => {
      expect(component.productForm.get('shippingMethod')?.value).toBe('standard');
    });

    it('should validate shipping method is required', () => {
      mockWizardService.currentStep.set(3);
      component.productForm.get('shippingMethod')?.setValue(null);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Shipping method is required');
    });
  });

  describe('Navigation', () => {
    it('should call wizardService.nextStep() when nextStep() is called and step is valid', () => {
      mockWizardService.currentStep.set(0);
      component.productInventory.set([{ name: 'Widget', sku: 'W-001', price: 29.99, stock: 100 }]);
      fixture.detectChanges();

      component.nextStep();
      expect(mockWizardService.nextStep).toHaveBeenCalled();
    });

    it('should not call wizardService.nextStep() when step is invalid', () => {
      mockWizardService.currentStep.set(0);
      component.productInventory.set([]);
      fixture.detectChanges();

      component.nextStep();
      expect(mockWizardService.nextStep).not.toHaveBeenCalled();
    });

    it('should call wizardService.previousStep() when previousStep() is called', () => {
      component.previousStep();
      expect(mockWizardService.previousStep).toHaveBeenCalled();
    });
  });

  describe('Config Updates', () => {
    it('should update wizard config when form values change', () => {
      component.productForm.patchValue({
        enableTax: true,
        taxRate: 10,
        enableDiscounts: true,
        discountPercentage: 20,
        shippingMethod: 'express',
        shippingCost: 15.99,
      });

      component.productInventory.set([{ name: 'Widget', sku: 'W-001', price: 29.99, stock: 100 }]);

      fixture.detectChanges();

      // Effect should have triggered updateConfig
      expect(mockWizardService.updateConfig).toHaveBeenCalledWith(
        jasmine.objectContaining({
          categoryData: jasmine.objectContaining({
            enableTax: true,
            taxRate: 10,
            enableDiscounts: true,
            discountPercentage: 20,
            shippingMethod: 'express',
          }),
        }),
      );
    });
  });

  describe('Help Text', () => {
    it('should provide help text for all steps', () => {
      for (let i = 0; i < 4; i++) {
        mockWizardService.currentStep.set(i);
        const helpText = component.getStepHelpText();
        expect(helpText.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA labels on form controls', () => {
      const compiled = fixture.nativeElement;
      const taxRateInput = compiled.querySelector('#tax-rate');
      if (taxRateInput) {
        expect(taxRateInput.getAttribute('aria-describedby')).toBeTruthy();
      }
    });
  });
});
