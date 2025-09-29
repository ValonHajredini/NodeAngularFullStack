import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodoAppComponent } from './todo-app.component';
import { TodoAppService } from './todo-app.service';

describe('TodoAppComponent', () => {
  let component: TodoAppComponent;
  let fixture: ComponentFixture<TodoAppComponent>;
  let mockService: jasmine.SpyObj<TodoAppService>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('TodoAppService', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [TodoAppComponent],
      providers: [{ provide: TodoAppService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TodoAppComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('todo app');
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

    expect(console.log).toHaveBeenCalledWith('todo app tool started');
  });
});
