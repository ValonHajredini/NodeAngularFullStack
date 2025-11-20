import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeadingPreviewComponent } from './heading-preview.component';
import { FormField, FormFieldType, HeadingMetadata } from '@nodeangularfullstack/shared';

describe('HeadingPreviewComponent', () => {
  let component: HeadingPreviewComponent;
  let fixture: ComponentFixture<HeadingPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadingPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeadingPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    const field: FormField = {
      id: 'test-1',
      type: FormFieldType.HEADING,
      label: 'Test Heading',
      fieldName: 'test-heading',
      required: false,
      order: 0,
      metadata: {
        headingLevel: 'h2',
        alignment: 'left',
        fontWeight: 'bold',
      } as HeadingMetadata,
    };
    component.field = field;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render H2 heading by default', () => {
    const field: FormField = {
      id: 'test-1',
      type: FormFieldType.HEADING,
      label: 'Test Heading',
      fieldName: 'test-heading',
      required: false,
      order: 0,
      metadata: {
        headingLevel: 'h2',
        alignment: 'left',
        fontWeight: 'bold',
      } as HeadingMetadata,
    };
    component.field = field;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const h2 = compiled.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2?.textContent?.trim()).toBe('Test Heading');
  });

  it('should render correct heading level', () => {
    const field: FormField = {
      id: 'test-1',
      type: FormFieldType.HEADING,
      label: 'Test H3',
      fieldName: 'test-heading',
      required: false,
      order: 0,
      metadata: {
        headingLevel: 'h3',
        alignment: 'center',
        fontWeight: 'bold',
      } as HeadingMetadata,
    };
    component.field = field;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const h3 = compiled.querySelector('h3');
    expect(h3).toBeTruthy();
    expect(h3?.textContent?.trim()).toBe('Test H3');
  });

  it('should apply text alignment style', () => {
    const field: FormField = {
      id: 'test-1',
      type: FormFieldType.HEADING,
      label: 'Centered Heading',
      fieldName: 'test-heading',
      required: false,
      order: 0,
      metadata: {
        headingLevel: 'h2',
        alignment: 'center',
        fontWeight: 'bold',
      } as HeadingMetadata,
    };
    component.field = field;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h2') as HTMLElement;
    expect(heading.style.textAlign).toBe('center');
  });

  it('should apply custom color', () => {
    const field: FormField = {
      id: 'test-1',
      type: FormFieldType.HEADING,
      label: 'Colored Heading',
      fieldName: 'test-heading',
      required: false,
      order: 0,
      metadata: {
        headingLevel: 'h2',
        alignment: 'left',
        color: '#ff0000',
        fontWeight: 'bold',
      } as HeadingMetadata,
    };
    component.field = field;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h2') as HTMLElement;
    expect(heading.style.color).toBe('rgb(255, 0, 0)'); // browsers convert hex to rgb
  });

  it('should apply font weight', () => {
    const field: FormField = {
      id: 'test-1',
      type: FormFieldType.HEADING,
      label: 'Normal Weight Heading',
      fieldName: 'test-heading',
      required: false,
      order: 0,
      metadata: {
        headingLevel: 'h2',
        alignment: 'left',
        fontWeight: 'normal',
      } as HeadingMetadata,
    };
    component.field = field;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h2') as HTMLElement;
    expect(heading.style.fontWeight).toBe('normal');
  });
});
