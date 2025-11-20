import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegoPdfComponent } from './lego-pdf.component';
import { LegoPdfService } from './lego-pdf.service';

describe('LegoPdfComponent', () => {
  let component: LegoPdfComponent;
  let fixture: ComponentFixture<LegoPdfComponent>;
  let mockService: jasmine.SpyObj<LegoPdfService>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('LegoPdfService', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [LegoPdfComponent],
      providers: [{ provide: LegoPdfService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LegoPdfComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Lego Pdf');
  });

  it('should initialize service on ngOnInit', async () => {
    await component.ngOnInit();
    expect(mockService.initialize).toHaveBeenCalled();
  });

  it('should handle initialization errors', async () => {
    mockService.initialize.and.returnValue(Promise.reject(new Error('Test error')));

    await component.ngOnInit();

    expect(component.error()).toBe('Failed to initialize tool. Please try again later.');
    expect(component.loading()).toBe(false);
  });

  it('should handle get started action', () => {
    spyOn(console, 'log');

    component.onGetStarted();

    expect(console.log).toHaveBeenCalledWith('Lego Pdf tool started');
  });
});
