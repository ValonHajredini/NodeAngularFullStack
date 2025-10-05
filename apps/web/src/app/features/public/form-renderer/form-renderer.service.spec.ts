import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormRendererService, FormRenderError, FormRenderErrorType } from './form-renderer.service';
import { FormFieldType, FormSchema, FormSettings } from '@nodeangularfullstack/shared';

describe('FormRendererService', () => {
  let service: FormRendererService;
  let httpMock: HttpTestingController;

  const mockSchema: FormSchema = {
    id: 'schema-1',
    formId: 'form-1',
    version: 1,
    isPublished: true,
    fields: [
      {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: true,
        order: 1,
      },
    ],
    settings: {
      layout: {
        columns: 2,
        spacing: 'medium',
      },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Thank you!',
        allowMultipleSubmissions: false,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSettings: FormSettings = {
    layout: {
      columns: 2,
      spacing: 'medium',
    },
    submission: {
      showSuccessMessage: true,
      successMessage: 'Thank you!',
      allowMultipleSubmissions: false,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FormRendererService],
    });

    service = TestBed.inject(FormRendererService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getFormSchema', () => {
    it('should retrieve form schema with valid token', (done) => {
      const token = 'valid-token-123';
      const mockResponse = {
        success: true,
        message: 'Form schema retrieved successfully',
        data: {
          schema: mockSchema,
          settings: mockSettings,
        },
        timestamp: new Date().toISOString(),
      };

      service.getFormSchema(token).subscribe({
        next: (result) => {
          expect(result.schema).toEqual(mockSchema);
          expect(result.settings).toEqual(mockSettings);
          done();
        },
        error: () => fail('Should not error'),
      });

      const req = httpMock.expectOne(`/api/v1/public/forms/render/${token}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle 404 not found error', (done) => {
      const token = 'invalid-token';

      service.getFormSchema(token).subscribe({
        next: () => fail('Should not succeed'),
        error: (error: FormRenderError) => {
          expect(error.type).toBe(FormRenderErrorType.NOT_FOUND);
          expect(error.message).toBe('Form not found');
          expect(error.statusCode).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(`/api/v1/public/forms/render/${token}`);
      req.flush(
        {
          success: false,
          message: 'Form not found',
          code: 'FORM_NOT_FOUND',
        },
        { status: 404, statusText: 'Not Found' },
      );
    });

    it('should handle 410 expired token error', (done) => {
      const token = 'expired-token';

      service.getFormSchema(token).subscribe({
        next: () => fail('Should not succeed'),
        error: (error: FormRenderError) => {
          expect(error.type).toBe(FormRenderErrorType.EXPIRED);
          expect(error.message).toBe('This form has expired');
          expect(error.statusCode).toBe(410);
          done();
        },
      });

      const req = httpMock.expectOne(`/api/v1/public/forms/render/${token}`);
      req.flush(
        {
          success: false,
          message: 'This form has expired',
          code: 'TOKEN_EXPIRED',
        },
        { status: 410, statusText: 'Gone' },
      );
    });

    it('should handle 429 rate limit error', (done) => {
      const token = 'some-token';

      service.getFormSchema(token).subscribe({
        next: () => fail('Should not succeed'),
        error: (error: FormRenderError) => {
          expect(error.type).toBe(FormRenderErrorType.RATE_LIMITED);
          expect(error.message).toBe('Too many requests. Please try again later.');
          expect(error.statusCode).toBe(429);
          done();
        },
      });

      const req = httpMock.expectOne(`/api/v1/public/forms/render/${token}`);
      req.flush(
        {
          success: false,
          message: 'Too many requests',
          code: 'RATE_LIMITED',
        },
        { status: 429, statusText: 'Too Many Requests' },
      );
    });

    it('should handle invalid token error', (done) => {
      const token = 'malformed-token';

      service.getFormSchema(token).subscribe({
        next: () => fail('Should not succeed'),
        error: (error: FormRenderError) => {
          expect(error.type).toBe(FormRenderErrorType.INVALID_TOKEN);
          expect(error.message).toBe('Invalid form link');
          done();
        },
      });

      const req = httpMock.expectOne(`/api/v1/public/forms/render/${token}`);
      req.flush(
        {
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        },
        { status: 400, statusText: 'Bad Request' },
      );
    });

    it('should handle network errors', (done) => {
      const token = 'some-token';

      service.getFormSchema(token).subscribe({
        next: () => fail('Should not succeed'),
        error: (error: FormRenderError) => {
          expect(error.type).toBe(FormRenderErrorType.NETWORK_ERROR);
          expect(error.message).toContain('Network error occurred');
          done();
        },
      });

      const req = httpMock.expectOne(`/api/v1/public/forms/render/${token}`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle unexpected server errors', (done) => {
      const token = 'some-token';

      service.getFormSchema(token).subscribe({
        next: () => fail('Should not succeed'),
        error: (error: FormRenderError) => {
          expect(error.type).toBe(FormRenderErrorType.NETWORK_ERROR);
          expect(error.message).toBe('An unexpected error occurred. Please try again later.');
          expect(error.statusCode).toBe(500);
          done();
        },
      });

      const req = httpMock.expectOne(`/api/v1/public/forms/render/${token}`);
      req.flush(
        {
          success: false,
          message: 'Internal server error',
        },
        { status: 500, statusText: 'Internal Server Error' },
      );
    });
  });

  describe('FormRenderError', () => {
    it('should create error with correct properties', () => {
      const error = new FormRenderError(FormRenderErrorType.NOT_FOUND, 'Test error message', 404);

      expect(error.type).toBe(FormRenderErrorType.NOT_FOUND);
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('FormRenderError');
    });

    it('should be an instance of Error', () => {
      const error = new FormRenderError(FormRenderErrorType.EXPIRED, 'Expired', 410);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof FormRenderError).toBe(true);
    });
  });
});
