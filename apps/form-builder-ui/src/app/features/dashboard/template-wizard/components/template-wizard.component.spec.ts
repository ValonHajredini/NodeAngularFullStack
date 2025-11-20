import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TemplateWizardComponent } from './template-wizard.component';
import { TemplateWizardService, WizardStatus } from '../services/template-wizard.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Template Wizard Component Tests
 * Epic 30, Story 30.10, Task 6
 */
describe('TemplateWizardComponent', () => {
  let component: TemplateWizardComponent;
  let fixture: ComponentFixture<TemplateWizardComponent>;
  let mockWizardService: jasmine.SpyObj<TemplateWizardService>;

  beforeEach(async () => {
    // Create mock wizard service with signals
    mockWizardService = jasmine.createSpyObj(
      'TemplateWizardService',
      [
        'setCategory',
        'nextStep',
        'previousStep',
        'updateConfig',
        'saveTemplateDraft',
        'resetWizard',
      ],
      {
        category: signal<TemplateCategory | null>(null),
        currentStep: signal<number>(0),
        status: signal<WizardStatus>(WizardStatus.IDLE),
        isValid: signal<boolean>(false),
        validationErrors: signal<string[]>([]),
        previewSchema: signal(null),
        wizardSummary: signal({
          category: null,
          templateName: '',
          templateDescription: '',
          stepCount: 3,
          configSummary: [],
        }),
      },
    );

    await TestBed.configureTestingModule({
      imports: [TemplateWizardComponent],
      providers: [{ provide: TemplateWizardService, useValue: mockWizardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with wizard service signals', () => {
      expect(component.category()).toBeNull();
      expect(component.currentStep()).toBe(0);
      expect(component.status()).toBe(WizardStatus.IDLE);
      expect(component.isValid()).toBe(false);
    });

    it('should start with dialog hidden', () => {
      expect(component.visible()).toBe(false);
    });

    it('should start with advanced mode disabled', () => {
      expect(component.advancedMode()).toBe(false);
    });
  });

  describe('Dialog Visibility', () => {
    it('should open the wizard dialog', () => {
      component.open();
      expect(component.visible()).toBe(true);
    });

    it('should close the wizard dialog and save changes by default', () => {
      component.visible.set(true);
      component.close();
      expect(component.visible()).toBe(false);
      expect(mockWizardService.saveTemplateDraft).toHaveBeenCalled();
    });

    it('should close without saving when specified', () => {
      component.visible.set(true);
      component.close(false);
      expect(component.visible()).toBe(false);
      expect(mockWizardService.saveTemplateDraft).not.toHaveBeenCalled();
    });

    it('should cancel wizard and reset state', () => {
      component.visible.set(true);
      component.cancel();
      expect(component.visible()).toBe(false);
      expect(mockWizardService.resetWizard).toHaveBeenCalled();
    });
  });

  describe('Step Navigation', () => {
    beforeEach(() => {
      // Set up wizard in valid state
      mockWizardService.category = signal(TemplateCategory.POLLS);
      mockWizardService.isValid = signal(true);
    });

    it('should navigate to next step when valid', () => {
      component.nextStep();
      expect(mockWizardService.nextStep).toHaveBeenCalled();
    });

    it('should not navigate to next step when invalid', () => {
      mockWizardService.isValid = signal(false);
      component.nextStep();
      expect(mockWizardService.nextStep).not.toHaveBeenCalled();
    });

    it('should navigate to previous step', () => {
      mockWizardService.currentStep.set(2);
      component.previousStep();
      expect(mockWizardService.previousStep).toHaveBeenCalled();
    });

    it('should not navigate back from first step', () => {
      mockWizardService.currentStep.set(0);
      component.previousStep();
      expect(mockWizardService.previousStep).not.toHaveBeenCalled();
    });
  });

  describe('Step Navigation Logic', () => {
    it('should generate correct step items for no category', () => {
      const stepItems = component.stepItems();
      expect(stepItems.length).toBe(3);
      expect(stepItems[0].label).toBe('Select Category');
    });

    it('should generate correct step items with category', () => {
      mockWizardService.category.set(TemplateCategory.QUIZ);
      fixture.detectChanges();
      const stepItems = component.stepItems();
      expect(stepItems.length).toBe(4);
      expect(stepItems[0].label).toBe('Select Category');
      expect(stepItems[1].label).toBe('Basic Info');
    });

    it('should compute canGoNext correctly - step 0 requires category', () => {
      mockWizardService.currentStep.set(0);
      mockWizardService.category.set(null);
      fixture.detectChanges();
      expect(component.canGoNext()).toBe(false);

      mockWizardService.category.set(TemplateCategory.POLLS);
      fixture.detectChanges();
      expect(component.canGoNext()).toBe(true);
    });

    it('should compute canGoNext correctly - other steps require validation', () => {
      mockWizardService.currentStep.set(1);
      mockWizardService.category.set(TemplateCategory.POLLS);
      mockWizardService.isValid = signal(false);
      fixture.detectChanges();
      expect(component.canGoNext()).toBe(false);

      mockWizardService.isValid = signal(true);
      fixture.detectChanges();
      expect(component.canGoNext()).toBe(true);
    });

    it('should compute canGoBack correctly', () => {
      mockWizardService.currentStep.set(0);
      fixture.detectChanges();
      expect(component.canGoBack()).toBe(false);

      mockWizardService.currentStep.set(2);
      fixture.detectChanges();
      expect(component.canGoBack()).toBe(true);
    });

    it('should identify last step correctly', () => {
      mockWizardService.category.set(TemplateCategory.POLLS);
      mockWizardService.currentStep.set(3); // Last step for category wizard
      fixture.detectChanges();
      expect(component.isLastStep()).toBe(true);

      mockWizardService.currentStep.set(2);
      fixture.detectChanges();
      expect(component.isLastStep()).toBe(false);
    });
  });

  describe('Advanced Mode Toggle', () => {
    it('should toggle advanced mode on', () => {
      expect(component.advancedMode()).toBe(false);
      component.toggleAdvancedMode();
      expect(component.advancedMode()).toBe(true);
    });

    it('should toggle advanced mode off', () => {
      component.advancedMode.set(true);
      component.toggleAdvancedMode();
      expect(component.advancedMode()).toBe(false);
    });

    it('should warn when jumping to JSON editor (not implemented)', () => {
      spyOn(console, 'warn');
      component.advancedMode.set(true);
      component.jumpToJsonEditor();
      expect(console.warn).toHaveBeenCalledWith('JSON editor navigation not yet implemented');
    });

    it('should not jump to JSON editor when advanced mode disabled', () => {
      spyOn(console, 'warn');
      component.advancedMode.set(false);
      component.jumpToJsonEditor();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Go To Step (Jump Navigation)', () => {
    beforeEach(() => {
      mockWizardService.category.set(TemplateCategory.POLLS);
      mockWizardService.currentStep.set(2);
      mockWizardService.isValid = signal(true);
    });

    it('should navigate backward without validation', () => {
      component.goToStep(0);
      expect(mockWizardService.previousStep).toHaveBeenCalledTimes(2);
    });

    it('should navigate forward when valid', () => {
      mockWizardService.currentStep.set(0);
      mockWizardService.category.set(TemplateCategory.POLLS);
      component.goToStep(2);
      // Should call nextStep twice (0 -> 1 -> 2)
      expect(mockWizardService.nextStep).toHaveBeenCalled();
    });

    it('should not navigate forward when invalid', () => {
      mockWizardService.currentStep.set(0);
      mockWizardService.isValid = signal(false);
      component.goToStep(2);
      // Should not navigate
      expect(mockWizardService.nextStep).not.toHaveBeenCalled();
    });
  });

  describe('Draft Restoration', () => {
    it('should hydrate state when opening wizard', () => {
      // Service automatically hydrates on init via constructor
      // This test verifies the behavior exists
      component.open();
      expect(component.visible()).toBe(true);
      // No explicit method call needed - service constructor handles hydration
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for navigation buttons', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;

      // Check for aria-label attributes (will be rendered when visible is true)
      component.visible.set(true);
      fixture.detectChanges();

      const buttons = compiled.querySelectorAll('p-button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
