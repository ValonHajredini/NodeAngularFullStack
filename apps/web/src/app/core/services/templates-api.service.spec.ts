import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TemplatesApiService } from './templates-api.service';
import {
  FormTemplate,
  TemplateCategory,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
} from '@nodeangularfullstack/shared';
import { environment } from '../../../environments/environment';

describe('TemplatesApiService', () => {
  let service: TemplatesApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.formsApiUrl}/api/templates`;

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Test Template',
    description: 'A test template',
    category: TemplateCategory.ECOMMERCE,
    previewImageUrl: 'https://example.com/preview.jpg',
    templateSchema: { fields: [], settings: {} } as any,
    businessLogicConfig: { type: 'inventory' } as any,
    isActive: true,
    usageCount: 10,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockTemplates: FormTemplate[] = [mockTemplate];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TemplatesApiService],
    });

    service = TestBed.inject(TemplatesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllTemplates', () => {
    it('should fetch all templates', (done) => {
      service.getAllTemplates().subscribe((templates) => {
        expect(templates).toEqual(mockTemplates);
        expect(templates.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockTemplates });
    });

    it('should cache results and reuse on subsequent calls', (done) => {
      // First call
      service.getAllTemplates().subscribe();

      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, data: mockTemplates });

      // Second call should use cache (no new HTTP request)
      service.getAllTemplates().subscribe((templates) => {
        expect(templates).toEqual(mockTemplates);
        done();
      });

      httpMock.expectNone(baseUrl); // No new request should be made
    });

    it('should handle network errors', (done) => {
      service.getAllTemplates().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Network error');
          done();
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.error(new ProgressEvent('Network error'), { status: 0, statusText: 'Unknown Error' });
    });

    it('should handle 500 server error', (done) => {
      service.getAllTemplates().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Server error. Please try again later.');
          done();
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });
    });

    it('should handle 401 unauthorized error', (done) => {
      service.getAllTemplates().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Unauthorized. Please log in.');
          done();
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('getTemplateById', () => {
    it('should fetch a template by ID', (done) => {
      const templateId = 'template-123';

      service.getTemplateById(templateId).subscribe((template) => {
        expect(template).toEqual(mockTemplate);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/${templateId}`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockTemplate });
    });

    it('should handle 404 not found', (done) => {
      const templateId = 'non-existent';

      service.getTemplateById(templateId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Template not found');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${templateId}`);
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', (done) => {
      const newTemplate: CreateFormTemplateRequest = {
        name: 'New Template',
        category: TemplateCategory.SERVICES,
        templateSchema: { fields: [], settings: {} } as any,
        description: 'A new template',
      };

      service.createTemplate(newTemplate).subscribe((template) => {
        expect(template).toEqual(mockTemplate);
        done();
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newTemplate);
      req.flush({ success: true, data: mockTemplate });
    });

    it('should clear cache after creation', (done) => {
      const newTemplate: CreateFormTemplateRequest = {
        name: 'New Template',
        category: TemplateCategory.SERVICES,
        templateSchema: { fields: [], settings: {} } as any,
      };

      // First populate cache
      service.getAllTemplates().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, data: mockTemplates });

      // Create template
      service.createTemplate(newTemplate).subscribe(() => {
        // After creation, next getAllTemplates should make new request
        service.getAllTemplates().subscribe();
        const req3 = httpMock.expectOne(baseUrl);
        expect(req3.request.method).toBe('GET');
        done();
      });

      const req2 = httpMock.expectOne(baseUrl);
      expect(req2.request.method).toBe('POST');
      req2.flush({ success: true, data: mockTemplate });
    });

    it('should handle validation errors', (done) => {
      const invalidTemplate: CreateFormTemplateRequest = {
        name: '', // Invalid: empty name
        category: TemplateCategory.ECOMMERCE,
        templateSchema: { fields: [], settings: {} } as any,
      };

      service.createTemplate(invalidTemplate).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid request data');
          done();
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush({ message: 'Validation failed' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', (done) => {
      const templateId = 'template-123';
      const updates: UpdateFormTemplateRequest = {
        name: 'Updated Name',
        isActive: false,
      };

      service.updateTemplate(templateId, updates).subscribe((template) => {
        expect(template).toEqual(mockTemplate);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/${templateId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updates);
      req.flush({ success: true, data: mockTemplate });
    });

    it('should clear cache after update', (done) => {
      const templateId = 'template-123';
      const updates: UpdateFormTemplateRequest = { isActive: false };

      // First populate cache
      service.getAllTemplates().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, data: mockTemplates });

      // Update template
      service.updateTemplate(templateId, updates).subscribe(() => {
        // After update, next getAllTemplates should make new request
        service.getAllTemplates().subscribe();
        const req3 = httpMock.expectOne(baseUrl);
        expect(req3.request.method).toBe('GET');
        done();
      });

      const req2 = httpMock.expectOne(`${baseUrl}/${templateId}`);
      expect(req2.request.method).toBe('PATCH');
      req2.flush({ success: true, data: mockTemplate });
    });

    it('should handle 404 for non-existent template', (done) => {
      const templateId = 'non-existent';
      const updates: UpdateFormTemplateRequest = { name: 'New Name' };

      service.updateTemplate(templateId, updates).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Template not found');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${templateId}`);
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', (done) => {
      const templateId = 'template-123';

      service.deleteTemplate(templateId).subscribe(() => {
        expect().nothing(); // Success - no return value
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/${templateId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true, data: null });
    });

    it('should clear cache after deletion', (done) => {
      const templateId = 'template-123';

      // First populate cache
      service.getAllTemplates().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, data: mockTemplates });

      // Delete template
      service.deleteTemplate(templateId).subscribe(() => {
        // After deletion, next getAllTemplates should make new request
        service.getAllTemplates().subscribe();
        const req3 = httpMock.expectOne(baseUrl);
        expect(req3.request.method).toBe('GET');
        done();
      });

      const req2 = httpMock.expectOne(`${baseUrl}/${templateId}`);
      expect(req2.request.method).toBe('DELETE');
      req2.flush({ success: true, data: null });
    });

    it('should handle 404 for non-existent template', (done) => {
      const templateId = 'non-existent';

      service.deleteTemplate(templateId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Template not found');
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${templateId}`);
      req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('refreshCache', () => {
    it('should clear cache when called', (done) => {
      // First populate cache
      service.getAllTemplates().subscribe();
      const req1 = httpMock.expectOne(baseUrl);
      req1.flush({ success: true, data: mockTemplates });

      // Clear cache
      service.refreshCache();

      // Next call should make new HTTP request
      service.getAllTemplates().subscribe((templates) => {
        expect(templates).toEqual(mockTemplates);
        done();
      });

      const req2 = httpMock.expectOne(baseUrl);
      expect(req2.request.method).toBe('GET');
      req2.flush({ success: true, data: mockTemplates });
    });
  });
});
