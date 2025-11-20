import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepProgressIndicatorComponent } from './step-progress-indicator.component';
import { FormStep } from '@nodeangularfullstack/shared';

describe('StepProgressIndicatorComponent', () => {
  let component: StepProgressIndicatorComponent;
  let fixture: ComponentFixture<StepProgressIndicatorComponent>;

  const mockSteps: FormStep[] = [
    { id: 'step-1', title: 'Personal Info', description: 'Enter your details', order: 0 },
    { id: 'step-2', title: 'Address', description: 'Your address', order: 1 },
    { id: 'step-3', title: 'Review', order: 2 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepProgressIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StepProgressIndicatorComponent);
    component = fixture.componentInstance;
    component.steps = mockSteps;
    component.totalSteps = mockSteps.length;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate progress percentage correctly', () => {
    component.currentStepIndex = 0;
    component.totalSteps = 3;
    expect(component.progressPercentage).toBeCloseTo(33.33, 1);

    component.currentStepIndex = 1;
    expect(component.progressPercentage).toBeCloseTo(66.67, 1);

    component.currentStepIndex = 2;
    expect(component.progressPercentage).toBe(100);
  });

  it('should render desktop stepper on large screens', () => {
    const desktopStepper = fixture.nativeElement.querySelector('.step-progress-desktop');
    expect(desktopStepper).toBeTruthy();
  });

  it('should render mobile progress bar on small screens', () => {
    const mobileProgress = fixture.nativeElement.querySelector('.step-progress-mobile');
    expect(mobileProgress).toBeTruthy();
  });

  it('should show current step as active', () => {
    component.currentStepIndex = 1;
    fixture.detectChanges();

    const stepItems = fixture.nativeElement.querySelectorAll('.step-item');
    expect(stepItems[1].classList.contains('active')).toBe(true);
  });

  it('should mark completed steps with checkmark', () => {
    component.validatedSteps = new Set([0, 1]);
    component.currentStepIndex = 2;
    fixture.detectChanges();

    const stepCircles = fixture.nativeElement.querySelectorAll('.step-circle');
    expect(stepCircles[0].classList.contains('completed')).toBe(false); // Check added to parent
    expect(stepCircles[0].querySelector('.pi-check')).toBeTruthy();
  });

  it('should emit event on clickable step click', () => {
    component.currentStepIndex = 2;
    fixture.detectChanges();

    spyOn(component.stepClicked, 'emit');

    const stepItems = fixture.nativeElement.querySelectorAll('.step-item');
    stepItems[0].click();

    expect(component.stepClicked.emit).toHaveBeenCalledWith(0);
  });

  it('should not emit event on current or future step click', () => {
    component.currentStepIndex = 1;
    fixture.detectChanges();

    spyOn(component.stepClicked, 'emit');

    const stepItems = fixture.nativeElement.querySelectorAll('.step-item');
    stepItems[1].click(); // Current step
    stepItems[2].click(); // Future step

    expect(component.stepClicked.emit).not.toHaveBeenCalled();
  });

  it('should determine if step is clickable', () => {
    component.currentStepIndex = 2;

    expect(component.isStepClickable(0)).toBe(true);
    expect(component.isStepClickable(1)).toBe(true);
    expect(component.isStepClickable(2)).toBe(false);
  });

  it('should display step description when provided', () => {
    component.currentStepIndex = 0;
    fixture.detectChanges();

    const descriptions = fixture.nativeElement.querySelectorAll('.step-description');
    expect(descriptions.length).toBe(2); // Only steps 0 and 1 have descriptions
  });

  it('should update mobile progress text', () => {
    component.currentStepIndex = 1;
    fixture.detectChanges();

    const progressText = fixture.nativeElement.querySelector('.progress-text');
    expect(progressText.textContent).toContain('Step 2 of 3');
    expect(progressText.textContent).toContain('Address');
  });
});
