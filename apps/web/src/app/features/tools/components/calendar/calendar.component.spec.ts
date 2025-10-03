import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarComponent } from './calendar.component';
import { CalendarService } from './calendar.service';

describe('CalendarComponent', () => {
  let component: CalendarComponent;
  let fixture: ComponentFixture<CalendarComponent>;
  let mockService: jasmine.SpyObj<CalendarService>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('CalendarService', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [{ provide: CalendarService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('calendar');
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

    expect(console.log).toHaveBeenCalledWith('calendar tool started');
  });
});
