import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TemplatesApiService } from './templates-api.service';
import { ApiClientService } from '@core/api/api-client.service';
import {
  FormTemplate,
  FormSchema,
  TemplateCategory,
  ApiResponse,
} from '@nodeangularfullstack/shared';

describe('TemplatesApiService', () => {
  let service: TemplatesApiService;
  let apiClientSpy: jasmine.SpyObj<ApiClientService>;

  const mockTemplateSchema: FormSchema = {
    id: 'schema-123',
    formId: 'form-456',
    version: 1,
    fields: [
      {
        id: 'field-1',
        type: 'text' as any,
        fieldName: 'name',
        label: 'Name',
        placeholder: 'Enter your name',
        required: true,
        order: 0,
        validation: {},
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
    isPublished: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Product Order Form',
    description: 'E-commerce product order template',
    category: TemplateCategory.ECOMMERCE,
    previewImageUrl: 'https://example.com/preview.png',
    templateSchema: mockTemplateSchema,
    isActive: true,
    usageCount: 42,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiClientService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        TemplatesApiService,
        { provide: ApiClientService, useValue: apiSpy },
      ],
    });

    service = TestBed.inject(TemplatesApiService);
    apiClientSpy = TestBed.inject(ApiClientService) as jasmine.SpyObj<ApiClientService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTemplates', () => {
    it('should fetch all templates without category filter', (done) => {
      const response: ApiResponse<FormTemplate[]> = {
        success: true,
        data: [mockTemplate],
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.get.and.returnValue(of(response));

      service.getTemplates().subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data).toEqual([mockTemplate]);
        expect(apiClientSpy.get).toHaveBeenCalledWith('/templates', { params: {} });
        done();
      });
    });

    it('should fetch templates with category filter', (done) => {
      const response: ApiResponse<FormTemplate[]> = {
        success: true,
        data: [mockTemplate],
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.get.and.returnValue(of(response));

      service.getTemplates('ecommerce').subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data).toEqual([mockTemplate]);
        expect(apiClientSpy.get).toHaveBeenCalledWith('/templates', {
          params: { category: 'ecommerce' },
        });
        done();
      });
    });

    it('should handle error when fetching templates fails', (done) => {
      const error = { error: { message: 'Fetch failed' } };
      apiClientSpy.get.and.returnValue(throwError(() => error));

      service.getTemplates().subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err).toEqual(error);
          done();
        },
      });
    });
  });

  describe('getTemplateById', () => {
    it('should fetch single template by ID', (done) => {
      const response: ApiResponse<FormTemplate> = {
        success: true,
        data: mockTemplate,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.get.and.returnValue(of(response));

      service.getTemplateById('template-123').subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data).toEqual(mockTemplate);
        expect(apiClientSpy.get).toHaveBeenCalledWith('/templates/template-123');
        done();
      });
    });

    it('should handle error when template not found (404)', (done) => {
      const error = { error: { message: 'Template not found' }, status: 404 };
      apiClientSpy.get.and.returnValue(throwError(() => error));

      service.getTemplateById('invalid-id').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        },
      });
    });
  });

  describe('applyTemplate', () => {
    it('should apply template and return form schema', (done) => {
      const response: ApiResponse<FormSchema> = {
        success: true,
        data: mockTemplateSchema,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(response));

      service.applyTemplate('template-123').subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(result.data).toEqual(mockTemplateSchema);
        expect(apiClientSpy.post).toHaveBeenCalledWith('/templates/template-123/apply', {});
        done();
      });
    });

    it('should handle error when template application fails', (done) => {
      const error = { error: { message: 'Application failed' }, status: 500 };
      apiClientSpy.post.and.returnValue(throwError(() => error));

      service.applyTemplate('template-123').subscribe({
        next: () => fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(500);
          done();
        },
      });
    });
  });
});
