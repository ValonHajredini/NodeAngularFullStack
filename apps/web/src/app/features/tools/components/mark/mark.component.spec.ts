import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkComponent } from './mark.component';
import { MarkService } from './mark.service';

describe('MarkComponent', () => {
  let component: MarkComponent;
  let fixture: ComponentFixture<MarkComponent>;
  let mockService: jasmine.SpyObj<MarkService>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('MarkService', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [MarkComponent],
      providers: [{ provide: MarkService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('mark');
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

    expect(console.log).toHaveBeenCalledWith('mark tool started');
  });
});
