import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormAnalyticsComponent } from './form-analytics.component';
import { FormsApiService } from '../forms-api.service';
import { ToolConfigService } from '@core/services/tool-config.service';
import { MessageService } from 'primeng/api';
import { FormMetadata, FormStatus, FormSubmission } from '@nodeangularfullstack/shared';

describe('FormAnalyticsComponent', () => {
  let component: FormAnalyticsComponent;
  let fixture: ComponentFixture<FormAnalyticsComponent>;
  let mockFormsApiService: jasmine.SpyObj<FormsApiService>;
  let mockToolConfigService: jasmine.SpyObj<ToolConfigService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  const mockFormMetadata: FormMetadata = {
    id: 'test-form-id',
    userId: 'user-123',
    title: 'Test Form',
    description: 'Test form description',
    status: FormStatus.PUBLISHED,
    schema: {
      id: 'schema-123',
      formId: 'test-form-id',
      version: 1,
      fields: [
        {
          id: 'field-1',
          type: 'text' as any,
          label: 'Name',
          fieldName: 'name',
          required: true,
          order: 0,
        },
        {
          id: 'field-2',
          type: 'email' as any,
          label: 'Email',
          fieldName: 'email',
          required: true,
          order: 1,
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you!',
          allowMultipleSubmissions: true,
        },
      },
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubmissions: FormSubmission[] = [
    {
      id: 'sub-1',
      formSchemaId: 'schema-123',
      values: { name: 'John Doe', email: 'john@example.com' },
      submittedAt: new Date('2025-01-01T10:00:00'),
      submitterIp: '192.168.1.1',
    },
    {
      id: 'sub-2',
      formSchemaId: 'schema-123',
      values: { name: 'Jane Smith', email: 'jane@example.com' },
      submittedAt: new Date('2025-01-02T11:00:00'),
      submitterIp: '192.168.1.2',
    },
  ];

  beforeEach(async () => {
    mockFormsApiService = jasmine.createSpyObj('FormsApiService', [
      'getFormById',
      'getSubmissions',
    ]);
    mockToolConfigService = jasmine.createSpyObj('ToolConfigService', ['getActiveConfig']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['add']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('test-form-id'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [FormAnalyticsComponent],
      providers: [
        { provide: FormsApiService, useValue: mockFormsApiService },
        { provide: ToolConfigService, useValue: mockToolConfigService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormAnalyticsComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should extract form ID from route params on init', () => {
    mockToolConfigService.getActiveConfig.and.returnValue(of(null));
    mockFormsApiService.getFormById.and.returnValue(of(mockFormMetadata));
    mockFormsApiService.getSubmissions.and.returnValue(
      of({
        data: mockSubmissions,
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
        success: true,
        timestamp: new Date().toISOString(),
      }),
    );

    component.ngOnInit();

    expect(component.formId()).toBe('test-form-id');
    expect(mockActivatedRoute.snapshot.paramMap.get).toHaveBeenCalledWith('id');
  });

  it('should load form details and submissions on init', () => {
    mockToolConfigService.getActiveConfig.and.returnValue(of(null));
    mockFormsApiService.getFormById.and.returnValue(of(mockFormMetadata));
    mockFormsApiService.getSubmissions.and.returnValue(
      of({
        data: mockSubmissions,
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
        success: true,
        timestamp: new Date().toISOString(),
      }),
    );

    component.ngOnInit();

    expect(mockFormsApiService.getFormById).toHaveBeenCalledWith('test-form-id');
    expect(component.formTitle()).toBe('Test Form');
    expect(component.formFields().length).toBe(2);
  });

  it('should display loading state while fetching data', () => {
    mockToolConfigService.getActiveConfig.and.returnValue(of(null));
    mockFormsApiService.getFormById.and.returnValue(of(mockFormMetadata).pipe());
    mockFormsApiService.getSubmissions.and.returnValue(
      of({
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
        success: true,
        timestamp: new Date().toISOString(),
      }),
    );

    component.loadFormDetails();

    expect(component.isLoading()).toBe(true);
  });

  it('should handle error when form not found', () => {
    const error = { error: { message: 'Form not found' } };
    mockToolConfigService.getActiveConfig.and.returnValue(of(null));
    mockFormsApiService.getFormById.and.returnValue(throwError(() => error));

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.error()).toBe('Form not found');
    expect(mockMessageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Load Failed',
      detail: 'Form not found',
      life: 3000,
    });
  });

  it('should display empty state when no submissions', () => {
    mockToolConfigService.getActiveConfig.and.returnValue(of(null));
    mockFormsApiService.getFormById.and.returnValue(of(mockFormMetadata));
    mockFormsApiService.getSubmissions.and.returnValue(
      of({
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
        success: true,
        timestamp: new Date().toISOString(),
      }),
    );

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.submissions().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No submissions yet');
  });

  it('should load submissions with pagination', () => {
    mockFormsApiService.getSubmissions.and.returnValue(
      of({
        data: mockSubmissions,
        pagination: {
          page: 2,
          pageSize: 25,
          totalItems: 100,
          totalPages: 4,
          hasNext: true,
          hasPrevious: true,
        },
        success: true,
        timestamp: new Date().toISOString(),
      }),
    );

    component.formId.set('test-form-id');
    component.loadSubmissions({ first: 25, rows: 25 });

    expect(mockFormsApiService.getSubmissions).toHaveBeenCalledWith('test-form-id', 2, 25);
    expect(component.submissions().length).toBe(2);
    expect(component.totalRecords()).toBe(100);
  });

  it('should mask IP address correctly', () => {
    expect(component.maskIpAddress('192.168.1.1')).toBe('192.168._._');
    expect(component.maskIpAddress('10.0.0.1')).toBe('10.0._._');
    expect(component.maskIpAddress('')).toBe('N/A');
  });

  it('should format field values correctly', () => {
    expect(component.formatFieldValue('text value')).toBe('text value');
    expect(component.formatFieldValue(true)).toBe('Yes');
    expect(component.formatFieldValue(false)).toBe('No');
    expect(component.formatFieldValue(['a', 'b', 'c'])).toBe('a, b, c');
    expect(component.formatFieldValue(null)).toBe('-');
    expect(component.formatFieldValue(undefined)).toBe('-');
  });

  it('should navigate back to forms list', () => {
    component.navigateBack();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/tools/form-builder']);
  });

  it('should set error when form ID is missing', () => {
    mockActivatedRoute.snapshot.paramMap.get.and.returnValue(null);

    component.ngOnInit();

    expect(component.error()).toBe('Form ID is required');
  });

  it('should load tool configuration', () => {
    const mockConfig: any = { displayMode: 'full-width' };
    mockToolConfigService.getActiveConfig.and.returnValue(of(mockConfig));
    mockFormsApiService.getFormById.and.returnValue(of(mockFormMetadata));
    mockFormsApiService.getSubmissions.and.returnValue(
      of({
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
        success: true,
        timestamp: new Date().toISOString(),
      }),
    );

    component.ngOnInit();

    expect(mockToolConfigService.getActiveConfig).toHaveBeenCalledWith('form-builder');
    expect(component.isFullWidth()).toBe(true);
  });

  describe('Category Analytics Integration (Story 30.7)', () => {
    it('should render PollAnalyticsComponent when category is polls', () => {
      const mockPollMetrics = {
        category: 'polls' as const,
        totalVotes: 150,
        uniqueVoters: 100,
        voteDistribution: [
          { option: 'Option A', count: 80 },
          { option: 'Option B', count: 70 },
        ],
        mostPopularOption: 'Option A',
      };

      component.categoryMetrics.set(mockPollMetrics);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const pollAnalytics = compiled.querySelector('app-poll-analytics');
      const quizAnalytics = compiled.querySelector('app-quiz-analytics');

      expect(pollAnalytics).toBeTruthy();
      expect(quizAnalytics).toBeFalsy();
    });

    it('should render QuizAnalyticsComponent when category is quiz', () => {
      const mockQuizMetrics = {
        category: 'quiz' as const,
        totalSubmissions: 50,
        averageScore: 75.5,
        medianScore: 80,
        scoreDistribution: [
          { range: '0-20', count: 5 },
          { range: '21-40', count: 10 },
          { range: '41-60', count: 15 },
          { range: '61-80', count: 10 },
          { range: '81-100', count: 10 },
        ],
        passRate: 60,
        passingGrade: 60,
      };

      component.categoryMetrics.set(mockQuizMetrics);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const pollAnalytics = compiled.querySelector('app-poll-analytics');
      const quizAnalytics = compiled.querySelector('app-quiz-analytics');

      expect(quizAnalytics).toBeTruthy();
      expect(pollAnalytics).toBeFalsy();
    });

    it('should render placeholder for other categories', () => {
      const mockEcommerceMetrics = {
        category: 'ecommerce' as const,
        totalSubmissions: 25,
      };

      component.categoryMetrics.set(mockEcommerceMetrics as any);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const pollAnalytics = compiled.querySelector('app-poll-analytics');
      const quizAnalytics = compiled.querySelector('app-quiz-analytics');
      const placeholderText = compiled.textContent;

      expect(pollAnalytics).toBeFalsy();
      expect(quizAnalytics).toBeFalsy();
      expect(placeholderText).toContain('Analytics for');
      expect(placeholderText).toContain('ecommerce');
      expect(placeholderText).toContain('coming soon');
    });

    it('should not render any analytics components when categoryMetrics is null', () => {
      component.categoryMetrics.set(null);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const pollAnalytics = compiled.querySelector('app-poll-analytics');
      const quizAnalytics = compiled.querySelector('app-quiz-analytics');

      expect(pollAnalytics).toBeFalsy();
      expect(quizAnalytics).toBeFalsy();
    });

    it('should switch between poll and quiz components when category changes', () => {
      const mockPollMetrics = {
        category: 'polls' as const,
        totalVotes: 150,
        uniqueVoters: 100,
        voteDistribution: [],
        mostPopularOption: 'Option A',
      };

      const mockQuizMetrics = {
        category: 'quiz' as const,
        totalSubmissions: 50,
        averageScore: 75.5,
        medianScore: 80,
        scoreDistribution: [],
        passRate: 60,
        passingGrade: 60,
      };

      // Start with poll metrics
      component.categoryMetrics.set(mockPollMetrics);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('app-poll-analytics')).toBeTruthy();
      expect(compiled.querySelector('app-quiz-analytics')).toBeFalsy();

      // Switch to quiz metrics
      component.categoryMetrics.set(mockQuizMetrics);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('app-poll-analytics')).toBeFalsy();
      expect(compiled.querySelector('app-quiz-analytics')).toBeTruthy();
    });
  });
});
