import { TestBed } from '@angular/core/testing';
import { TemplateWizardService, WizardStatus } from './template-wizard.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

describe('TemplateWizardService', () => {
  let service: TemplateWizardService;
  let localStorageSpy: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    // Create localStorage spy
    localStorageSpy = jasmine.createSpyObj('localStorage', ['getItem', 'setItem', 'removeItem']);

    // Replace global localStorage with spy
    Object.defineProperty(window, 'localStorage', {
      value: localStorageSpy,
      writable: true,
    });

    TestBed.configureTestingModule({
      providers: [TemplateWizardService],
    });

    service = TestBed.inject(TemplateWizardService);
  });

  afterEach(() => {
    // Clear any stored state
    localStorageSpy.removeItem.calls.reset();
    localStorageSpy.getItem.calls.reset();
    localStorageSpy.setItem.calls.reset();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(service.category()).toBeNull();
      expect(service.currentStep()).toBe(0);
      expect(service.status()).toBe(WizardStatus.IDLE);
      expect(service.config().templateName).toBe('');
      expect(service.config().categoryData).toEqual({});
    });

    it('should hydrate state from localStorage on initialization', () => {
      const mockState = {
        category: TemplateCategory.POLLS,
        currentStep: 1,
        config: {
          templateName: 'Test Poll',
          templateDescription: 'Description',
          categoryData: { minOptions: 2, maxOptions: 5 },
        },
        status: WizardStatus.IN_PROGRESS,
      };

      localStorageSpy.getItem.and.returnValue(JSON.stringify(mockState));

      // Create new service instance to trigger hydration
      const newService = new TemplateWizardService();

      expect(newService.category()).toBe(TemplateCategory.POLLS);
      expect(newService.currentStep()).toBe(1);
      expect(newService.status()).toBe(WizardStatus.IN_PROGRESS);
      expect(newService.config().templateName).toBe('Test Poll');
    });

    it('should handle missing localStorage gracefully', () => {
      localStorageSpy.getItem.and.returnValue(null);

      const newService = new TemplateWizardService();

      expect(newService.category()).toBeNull();
      expect(newService.status()).toBe(WizardStatus.IDLE);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageSpy.getItem.and.returnValue('invalid-json');

      // Should not throw error
      expect(() => new TemplateWizardService()).not.toThrow();
    });
  });

  describe('setCategory', () => {
    it('should set category and reset wizard state', () => {
      service.setCategory(TemplateCategory.POLLS);

      expect(service.category()).toBe(TemplateCategory.POLLS);
      expect(service.currentStep()).toBe(0);
      expect(service.status()).toBe(WizardStatus.IN_PROGRESS);
    });

    it('should initialize category-specific default data', () => {
      service.setCategory(TemplateCategory.QUIZ);

      const config = service.config();
      expect(config.categoryData.minQuestions).toBe(1);
      expect(config.categoryData.passingScore).toBe(70);
      expect(config.categoryData.allowRetakes).toBe(true);
    });

    it('should persist state to localStorage', () => {
      service.setCategory(TemplateCategory.ECOMMERCE);

      expect(localStorageSpy.setItem).toHaveBeenCalled();
    });
  });

  describe('Navigation Methods', () => {
    beforeEach(() => {
      service.setCategory(TemplateCategory.POLLS);
    });

    it('nextStep should advance to next step', () => {
      expect(service.currentStep()).toBe(0);

      service.nextStep();

      expect(service.currentStep()).toBe(1);
    });

    it('nextStep should not exceed max steps', () => {
      service.nextStep();
      service.nextStep();
      service.nextStep(); // Attempt to go beyond last step

      // Should stay at step 2 (last step index)
      expect(service.currentStep()).toBeLessThan(3);
    });

    it('nextStep should throw error if no category selected', () => {
      service.resetWizard();

      expect(() => service.nextStep()).toThrowError(/Cannot navigate: No category selected/);
    });

    it('previousStep should return to previous step', () => {
      service.nextStep();
      service.nextStep();
      expect(service.currentStep()).toBe(2);

      service.previousStep();

      expect(service.currentStep()).toBe(1);
    });

    it('previousStep should not go below step 0', () => {
      expect(service.currentStep()).toBe(0);

      service.previousStep();

      expect(service.currentStep()).toBe(0);
    });

    it('navigation should persist state', () => {
      service.nextStep();

      expect(localStorageSpy.setItem).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    beforeEach(() => {
      service.setCategory(TemplateCategory.POLLS);
    });

    it('should update template name', () => {
      service.updateConfig({ templateName: 'Customer Satisfaction Poll' });

      expect(service.config().templateName).toBe('Customer Satisfaction Poll');
    });

    it('should update template description', () => {
      service.updateConfig({ templateDescription: 'Rate our service' });

      expect(service.config().templateDescription).toBe('Rate our service');
    });

    it('should merge category data', () => {
      service.updateConfig({ categoryData: { minOptions: 3 } });

      const config = service.config();
      expect(config.categoryData.minOptions).toBe(3);
      // Should preserve other default values
      expect(config.categoryData.maxOptions).toBe(10);
    });

    it('should persist state after update', () => {
      service.updateConfig({ templateName: 'Test' });

      expect(localStorageSpy.setItem).toHaveBeenCalled();
    });
  });

  describe('Computed Signals', () => {
    beforeEach(() => {
      service.setCategory(TemplateCategory.POLLS);
    });

    describe('isValid', () => {
      it('should return false when template name is empty', () => {
        expect(service.isValid()).toBe(false);
      });

      it('should return true when configuration is valid', () => {
        service.updateConfig({ templateName: 'Valid Poll' });

        expect(service.isValid()).toBe(true);
      });

      it('should return false when category is null', () => {
        service.resetWizard();

        expect(service.isValid()).toBe(false);
      });

      it('should validate category-specific config', () => {
        service.updateConfig({
          templateName: 'Quiz',
          categoryData: { minQuestions: 0 }, // Invalid: below minimum
        });

        // Should be invalid due to category validation
        expect(service.validationErrors().length).toBeGreaterThan(0);
      });
    });

    describe('previewSchema', () => {
      it('should return null when configuration is invalid', () => {
        expect(service.previewSchema()).toBeNull();
      });

      it('should generate schema when configuration is valid', () => {
        service.updateConfig({ templateName: 'Valid Poll' });

        const schema = service.previewSchema();

        expect(schema).not.toBeNull();
        expect(schema?.category).toBe(TemplateCategory.POLLS);
        expect(schema?.fields.length).toBeGreaterThan(0);
      });

      it('should generate poll-specific schema', () => {
        service.updateConfig({ templateName: 'Customer Poll' });

        const schema = service.previewSchema();

        expect(schema?.businessLogicConfig?.type).toBe('poll');
      });
    });

    describe('wizardSummary', () => {
      it('should generate summary with template info', () => {
        service.updateConfig({
          templateName: 'Test Poll',
          templateDescription: 'Test description',
        });

        const summary = service.wizardSummary();

        expect(summary.templateName).toBe('Test Poll');
        expect(summary.templateDescription).toBe('Test description');
        expect(summary.category).toBe(TemplateCategory.POLLS);
      });

      it('should include configuration summary', () => {
        service.updateConfig({
          templateName: 'Test',
          categoryData: { minOptions: 3, maxOptions: 8 },
        });

        const summary = service.wizardSummary();

        expect(summary.configSummary.length).toBeGreaterThan(0);
        expect(summary.configSummary.join(' ')).toContain('Min options: 3');
        expect(summary.configSummary.join(' ')).toContain('Max options: 8');
      });

      it('should include step count', () => {
        const summary = service.wizardSummary();

        expect(summary.stepCount).toBe(3); // Default wizard has 3 steps
      });
    });
  });

  describe('Persistence', () => {
    it('saveTemplateDraft should persist to localStorage', () => {
      service.setCategory(TemplateCategory.QUIZ);
      service.updateConfig({ templateName: 'Draft Quiz' });

      service.saveTemplateDraft();

      expect(localStorageSpy.setItem).toHaveBeenCalled();
    });

    it('resetWizard should clear state and localStorage', () => {
      service.setCategory(TemplateCategory.POLLS);
      service.updateConfig({ templateName: 'Test' });

      service.resetWizard();

      expect(service.category()).toBeNull();
      expect(service.currentStep()).toBe(0);
      expect(service.status()).toBe(WizardStatus.IDLE);
      expect(service.config().templateName).toBe('');
      expect(localStorageSpy.removeItem).toHaveBeenCalled();
    });
  });

  describe('Category-Specific Initialization', () => {
    it('should initialize POLLS category correctly', () => {
      service.setCategory(TemplateCategory.POLLS);

      const config = service.config().categoryData;
      expect(config.minOptions).toBe(2);
      expect(config.maxOptions).toBe(10);
      expect(config.voteTracking).toBe('session');
    });

    it('should initialize QUIZ category correctly', () => {
      service.setCategory(TemplateCategory.QUIZ);

      const config = service.config().categoryData;
      expect(config.minQuestions).toBe(1);
      expect(config.passingScore).toBe(70);
      expect(config.allowRetakes).toBe(true);
    });

    it('should initialize ECOMMERCE category correctly', () => {
      service.setCategory(TemplateCategory.ECOMMERCE);

      const config = service.config().categoryData;
      expect(config.enableInventory).toBe(true);
      expect(config.enableTax).toBe(false);
    });

    it('should initialize SERVICES category correctly', () => {
      service.setCategory(TemplateCategory.SERVICES);

      const config = service.config().categoryData;
      expect(config.slotInterval).toBe(30);
      expect(config.maxBookingsPerSlot).toBe(1);
    });

    it('should initialize DATA_COLLECTION category correctly', () => {
      service.setCategory(TemplateCategory.DATA_COLLECTION);

      const config = service.config().categoryData;
      expect(config.minItems).toBe(1);
      expect(config.enableCategories).toBe(false);
    });

    it('should initialize EVENTS category correctly', () => {
      service.setCategory(TemplateCategory.EVENTS);

      const config = service.config().categoryData;
      expect(config.allowGuestCount).toBe(true);
      expect(config.maxTicketsPerOrder).toBe(10);
    });
  });

  describe('Validation Errors', () => {
    it('should expose validation errors via signal', () => {
      service.setCategory(TemplateCategory.QUIZ);
      service.updateConfig({
        templateName: 'Test',
        categoryData: { minQuestions: -1, passingScore: 150 }, // Invalid values
      });

      // Trigger validation by checking isValid
      service.isValid();

      expect(service.validationErrors().length).toBeGreaterThan(0);
    });
  });
});
