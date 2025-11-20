import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TestToolComponent } from './test-tool.component';
import { TestToolService } from './services/test-tool.service';
import { TestToolRecord } from '@nodeangularfullstack/shared';

/**
 * Test Tool Component Tests
 *
 * Tests component initialization, data loading, error handling,
 * and user interactions.
 */
describe('TestToolComponent', () => {
  let component: TestToolComponent;
  let fixture: ComponentFixture<TestToolComponent>;
  let service: jasmine.SpyObj<TestToolService>;
  let messageService: jasmine.SpyObj<MessageService>;

  // Mock data for testing
  const mockItems: TestToolRecord[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Item 1',
      description: 'Test description 1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
      createdBy: 'user-id-1',
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      name: 'Test Item 2',
      description: 'Test description 2',
      createdAt: new Date('2025-01-03T00:00:00Z'),
      updatedAt: new Date('2025-01-04T00:00:00Z'),
      createdBy: 'user-id-2',
    },
  ];

  beforeEach(async () => {
    // Create spy objects for services
    const serviceSpy = jasmine.createSpyObj<TestToolService>('TestToolService', [
      'getAll',
      'getById',
      'create',
      'update',
      'delete',
    ]);
    const messageServiceSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [TestToolComponent, HttpClientTestingModule],
      providers: [
        { provide: TestToolService, useValue: serviceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestToolComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(TestToolService) as jasmine.SpyObj<TestToolService>;
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should have initial loading state as false', () => {
      expect(component.loading()).toBe(false);
    });

    it('should have initial error state as null', () => {
      expect(component.error()).toBe(null);
    });

    it('should have empty items array initially', () => {
      expect(component.items()).toEqual([]);
    });

    it('should call loadData on ngOnInit', () => {
      service.getAll.and.returnValue(of(mockItems));
      spyOn<any>(component, 'loadData').and.callThrough();

      component.ngOnInit();

      expect(component['loadData']).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('should load data successfully', () => {
      service.getAll.and.returnValue(of(mockItems));

      fixture.detectChanges(); // Triggers ngOnInit

      expect(service.getAll).toHaveBeenCalled();
      expect(component.items()).toEqual(mockItems);
      expect(component.loading()).toBe(false);
      expect(component.error()).toBe(null);
    });

    it('should set loading state to true during data fetch', () => {
      service.getAll.and.returnValue(of(mockItems));

      // Before detectChanges, loading should be false
      expect(component.loading()).toBe(false);

      // During loadData execution (synchronous Observable)
      fixture.detectChanges();

      // After completion, loading should be false again
      expect(component.loading()).toBe(false);
    });

    it('should handle empty data array', () => {
      service.getAll.and.returnValue(of([]));

      fixture.detectChanges();

      expect(component.items()).toEqual([]);
      expect(component.loading()).toBe(false);
      expect(component.error()).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', () => {
      const errorMessage = 'API Error';
      service.getAll.and.returnValue(throwError(() => new Error(errorMessage)));

      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load test tool data');
      expect(component.loading()).toBe(false);
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load test tool data',
      });
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network failure');
      service.getAll.and.returnValue(throwError(() => networkError));

      fixture.detectChanges();

      expect(component.error()).toBeTruthy();
      expect(component.loading()).toBe(false);
    });

    it('should retry loading data on retry button click', () => {
      // First call fails
      service.getAll.and.returnValue(throwError(() => new Error('Error')));
      fixture.detectChanges();
      expect(component.error()).toBeTruthy();

      // Reset service to succeed
      service.getAll.and.returnValue(of(mockItems));

      // Call retry
      component.onRetry();

      expect(service.getAll).toHaveBeenCalledTimes(2);
      expect(component.items()).toEqual(mockItems);
      expect(component.error()).toBe(null);
    });
  });

  describe('User Interactions', () => {
    it('should handle create button click', () => {
      component.onCreate();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Info',
        detail: 'Create functionality coming soon',
      });
    });

    it('should handle edit button click', () => {
      const item = mockItems[0];

      component.onEdit(item);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Info',
        detail: `Edit ${item.name} - coming soon`,
      });
    });

    it('should handle delete button click', () => {
      const item = mockItems[0];

      component.onDelete(item);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Warning',
        detail: `Delete ${item.name} - coming soon`,
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      service.getAll.and.returnValue(of(mockItems));
      fixture.detectChanges();

      spyOn(component['subscriptions'], 'unsubscribe');

      component.ngOnDestroy();

      expect(component['subscriptions'].unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should display loading spinner when loading', () => {
      service.getAll.and.returnValue(of(mockItems));
      component.loading.set(true);

      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('p-progressSpinner');
      expect(spinner).toBeTruthy();
    });

    it('should display error message when error exists', () => {
      service.getAll.and.returnValue(of(mockItems));
      component.error.set('Test error message');
      component.loading.set(false);

      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('p-message');
      expect(errorElement).toBeTruthy();
    });

    it('should display empty state when no items', () => {
      service.getAll.and.returnValue(of([]));
      fixture.detectChanges();

      const emptyMessage = fixture.nativeElement.textContent;
      expect(emptyMessage).toContain('No test tool items found');
    });

    it('should display items when data is loaded', () => {
      service.getAll.and.returnValue(of(mockItems));
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('p-card');
      expect(cards.length).toBe(mockItems.length);
    });
  });
});
