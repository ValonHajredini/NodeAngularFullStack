import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormCardComponent } from './form-card.component';
import { FormMetadata, FormStatus } from '@nodeangularfullstack/shared';

describe('FormCardComponent', () => {
  let component: FormCardComponent;
  let fixture: ComponentFixture<FormCardComponent>;

  const mockForm: FormMetadata = {
    id: 'test-id',
    title: 'Test Form',
    description: 'Test Description',
    status: FormStatus.DRAFT,
    createdAt: new Date('2025-10-06'),
    updatedAt: new Date('2025-10-06'),
    createdBy: 'user-id',
    schema: {
      id: 'schema-id',
      formId: 'test-id',
      version: 1,
      fields: [],
      settings: {
        columnLayout: 1,
        fieldSpacing: 'normal',
        successMessage: 'Thank you!',
        allowMultipleSubmissions: true,
      },
      isPublished: false,
      createdAt: new Date('2025-10-06'),
      updatedAt: new Date('2025-10-06'),
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCardComponent);
    component = fixture.componentInstance;
    component.form = mockForm;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display form title and description', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Test Form');
    expect(compiled.textContent).toContain('Test Description');
  });

  it('should emit edit action when edit button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onEdit();
    expect(component.action.emit).toHaveBeenCalledWith({ type: 'edit', formId: 'test-id' });
  });

  it('should emit analytics action when analytics button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onAnalytics();
    expect(component.action.emit).toHaveBeenCalledWith({ type: 'analytics', formId: 'test-id' });
  });

  it('should emit delete action when delete button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onDelete();
    expect(component.action.emit).toHaveBeenCalledWith({ type: 'delete', formId: 'test-id' });
  });

  it('should emit copy-url action when copy button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onCopyUrl('test-token');
    expect(component.action.emit).toHaveBeenCalledWith({
      type: 'copy-url',
      formId: 'test-id',
      renderToken: 'test-token',
    });
  });

  it('should show draft badge for draft forms', () => {
    component.form = { ...mockForm, status: FormStatus.DRAFT };
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Draft');
  });

  it('should show published badge for published forms', () => {
    component.form = { ...mockForm, status: FormStatus.PUBLISHED };
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Published');
  });

  it('should generate correct publish URL', () => {
    const url = component.getPublishUrl('test-token');
    expect(url).toContain('/forms/render/test-token');
  });
});
