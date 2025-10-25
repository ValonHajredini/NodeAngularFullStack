import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SvgDrawingComponent } from './svg-drawing.component';
import { SvgDrawingService } from './svg-drawing.service';

describe('SvgDrawingComponent', () => {
  let component: SvgDrawingComponent;
  let fixture: ComponentFixture<SvgDrawingComponent>;
  let mockService: jasmine.SpyObj<SvgDrawingService>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('SvgDrawingService', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [SvgDrawingComponent],
      providers: [{ provide: SvgDrawingService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SvgDrawingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SVG Drawing');
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
});
