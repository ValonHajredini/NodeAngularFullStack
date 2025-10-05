import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormCanvasComponent } from './form-canvas.component';
import { FormBuilderService } from '../form-builder.service';
import { FormFieldType } from '@nodeangularfullstack/shared';

describe('FormCanvasComponent', () => {
  let component: FormCanvasComponent;
  let fixture: ComponentFixture<FormCanvasComponent>;
  let formBuilderService: FormBuilderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormCanvasComponent],
      providers: [FormBuilderService],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCanvasComponent);
    component = fixture.componentInstance;
    formBuilderService = TestBed.inject(FormBuilderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty state when no fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should display fields when formFields has items', () => {
    // Add a test field
    formBuilderService.addField({
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const fieldCards = compiled.querySelectorAll('.field-card');
    expect(fieldCards.length).toBe(1);
  });

  it('should select field when clicked', () => {
    // Add a test field
    const testField = {
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(testField);
    fixture.detectChanges();

    component.onFieldClicked(testField);

    expect(formBuilderService.selectedField()).toEqual(testField);
  });

  it('should handle keyboard Enter key to select field', () => {
    const testField = {
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(testField);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');

    component.handleKeyboard(event, testField, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(formBuilderService.selectedField()).toEqual(testField);
  });

  it('should handle keyboard Delete key to remove field', () => {
    const testField = {
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(testField);
    expect(formBuilderService.formFields().length).toBe(1);

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    spyOn(event, 'preventDefault');

    component.handleKeyboard(event, testField, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(formBuilderService.formFields().length).toBe(0);
  });

  it('should handle keyboard ArrowDown to move field down', () => {
    const field1 = {
      id: 'field-1',
      type: FormFieldType.TEXT,
      fieldName: 'field1',
      label: 'Field 1',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    const field2 = {
      id: 'field-2',
      type: FormFieldType.EMAIL,
      fieldName: 'field2',
      label: 'Field 2',
      required: false,
      order: 1,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(field1);
    formBuilderService.addField(field2);

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    spyOn(event, 'preventDefault');

    component.handleKeyboard(event, field1, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    const fields = formBuilderService.formFields();
    expect(fields[0].id).toBe('field-2');
    expect(fields[1].id).toBe('field-1');
  });
});
