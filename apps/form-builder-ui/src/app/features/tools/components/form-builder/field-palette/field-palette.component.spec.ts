import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldPaletteComponent } from './field-palette.component';
import { FormFieldType } from '@nodeangularfullstack/shared';

describe('FieldPaletteComponent', () => {
  let component: FieldPaletteComponent;
  let fixture: ComponentFixture<FieldPaletteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldPaletteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldPaletteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all 12 field types', () => {
    expect(component.fieldTypes.length).toBe(12);
  });

  it('should render field type cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const fieldCards = compiled.querySelectorAll('.field-type-card');
    expect(fieldCards.length).toBe(12);
  });

  it('should emit fieldSelected when field type clicked', () => {
    spyOn(component.fieldSelected, 'emit');
    component.onFieldTypeSelected(FormFieldType.TEXT);
    expect(component.fieldSelected.emit).toHaveBeenCalledWith(FormFieldType.TEXT);
  });

  it('should have cdkDrag directive on field cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const fieldCards = compiled.querySelectorAll('[cdkDrag]');
    expect(fieldCards.length).toBe(12);
  });

  it('should include all required field types', () => {
    const fieldTypeValues = component.fieldTypes.map((ft) => ft.type);
    expect(fieldTypeValues).toContain(FormFieldType.TEXT);
    expect(fieldTypeValues).toContain(FormFieldType.EMAIL);
    expect(fieldTypeValues).toContain(FormFieldType.NUMBER);
    expect(fieldTypeValues).toContain(FormFieldType.SELECT);
    expect(fieldTypeValues).toContain(FormFieldType.TEXTAREA);
    expect(fieldTypeValues).toContain(FormFieldType.FILE);
    expect(fieldTypeValues).toContain(FormFieldType.CHECKBOX);
    expect(fieldTypeValues).toContain(FormFieldType.RADIO);
    expect(fieldTypeValues).toContain(FormFieldType.DATE);
    expect(fieldTypeValues).toContain(FormFieldType.DATETIME);
    expect(fieldTypeValues).toContain(FormFieldType.TOGGLE);
    expect(fieldTypeValues).toContain(FormFieldType.DIVIDER);
  });
});
