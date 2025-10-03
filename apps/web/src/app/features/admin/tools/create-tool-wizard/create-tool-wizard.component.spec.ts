import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { CreateToolWizardComponent } from './create-tool-wizard.component';
import { ToolsService } from '../../services/tools.service';
import { CreateToolRequest, Tool, ToolCategory } from '@nodeangularfullstack/shared';

/**
 * Test suite for CreateToolWizardComponent
 * Covers wizard navigation, form validation, API integration, and user interactions.
 */
describe('CreateToolWizardComponent', () => {
  let component: CreateToolWizardComponent;
  let fixture: ComponentFixture<CreateToolWizardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockToolsService: jasmine.SpyObj<ToolsService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  // Mock data
  const mockTool: Tool = {
    id: '1',
    key: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool for validation',
    slug: 'test-tool',
    icon: 'pi pi-cog',
    category: 'utility' as ToolCategory,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create spy objects for dependencies
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockToolsService = jasmine.createSpyObj('ToolsService', ['validateToolKey', 'createTool']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['add']);

    // Configure default spy return values
    mockToolsService.validateToolKey.and.returnValue(of(true));
    mockToolsService.createTool.and.returnValue(of(mockTool));

    await TestBed.configureTestingModule({
      imports: [CreateToolWizardComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ToolsService, useValue: mockToolsService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateToolWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize forms with correct validators', () => {
      expect(component.basicInfoForm).toBeTruthy();
      expect(component.configurationForm).toBeTruthy();

      // Check basic info form controls
      expect(component.basicInfoForm.get('name')?.validators).toBeTruthy();
      expect(component.basicInfoForm.get('description')?.validators).toBeTruthy();
      expect(component.basicInfoForm.get('toolKey')?.validators).toBeTruthy();

      // Check configuration form controls
      expect(component.configurationForm.get('slug')?.validators).toBeTruthy();
      expect(component.configurationForm.get('category')?.validators).toBeTruthy();
      expect(component.configurationForm.get('icon')?.value).toBe('pi pi-cog');
    });

    it('should start at step 0', () => {
      expect(component.activeStep()).toBe(0);
    });

    it('should initialize dropdown options', () => {
      expect(component.iconOptions.length).toBeGreaterThan(0);
      expect(component.categoryOptions.length).toBe(4);
      expect(component.categoryOptions).toContain(
        jasmine.objectContaining({ label: 'Productivity', value: 'productivity' }),
      );
    });
  });

  describe('Form Auto-generation', () => {
    it('should auto-generate key and slug when name changes', fakeAsync(() => {
      const testName = 'My Test Tool';
      const expectedKey = 'my-test-tool';

      component.basicInfoForm.patchValue({ name: testName });
      component.onNameChange();
      tick();

      expect(component.basicInfoForm.get('toolKey')?.value).toBe(expectedKey);
      expect(component.configurationForm.get('slug')?.value).toBe(expectedKey);
    }));

    it('should handle special characters in name generation', () => {
      const testName = 'Tool with! Special@Characters#';
      const expectedKey = 'tool-with-specialcharacters';

      component.basicInfoForm.patchValue({ name: testName });
      component.onNameChange();

      expect(component.basicInfoForm.get('toolKey')?.value).toBe(expectedKey);
    });

    it('should remove leading and trailing hyphens', () => {
      const testName = '  -Test Tool-  ';
      const expectedKey = 'test-tool';

      component.basicInfoForm.patchValue({ name: testName });
      component.onNameChange();

      expect(component.basicInfoForm.get('toolKey')?.value).toBe(expectedKey);
    });
  });

  describe('Key Validation', () => {
    it('should validate tool key availability', fakeAsync(() => {
      const testKey = 'available-key';
      mockToolsService.validateToolKey.and.returnValue(of(true));

      component.basicInfoForm.patchValue({
        toolKey: testKey,
        name: 'Test Tool',
        description: 'Test description for the tool',
      });

      // Trigger validation
      component.basicInfoForm.get('toolKey')?.markAsTouched();
      tick(600); // Wait for debounce

      expect(mockToolsService.validateToolKey).toHaveBeenCalledWith(testKey);
      expect(component.keyValidationError()).toBeNull();
    }));

    it('should show error when key is taken', fakeAsync(() => {
      const testKey = 'taken-key';
      mockToolsService.validateToolKey.and.returnValue(of(false));

      component.basicInfoForm.patchValue({
        toolKey: testKey,
        name: 'Test Tool',
        description: 'Test description for the tool',
      });

      // Manually trigger validation to avoid debounce in test
      component['validateToolKey'](testKey);
      tick();

      expect(component.keyValidationError()).toBe(
        'This tool key is already taken. Please choose a different one.',
      );
    }));

    it('should handle validation API errors gracefully', fakeAsync(() => {
      const testKey = 'error-key';
      mockToolsService.validateToolKey.and.returnValue(throwError(() => new Error('API Error')));

      component['validateToolKey'](testKey);
      tick();

      expect(component.keyValidationError()).toBe(
        'Unable to validate key. Please check your connection.',
      );
    }));

    it('should not validate keys shorter than 2 characters', () => {
      component['validateToolKey']('a');
      expect(mockToolsService.validateToolKey).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should require all basic info fields', () => {
      expect(component.basicInfoForm.valid).toBeFalsy();

      // Test individual field requirements
      const nameControl = component.basicInfoForm.get('name');
      const descriptionControl = component.basicInfoForm.get('description');
      const keyControl = component.basicInfoForm.get('toolKey');

      expect(nameControl?.errors?.['required']).toBeTruthy();
      expect(descriptionControl?.errors?.['required']).toBeTruthy();
      expect(keyControl?.errors?.['required']).toBeTruthy();
    });

    it('should validate name length constraints', () => {
      const nameControl = component.basicInfoForm.get('name');

      // Too short
      nameControl?.setValue('A');
      expect(nameControl?.errors?.['minlength']).toBeTruthy();

      // Too long
      nameControl?.setValue('A'.repeat(51));
      expect(nameControl?.errors?.['maxlength']).toBeTruthy();

      // Valid length
      nameControl?.setValue('Valid Tool Name');
      expect(nameControl?.errors?.['minlength']).toBeFalsy();
      expect(nameControl?.errors?.['maxlength']).toBeFalsy();
    });

    it('should validate description length constraints', () => {
      const descriptionControl = component.basicInfoForm.get('description');

      // Too short
      descriptionControl?.setValue('Short');
      expect(descriptionControl?.errors?.['minlength']).toBeTruthy();

      // Too long
      descriptionControl?.setValue('A'.repeat(201));
      expect(descriptionControl?.errors?.['maxlength']).toBeTruthy();

      // Valid length
      descriptionControl?.setValue(
        'This is a valid description for the tool that meets length requirements.',
      );
      expect(descriptionControl?.errors?.['minlength']).toBeFalsy();
      expect(descriptionControl?.errors?.['maxlength']).toBeFalsy();
    });

    it('should validate tool key pattern', () => {
      const keyControl = component.basicInfoForm.get('toolKey');

      // Invalid patterns
      keyControl?.setValue('Tool Key');
      expect(keyControl?.errors?.['pattern']).toBeTruthy();

      keyControl?.setValue('tool_key');
      expect(keyControl?.errors?.['pattern']).toBeTruthy();

      keyControl?.setValue('TOOL-KEY');
      expect(keyControl?.errors?.['pattern']).toBeTruthy();

      // Valid pattern
      keyControl?.setValue('tool-key-123');
      expect(keyControl?.errors?.['pattern']).toBeFalsy();
    });

    it('should require category selection', () => {
      expect(component.configurationForm.valid).toBeFalsy();

      const categoryControl = component.configurationForm.get('category');
      expect(categoryControl?.errors?.['required']).toBeTruthy();

      categoryControl?.setValue('productivity');
      expect(categoryControl?.errors?.['required']).toBeFalsy();
    });
  });

  describe('Preview Functionality', () => {
    beforeEach(() => {
      // Set up valid form data
      component.basicInfoForm.patchValue({
        name: 'Test Tool',
        description: 'A comprehensive test tool for validation',
        toolKey: 'test-tool',
      });

      component.configurationForm.patchValue({
        slug: 'test-tool',
        icon: 'pi pi-wrench',
        category: 'utility',
      });
    });

    it('should get preview icon correctly', () => {
      expect(component.getPreviewIcon()).toBe('pi pi-wrench');
    });

    it('should get category label correctly', () => {
      expect(component.getCategoryLabel('productivity')).toBe('Productivity');
      expect(component.getCategoryLabel('utility')).toBe('Utility');
      expect(component.getCategoryLabel('communication')).toBe('Communication');
      expect(component.getCategoryLabel('data')).toBe('Data');
      expect(component.getCategoryLabel('unknown')).toBe('');
    });

    it('should validate form completeness', () => {
      expect(component.isFormValid()).toBeTruthy();

      // Make form invalid
      component.basicInfoForm.get('name')?.setValue('');
      expect(component.isFormValid()).toBeFalsy();
    });
  });

  describe('Tool Creation', () => {
    beforeEach(() => {
      // Set up valid form data
      component.basicInfoForm.patchValue({
        name: 'Test Tool',
        description: 'A comprehensive test tool for validation',
        toolKey: 'test-tool',
      });

      component.configurationForm.patchValue({
        slug: 'test-tool',
        icon: 'pi pi-wrench',
        category: 'utility',
      });
    });

    it('should create tool with correct data structure', fakeAsync(() => {
      component.createTool();
      tick();

      const expectedRequest: CreateToolRequest = {
        key: 'test-tool',
        name: 'Test Tool',
        description: 'A comprehensive test tool for validation',
        slug: 'test-tool',
        icon: 'pi pi-wrench',
        category: 'utility',
        active: true,
      };

      expect(mockToolsService.createTool).toHaveBeenCalledWith(expectedRequest);
    }));

    it('should show success message and navigate back on successful creation', fakeAsync(() => {
      component.createTool();
      tick();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Tool "Test Tool" created successfully!',
      });

      // Wait for navigation delay
      tick(2100);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/tools']);
    }));

    it('should handle creation errors gracefully', fakeAsync(() => {
      const errorResponse = {
        error: {
          error: {
            message: 'Tool key already exists',
          },
        },
      };
      mockToolsService.createTool.and.returnValue(throwError(() => errorResponse));

      component.createTool();
      tick();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Tool key already exists',
      });

      expect(component.submitting()).toBeFalsy();
    }));

    it('should show generic error message when error details unavailable', fakeAsync(() => {
      mockToolsService.createTool.and.returnValue(throwError(() => new Error('Network error')));

      component.createTool();
      tick();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create tool. Please try again.',
      });
    }));

    it('should prevent submission when form is invalid', () => {
      component.basicInfoForm.get('name')?.setValue('');

      component.createTool();

      expect(mockToolsService.createTool).not.toHaveBeenCalled();
    });

    it('should set submitting state during creation', () => {
      expect(component.submitting()).toBeFalsy();

      component.createTool();
      expect(component.submitting()).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to tools list', () => {
      component.navigateBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/tools']);
    });
  });

  describe('Component Lifecycle', () => {
    it('should set up key validation on init', () => {
      spyOn(component as any, 'setupKeyValidation');
      component.ngOnInit();
      expect((component as any).setupKeyValidation).toHaveBeenCalled();
    });

    it('should clean up subscriptions on destroy', () => {
      spyOn((component as any).destroy$, 'next');
      spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect((component as any).destroy$.next).toHaveBeenCalled();
      expect((component as any).destroy$.complete).toHaveBeenCalled();
    });
  });

  describe('Real-time Key Validation', () => {
    it('should debounce key validation', fakeAsync(() => {
      const keyControl = component.basicInfoForm.get('toolKey');

      // Rapidly change the key value
      keyControl?.setValue('test');
      tick(200);
      keyControl?.setValue('test-');
      tick(200);
      keyControl?.setValue('test-tool');
      tick(600); // Complete debounce period

      // Should only validate the final value
      expect(mockToolsService.validateToolKey).toHaveBeenCalledTimes(1);
      expect(mockToolsService.validateToolKey).toHaveBeenCalledWith('test-tool');
    }));

    it('should not validate invalid keys', fakeAsync(() => {
      const keyControl = component.basicInfoForm.get('toolKey');

      keyControl?.setValue('Test Tool'); // Invalid pattern
      tick(600);

      expect(mockToolsService.validateToolKey).not.toHaveBeenCalled();
    }));

    it('should not validate keys shorter than 2 characters', fakeAsync(() => {
      const keyControl = component.basicInfoForm.get('toolKey');

      keyControl?.setValue('t');
      tick(600);

      expect(mockToolsService.validateToolKey).not.toHaveBeenCalled();
    }));
  });

  describe('Error Handling', () => {
    it('should handle validation state correctly', () => {
      expect(component.validatingKey()).toBeFalsy();
      expect(component.keyValidationError()).toBeNull();

      component['validatingKey'].set(true);
      component['keyValidationError'].set('Test error');

      expect(component.validatingKey()).toBeTruthy();
      expect(component.keyValidationError()).toBe('Test error');
    });

    it('should clear validation errors when starting new validation', () => {
      component['keyValidationError'].set('Previous error');

      component['validateToolKey']('new-key');

      expect(component.keyValidationError()).toBeNull();
      expect(component.validatingKey()).toBeTruthy();
    });
  });

  describe('Form State Management', () => {
    it('should maintain form data across component lifecycle', () => {
      const testData = {
        name: 'Persistent Tool',
        description: 'This data should persist during navigation',
        toolKey: 'persistent-tool',
      };

      component.basicInfoForm.patchValue(testData);

      expect(component.basicInfoForm.get('name')?.value).toBe(testData.name);
      expect(component.basicInfoForm.get('description')?.value).toBe(testData.description);
      expect(component.basicInfoForm.get('toolKey')?.value).toBe(testData.toolKey);
    });

    it('should update slug when key changes', () => {
      component.basicInfoForm.patchValue({ name: 'New Tool Name' });
      component.onNameChange();

      expect(component.configurationForm.get('slug')?.value).toBe('new-tool-name');
    });
  });
});
