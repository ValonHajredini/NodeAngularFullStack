/**
 * CategoryAnalyticsService Unit Tests
 *
 * Tests service methods for fetching category-specific analytics
 * and detecting template categories from form schemas.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.6: Frontend Category Detection and Analytics Service
 *
 * @since 2025-01-27
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategoryAnalyticsService } from './category-analytics.service';
import {
  CategoryMetrics,
  PollMetrics,
  QuizMetrics,
  FormSchema,
  TemplateCategory,
} from '@nodeangularfullstack/shared';
import { environment } from '../../../environments/environment';

describe('CategoryAnalyticsService', () => {
  let service: CategoryAnalyticsService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.formsApiUrl}/api/analytics`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CategoryAnalyticsService],
    });

    service = TestBed.inject(CategoryAnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  describe('getCategoryMetrics', () => {
    it('should fetch poll metrics successfully', (done) => {
      const formId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPollMetrics: PollMetrics = {
        category: 'polls',
        totalSubmissions: 150,
        voteCounts: { 'Option A': 75, 'Option B': 45, 'Option C': 30 },
        votePercentages: { 'Option A': 50, 'Option B': 30, 'Option C': 20 },
        uniqueVoters: 148,
        duplicateVoteAttempts: 12,
        mostPopularOption: 'Option A',
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-15T12:30:00Z',
      };

      service.getCategoryMetrics(formId).subscribe({
        next: (metrics) => {
          expect(metrics).toEqual(mockPollMetrics);
          expect(metrics.category).toBe('polls');
          expect(metrics.totalSubmissions).toBe(150);
          if (metrics.category === 'polls') {
            expect(metrics.mostPopularOption).toBe('Option A');
          }
          done();
        },
        error: (err) => done.fail(`Expected success, got error: ${err.message}`),
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockPollMetrics });
    });

    it('should fetch quiz metrics successfully', (done) => {
      const formId = '456e7890-e89b-12d3-a456-426614174001';
      const mockQuizMetrics: QuizMetrics = {
        category: 'quiz',
        totalSubmissions: 200,
        averageScore: 75.5,
        medianScore: 80,
        passRate: 68.5,
        scoreDistribution: {
          '0-20': 10,
          '21-40': 15,
          '41-60': 25,
          '61-80': 80,
          '81-100': 70,
        },
        questionAccuracy: { q1: 85.5, q2: 62.0, q3: 91.5 },
        highestScore: 100,
        lowestScore: 15,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-15T12:30:00Z',
      };

      service.getCategoryMetrics(formId).subscribe({
        next: (metrics) => {
          expect(metrics).toEqual(mockQuizMetrics);
          expect(metrics.category).toBe('quiz');
          expect(metrics.totalSubmissions).toBe(200);
          if (metrics.category === 'quiz') {
            expect(metrics.averageScore).toBe(75.5);
          }
          done();
        },
        error: (err) => done.fail(`Expected success, got error: ${err.message}`),
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockQuizMetrics });
    });

    it('should handle 404 error when form not found', (done) => {
      const formId = 'nonexistent-form-id';

      service.getCategoryMetrics(formId).subscribe({
        next: () => done.fail('Expected error, got success'),
        error: (err) => {
          expect(err.message).toContain('Form not found');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      req.flush({ message: 'Form not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 403 error when user lacks permission', (done) => {
      const formId = 'restricted-form-id';

      service.getCategoryMetrics(formId).subscribe({
        next: () => done.fail('Expected error, got success'),
        error: (err) => {
          expect(err.message).toContain('Forbidden');
          expect(err.message).toContain('permission');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      req.flush({}, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 500 server error', (done) => {
      const formId = 'error-form-id';

      service.getCategoryMetrics(formId).subscribe({
        next: () => done.fail('Expected error, got success'),
        error: (err) => {
          expect(err.message).toContain('Server error');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network errors', (done) => {
      const formId = 'network-error-form-id';

      service.getCategoryMetrics(formId).subscribe({
        next: () => done.fail('Expected error, got success'),
        error: (err) => {
          expect(err.message).toContain('Network error');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('detectTemplateCategory', () => {
    it('should detect poll category from explicit settings', () => {
      const schema: FormSchema = {
        fields: [],
        settings: {
          layout: 'single-column',
          submission: { allowMultiple: true },
          templateCategory: TemplateCategory.POLLS,
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBe(TemplateCategory.POLLS);
    });

    it('should detect quiz category from embedded template', () => {
      const schema: FormSchema = {
        fields: [],
        template: {
          id: 'quiz-template-id',
          name: 'Quiz Template',
          category: TemplateCategory.QUIZ,
          templateSchema: { fields: [] },
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBe(TemplateCategory.QUIZ);
    });

    it('should detect ecommerce category from business logic config', () => {
      const schema: FormSchema = {
        fields: [],
        businessLogicConfig: {
          type: 'inventory',
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBe(TemplateCategory.ECOMMERCE);
    });

    it('should detect services category from appointment business logic', () => {
      const schema: FormSchema = {
        fields: [],
        businessLogicConfig: {
          type: 'appointment',
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBe(TemplateCategory.SERVICES);
    });

    it('should detect data_collection category from order business logic', () => {
      const schema: FormSchema = {
        fields: [],
        businessLogicConfig: {
          type: 'order',
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBe(TemplateCategory.DATA_COLLECTION);
    });

    it('should return null for generic forms without category hints', () => {
      const schema: FormSchema = {
        fields: [],
        settings: {
          layout: 'single-column',
          submission: { allowMultiple: true },
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBeNull();
    });

    it('should return null for forms with invalid category value', () => {
      const schema: FormSchema = {
        fields: [],
        settings: {
          layout: 'single-column',
          submission: { allowMultiple: true },
          templateCategory: 'invalid-category' as any,
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBeNull();
    });

    it('should prioritize explicit category over embedded template', () => {
      const schema: FormSchema = {
        fields: [],
        settings: {
          layout: 'single-column',
          submission: { allowMultiple: true },
          templateCategory: TemplateCategory.POLLS,
        },
        template: {
          id: 'quiz-template-id',
          name: 'Quiz Template',
          category: TemplateCategory.QUIZ,
          templateSchema: { fields: [] },
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      };

      const category = service.detectTemplateCategory(schema);
      expect(category).toBe(TemplateCategory.POLLS); // Settings take precedence
    });
  });

  describe('error handling', () => {
    it('should format 400 bad request error', (done) => {
      const formId = 'bad-request-id';

      service.getCategoryMetrics(formId).subscribe({
        next: () => done.fail('Expected error, got success'),
        error: (err) => {
          expect(err.message).toContain('Invalid request data');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      req.flush({ message: 'Invalid form ID format' }, { status: 400, statusText: 'Bad Request' });
    });

    it('should format 401 unauthorized error', (done) => {
      const formId = 'unauthorized-id';

      service.getCategoryMetrics(formId).subscribe({
        next: () => done.fail('Expected error, got success'),
        error: (err) => {
          expect(err.message).toContain('Unauthorized');
          expect(err.message).toContain('log in');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });

    it('should use backend error message when available', (done) => {
      const formId = 'custom-error-id';
      const customErrorMessage = 'Custom backend error message';

      service.getCategoryMetrics(formId).subscribe({
        next: () => done.fail('Expected error, got success'),
        error: (err) => {
          expect(err.message).toContain(customErrorMessage);
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${formId}/category-metrics`);
      req.flush({ message: customErrorMessage }, { status: 400, statusText: 'Bad Request' });
    });
  });
});
