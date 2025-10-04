import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldPropertiesComponent } from './field-properties.component';
import { FormBuilderService } from '../form-builder.service';
import { FormFieldType } from '@nodeangularfullstack/shared';

describe('FieldPropertiesComponent', () => {
  let component: FieldPropertiesComponent;
  let fixture: ComponentFixture<FieldPropertiesComponent>;
  let formBuilderService: FormBuilderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldPropertiesComponent],
      providers: [FormBuilderService],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldPropertiesComponent);
    component = fixture.componentInstance;
    formBuilderService = TestBed.inject(FormBuilderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty state when no field selected', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should display properties form when field is selected', () => {
    // Select a field
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
    formBuilderService.selectField(formBuilderService.formFields()[0]);
    fixture.detectChanges();

    expect(component.propertiesForm).toBeTruthy();
  });
});
