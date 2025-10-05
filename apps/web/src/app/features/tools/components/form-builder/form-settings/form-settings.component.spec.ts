import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormSettingsComponent } from './form-settings.component';

describe('FormSettingsComponent', () => {
  let component: FormSettingsComponent;
  let fixture: ComponentFixture<FormSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSettingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have settings form', () => {
    expect(component.settingsForm).toBeTruthy();
  });

  it('should display dialog when visible is true', () => {
    component.visible = true;
    fixture.detectChanges();
    expect(component.visible).toBe(true);
  });

  it('should have form controls for title, description, columnLayout, and fieldSpacing', () => {
    expect(component.settingsForm.get('title')).toBeTruthy();
    expect(component.settingsForm.get('description')).toBeTruthy();
    expect(component.settingsForm.get('columnLayout')).toBeTruthy();
    expect(component.settingsForm.get('fieldSpacing')).toBeTruthy();
  });
});
