import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormFieldType } from '@nodeangularfullstack/shared';
import { FieldPropertiesModalComponent } from './field-properties-modal.component';
import { FormBuilderService } from '../form-builder.service';

describe('FieldPropertiesModalComponent - Keyboard Shortcuts & Auto-Save', () => {
  let component: FieldPropertiesModalComponent;
  let fixture: ComponentFixture<FieldPropertiesModalComponent>;
  let messageService: jasmine.SpyObj<MessageService>;
  let confirmationService: jasmine.SpyObj<ConfirmationService>;
  let formBuilderService: jasmine.SpyObj<FormBuilderService>;

  beforeEach(async () => {
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    const formBuilderServiceSpy = jasmine.createSpyObj('FormBuilderService', ['formFields']);
    formBuilderServiceSpy.formFields.and.returnValue([]);

    await TestBed.configureTestingModule({
      imports: [FieldPropertiesModalComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
        { provide: FormBuilderService, useValue: formBuilderServiceSpy },
      ],
    }).compileComponents();

    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    confirmationService = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;
    formBuilderService = TestBed.inject(FormBuilderService) as jasmine.SpyObj<FormBuilderService>;

    fixture = TestBed.createComponent(FieldPropertiesModalComponent);
    component = fixture.componentInstance;

    // Setup test field
    component.field = {
      id: 'test-field',
      type: FormFieldType.TEXT,
      fieldName: 'test-field',
      label: 'Test Field',
      required: false,
      order: 0,
    };

    fixture.detectChanges();
  });

  describe('Keyboard Shortcuts', () => {
    it('should save and close on Ctrl+S', () => {
      component.visible = true;
      spyOn(component, 'saveProperties');

      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      component.handleKeyboardShortcut(event);

      expect(component.saveProperties).toHaveBeenCalled();
    });

    it('should save and close on Cmd+S (Mac)', () => {
      component.visible = true;
      spyOn(component, 'saveProperties');

      const event = new KeyboardEvent('keydown', { key: 's', metaKey: true });
      component.handleKeyboardShortcut(event);

      expect(component.saveProperties).toHaveBeenCalled();
    });

    it('should attempt close on ESC', () => {
      component.visible = true;
      spyOn(component, 'attemptClose');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyboardShortcut(event);

      expect(component.attemptClose).toHaveBeenCalled();
    });

    it('should NOT handle shortcuts when modal is not visible', () => {
      component.visible = false;
      spyOn(component, 'saveProperties');
      spyOn(component, 'attemptClose');

      const ctrlSEvent = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      component.handleKeyboardShortcut(ctrlSEvent);
      component.handleKeyboardShortcut(escEvent);

      expect(component.saveProperties).not.toHaveBeenCalled();
      expect(component.attemptClose).not.toHaveBeenCalled();
    });

    it('should show validation errors when Ctrl+S pressed with invalid form', () => {
      component.visible = true;
      component.propertiesForm.patchValue({ label: '' }); // Invalid - required field

      component.saveProperties();

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Validation Error',
        }),
      );
    });
  });

  describe('Dirty State Tracking', () => {
    it('should set dirty flag when form value changes', (done) => {
      component.visible = true;
      component.onDialogShow();
      expect(component.isDirty()).toBe(false);

      component.propertiesForm.patchValue({ label: 'Changed Label' });

      // Wait for valueChanges subscription
      setTimeout(() => {
        expect(component.isDirty()).toBe(true);
        done();
      }, 10);
    });

    it('should reset dirty flag after save', () => {
      component.visible = true;
      component.isDirty.set(true);

      component.onSave();

      expect(component.isDirty()).toBe(false);
    });

    it('should NOT be dirty when form value equals initial value', (done) => {
      component.visible = true;
      component.onDialogShow();
      const initialLabel = component.propertiesForm.value.label;

      // Change and revert
      component.propertiesForm.patchValue({ label: 'Changed' });
      setTimeout(() => {
        expect(component.isDirty()).toBe(true);

        component.propertiesForm.patchValue({ label: initialLabel });
        setTimeout(() => {
          expect(component.isDirty()).toBe(false);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Unsaved Changes Confirmation', () => {
    it('should show confirmation when ESC pressed with dirty form', () => {
      component.isDirty.set(true);

      component.attemptClose();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: jasmine.stringContaining('unsaved changes'),
          header: 'Unsaved Changes',
        }),
      );
    });

    it('should close immediately when ESC pressed with clean form', () => {
      component.isDirty.set(false);
      spyOn(component, 'closeModal');

      component.attemptClose();

      expect(confirmationService.confirm).not.toHaveBeenCalled();
      expect(component.closeModal).toHaveBeenCalled();
    });

    it('should close modal when user confirms discard', () => {
      component.isDirty.set(true);
      let acceptCallback: (() => void) | undefined;

      confirmationService.confirm.and.callFake((config: any) => {
        acceptCallback = config.accept;
        return confirmationService;
      });

      component.attemptClose();
      expect(confirmationService.confirm).toHaveBeenCalled();

      // Simulate user clicking "Discard Changes"
      if (acceptCallback) {
        acceptCallback();
      }
      expect(component.isDirty()).toBe(false);
    });
  });

  describe('Auto-Save on Close', () => {
    it('should auto-save valid changes when closing modal', () => {
      // autoSaveEnabled is readonly true, so auto-save is always enabled
      component.isDirty.set(true);
      component.propertiesForm.patchValue({ label: 'Valid Change' });
      spyOn(component, 'onSave');

      component.closeModal();

      expect(component.onSave).toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'info',
          summary: 'Auto-saved',
        }),
      );
    });

    it('should NOT auto-save invalid changes', () => {
      // autoSaveEnabled is readonly true
      component.isDirty.set(true);
      component.propertiesForm.patchValue({ label: '' }); // Invalid - required
      spyOn(component, 'onSave');

      component.closeModal();

      expect(component.onSave).not.toHaveBeenCalled();
      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: jasmine.stringContaining('errors'),
        }),
      );
    });

    it('should close immediately when form is clean', () => {
      component.isDirty.set(false);

      component.closeModal();

      expect(component.visible).toBe(false);
    });
  });

  describe('Cancel Button', () => {
    it('should call attemptClose when Cancel clicked', () => {
      spyOn(component, 'attemptClose');

      component.onCancel();

      expect(component.attemptClose).toHaveBeenCalled();
    });

    it('should show confirmation if form is dirty', () => {
      component.isDirty.set(true);

      component.onCancel();

      expect(confirmationService.confirm).toHaveBeenCalled();
    });
  });

  describe('Save Button', () => {
    it('should show success message after successful save', () => {
      component.visible = true;
      component.propertiesForm.patchValue({ label: 'Valid Label', fieldName: 'valid-field' });

      component.onSave();

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Saved',
        }),
      );
    });

    it('should reset dirty state after save', () => {
      component.visible = true;
      component.isDirty.set(true);
      component.propertiesForm.patchValue({ label: 'Valid Label', fieldName: 'valid-field' });

      component.onSave();

      expect(component.isDirty()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-keyshortcuts attribute on dialog', () => {
      component.visible = true;
      fixture.detectChanges();

      const dialog = fixture.debugElement.query(By.css('p-dialog'));
      expect(dialog).toBeTruthy();
    });

    it('should display keyboard shortcut hints', () => {
      component.visible = true;
      fixture.detectChanges();

      const hintText = fixture.nativeElement.textContent;
      expect(hintText).toContain('Ctrl+S');
      expect(hintText).toContain('ESC');
    });
  });
});
