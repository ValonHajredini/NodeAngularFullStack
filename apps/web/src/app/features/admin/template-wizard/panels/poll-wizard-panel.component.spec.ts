import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PollWizardPanelComponent } from './poll-wizard-panel.component';
import { TemplateWizardService } from '../services/template-wizard.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

describe('PollWizardPanelComponent', () => {
  let component: PollWizardPanelComponent;
  let fixture: ComponentFixture<PollWizardPanelComponent>;
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
      value: signal(TemplateCategory.POLLS),
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [PollWizardPanelComponent],
      providers: [{ provide: TemplateWizardService, useValue: mockWizardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PollWizardPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize with default form values', () => {
      expect(component.pollForm).toBeDefined();
      expect(component.pollForm.get('question')?.value).toBe('');
      expect(component.pollForm.get('trackingMethod')?.value).toBe('session');
      expect(component.pollForm.get('preventDuplicates')?.value).toBe(true);
      expect(component.pollForm.get('allowChangeVote')?.value).toBe(false);
      expect(component.pollForm.get('showResultsAfterVote')?.value).toBe(true);
    });

    it('should set required validator on question field', () => {
      const questionControl = component.pollForm.get('question');
      expect(questionControl?.hasError('required')).toBe(true);
    });

    it('should hydrate from wizard config on init', () => {
      const config = {
        templateName: 'Test Poll',
        templateDescription: '',
        categoryData: {
          question: 'What is your favorite color?',
          options: ['Red', 'Blue', 'Green'],
          trackingMethod: 'ip',
          preventDuplicates: false,
          allowChangeVote: true,
          showResultsAfterVote: false,
        },
      };

      mockWizardService.config.set(config);

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.pollForm.get('question')?.value).toBe('What is your favorite color?');
      expect(component.pollOptions()).toEqual(['Red', 'Blue', 'Green']);
      expect(component.pollForm.get('trackingMethod')?.value).toBe('ip');
      expect(component.pollForm.get('preventDuplicates')?.value).toBe(false);
      expect(component.pollForm.get('allowChangeVote')?.value).toBe(true);
      expect(component.pollForm.get('showResultsAfterVote')?.value).toBe(false);
    });
  });

  describe('Step 1: Question Setup', () => {
    it('should validate question field with minLength 10', () => {
      const questionControl = component.pollForm.get('question');
      questionControl?.setValue('Short');
      expect(questionControl?.hasError('minlength')).toBe(true);

      questionControl?.setValue('This is a valid poll question');
      expect(questionControl?.hasError('minlength')).toBe(false);
    });

    it('should validate question field with maxLength 500', () => {
      const questionControl = component.pollForm.get('question');
      const longText = 'a'.repeat(501);
      questionControl?.setValue(longText);
      expect(questionControl?.hasError('maxlength')).toBe(true);
    });

    it('should show validation error for empty question', () => {
      mockWizardService.currentStep.set(0);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Poll question is required');
    });

    it('should show validation error for short question', () => {
      mockWizardService.currentStep.set(0);
      component.pollForm.get('question')?.setValue('Short');
      component.pollForm.get('question')?.markAsTouched();
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Poll question must be at least 10 characters');
    });
  });

  describe('Step 2: Choice Management', () => {
    it('should allow adding poll options', () => {
      component.addPollOption('Option 1');
      expect(component.pollOptions()).toContain('Option 1');
    });

    it('should trim whitespace when adding options', () => {
      component.addPollOption('  Option 1  ');
      expect(component.pollOptions()).toContain('Option 1');
    });

    it('should prevent duplicate options', () => {
      component.addPollOption('Option 1');
      component.addPollOption('Option 1');
      expect(component.pollOptions().filter((o) => o === 'Option 1').length).toBe(1);
    });

    it('should allow removing poll options', () => {
      component.pollOptions.set(['Option 1', 'Option 2', 'Option 3']);
      component.removePollOption(1);
      expect(component.pollOptions()).toEqual(['Option 1', 'Option 3']);
    });

    it('should validate minimum 2 options', () => {
      mockWizardService.currentStep.set(1);
      component.pollOptions.set(['Option 1']);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Poll must have at least 2 options');
    });

    it('should validate maximum 10 options', () => {
      mockWizardService.currentStep.set(1);
      component.pollOptions.set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Poll cannot have more than 10 options');
    });

    it('should mark step as valid with 2-10 options', () => {
      mockWizardService.currentStep.set(1);
      component.pollOptions.set(['Option 1', 'Option 2', 'Option 3']);
      fixture.detectChanges();

      expect(component.isStepValid()).toBe(true);
    });
  });

  describe('Step 3: Duplicate-Vote Settings', () => {
    it('should have tracking method options', () => {
      expect(component.trackingMethodOptions.length).toBe(3);
      expect(component.trackingMethodOptions[0].value).toBe('session');
      expect(component.trackingMethodOptions[1].value).toBe('ip');
      expect(component.trackingMethodOptions[2].value).toBe('fingerprint');
    });

    it('should default to session tracking method', () => {
      expect(component.pollForm.get('trackingMethod')?.value).toBe('session');
    });

    it('should validate tracking method is required', () => {
      mockWizardService.currentStep.set(2);
      component.pollForm.get('trackingMethod')?.setValue(null);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Vote tracking method is required');
    });
  });

  describe('Step 4: Result Visibility', () => {
    it('should default to showing results after vote', () => {
      expect(component.pollForm.get('showResultsAfterVote')?.value).toBe(true);
    });

    it('should mark step as valid with any result visibility setting', () => {
      mockWizardService.currentStep.set(3);
      component.pollForm.get('showResultsAfterVote')?.setValue(false);
      fixture.detectChanges();

      expect(component.isStepValid()).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('should call wizardService.nextStep() when nextStep() is called and step is valid', () => {
      mockWizardService.currentStep.set(0);
      component.pollForm.get('question')?.setValue('This is a valid question for testing');
      fixture.detectChanges();

      component.nextStep();
      expect(mockWizardService.nextStep).toHaveBeenCalled();
    });

    it('should not call wizardService.nextStep() when step is invalid', () => {
      mockWizardService.currentStep.set(0);
      component.pollForm.get('question')?.setValue('');
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
      component.pollForm.patchValue({
        question: 'Updated question for the poll test',
        trackingMethod: 'fingerprint',
        preventDuplicates: false,
        allowChangeVote: true,
        showResultsAfterVote: false,
      });

      component.pollOptions.set(['Option A', 'Option B', 'Option C']);

      fixture.detectChanges();

      // Effect should have triggered updateConfig
      expect(mockWizardService.updateConfig).toHaveBeenCalledWith(
        jasmine.objectContaining({
          categoryData: jasmine.objectContaining({
            question: 'Updated question for the poll test',
            options: ['Option A', 'Option B', 'Option C'],
            trackingMethod: 'fingerprint',
            preventDuplicates: false,
            allowChangeVote: true,
            showResultsAfterVote: false,
          }),
        }),
      );
    });
  });

  describe('Help Text', () => {
    it('should provide help text for step 0', () => {
      mockWizardService.currentStep.set(0);
      const helpText = component.getStepHelpText();
      expect(helpText).toContain('question');
    });

    it('should provide help text for step 1', () => {
      mockWizardService.currentStep.set(1);
      const helpText = component.getStepHelpText();
      expect(helpText).toContain('options');
    });

    it('should provide help text for step 2', () => {
      mockWizardService.currentStep.set(2);
      const helpText = component.getStepHelpText();
      expect(helpText).toContain('duplicate');
    });

    it('should provide help text for step 3', () => {
      mockWizardService.currentStep.set(3);
      const helpText = component.getStepHelpText();
      expect(helpText).toContain('results');
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA labels on form controls', () => {
      const compiled = fixture.nativeElement;
      const questionTextarea = compiled.querySelector('#poll-question');
      expect(questionTextarea?.getAttribute('aria-describedby')).toBe('poll-question-help');
    });

    it('should have role="alert" on validation error messages', () => {
      mockWizardService.currentStep.set(0);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const errorMessages = compiled.querySelectorAll('p-message[severity="error"]');
      errorMessages.forEach((msg: Element) => {
        expect(msg.getAttribute('role')).toBe('alert');
      });
    });
  });
});
