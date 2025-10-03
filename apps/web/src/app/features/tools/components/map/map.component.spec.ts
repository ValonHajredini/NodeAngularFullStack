import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { MapService } from './map.service';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let mockService: jasmine.SpyObj<MapService>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('MapService', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [MapComponent],
      providers: [{ provide: MapService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('map');
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

    expect(console.log).toHaveBeenCalledWith('map tool started');
  });
});
