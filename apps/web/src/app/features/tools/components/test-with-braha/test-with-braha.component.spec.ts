import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestWithBrahaComponent } from './test-with-braha.component';
import { TestWithBrahaService } from './test-with-braha.service';

describe('TestWithBrahaComponent', () => {
  let component: TestWithBrahaComponent;
  let fixture: ComponentFixture<TestWithBrahaComponent>;
  let mockService: jasmine.SpyObj<TestWithBrahaService>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('TestWithBrahaService', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [TestWithBrahaComponent],
      providers: [{ provide: TestWithBrahaService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestWithBrahaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('test with braha');
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

    expect(console.log).toHaveBeenCalledWith('test with braha tool started');
  });
});
