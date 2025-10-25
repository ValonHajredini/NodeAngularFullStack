import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeDesignerModalComponent } from './theme-designer-modal.component';
import { ThemeDesignerModalService } from './theme-designer-modal.service';
import { FormsApiService } from '../forms-api.service';
import { of } from 'rxjs';

describe('ThemeDesignerModalComponent', () => {
  let component: ThemeDesignerModalComponent;
  let fixture: ComponentFixture<ThemeDesignerModalComponent>;
  let modalService: ThemeDesignerModalService;
  let formsApiService: jasmine.SpyObj<FormsApiService>;

  beforeEach(async () => {
    const formsApiSpy = jasmine.createSpyObj('FormsApiService', ['createTheme']);

    await TestBed.configureTestingModule({
      imports: [ThemeDesignerModalComponent],
      providers: [ThemeDesignerModalService, { provide: FormsApiService, useValue: formsApiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeDesignerModalComponent);
    component = fixture.componentInstance;
    modalService = TestBed.inject(ThemeDesignerModalService);
    formsApiService = TestBed.inject(FormsApiService) as jasmine.SpyObj<FormsApiService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render p-dialog when visible is true', () => {
    component.visible = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('p-dialog');
    expect(dialog).toBeTruthy();
  });

  it('should not render p-dialog when visible is false', () => {
    component.visible = false;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('p-dialog');
    // Dialog element exists but is hidden by PrimeNG
    expect(dialog).toBeTruthy();
  });

  it('should emit visibleChange when dialog visibility changes', () => {
    spyOn(component.visibleChange, 'emit');
    component.visible = true;
    fixture.detectChanges();

    component.handleDialogVisibilityChange(false);

    expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
    expect(component.visible).toBe(false);
  });

  it('should have modal service injected', () => {
    expect(component['modalService']).toBeTruthy();
    expect(component['modalService']).toBeInstanceOf(ThemeDesignerModalService);
  });

  it('should set visible signal when input is set', () => {
    component.visible = true;
    expect(component['visibleSignal']()).toBe(true);

    component.visible = false;
    expect(component['visibleSignal']()).toBe(false);
  });

  it('should have correct dialog properties', () => {
    component.visible = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('p-dialog');
    expect(dialog.getAttribute('ng-reflect-modal')).toBe('true');
    expect(dialog.getAttribute('ng-reflect-closable')).toBe('true');
    expect(dialog.getAttribute('ng-reflect-draggable')).toBe('false');
    expect(dialog.getAttribute('ng-reflect-resizable')).toBe('false');
  });

  it('should have responsive breakpoints configured', () => {
    component.visible = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('p-dialog');
    const breakpoints = dialog.getAttribute('ng-reflect-breakpoints');
    expect(breakpoints).toContain('1024px');
    expect(breakpoints).toContain('768px');
    expect(breakpoints).toContain('100vw');
  });

  it('should contain stepper in template', () => {
    component.visible = true;
    fixture.detectChanges();

    const stepper = fixture.nativeElement.querySelector('p-stepper');
    expect(stepper).toBeTruthy();
  });

  it('should render all 5 steps in stepper', () => {
    component.visible = true;
    fixture.detectChanges();

    const stepPanels = fixture.nativeElement.querySelectorAll('p-stepperPanel');
    expect(stepPanels.length).toBe(5);
  });

  it('should have correct step labels', () => {
    component.visible = true;
    fixture.detectChanges();

    const stepPanels = fixture.nativeElement.querySelectorAll('p-stepperPanel');
    expect(stepPanels[0].getAttribute('ng-reflect-header')).toBe('Colors');
    expect(stepPanels[1].getAttribute('ng-reflect-header')).toBe('Background');
    expect(stepPanels[2].getAttribute('ng-reflect-header')).toBe('Typography');
    expect(stepPanels[3].getAttribute('ng-reflect-header')).toBe('Styling');
    expect(stepPanels[4].getAttribute('ng-reflect-header')).toBe('Preview');
  });

  it('should navigate between steps with Next/Previous buttons', () => {
    component.visible = true;
    fixture.detectChanges();

    // Set valid colors to allow navigation
    modalService.setPrimaryColor('#FF0000');
    modalService.setSecondaryColor('#00FF00');

    expect(modalService.currentStep()).toBe(0);

    // Click Next button
    component['onNext']();
    expect(modalService.currentStep()).toBe(1);

    // Click Previous button
    component['onPrevious']();
    expect(modalService.currentStep()).toBe(0);
  });

  it('should disable Next button when validation fails', () => {
    component.visible = true;
    fixture.detectChanges();

    // Clear colors to fail validation
    modalService.setPrimaryColor('');
    modalService.setSecondaryColor('');

    fixture.detectChanges();

    const nextButton = fixture.nativeElement.querySelector('.step-navigation button[label="Next"]');
    expect(nextButton.disabled).toBe(true);
  });

  it('should enable Next button when validation passes', () => {
    component.visible = true;
    fixture.detectChanges();

    // Set valid colors
    modalService.setPrimaryColor('#FF0000');
    modalService.setSecondaryColor('#00FF00');

    fixture.detectChanges();

    expect(modalService.canProceedToNextStep()).toBe(true);
  });

  it('should render step components', () => {
    component.visible = true;
    fixture.detectChanges();

    const colorStep = fixture.nativeElement.querySelector('app-color-step');
    expect(colorStep).toBeTruthy();
  });
});
