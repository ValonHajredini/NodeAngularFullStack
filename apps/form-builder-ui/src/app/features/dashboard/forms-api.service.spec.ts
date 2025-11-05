import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FormsApiService } from './forms-api.service';
import { ApiClientService } from '@core/api/api-client.service';
import { MessageService } from 'primeng/api';
import {
  FormMetadata,
  FormStatus,
  ApiResponse,
  PaginatedResponse,
  PublishFormResponse,
  FormSchema,
} from '@nodeangularfullstack/shared';

describe('FormsApiService', () => {
  let service: FormsApiService;
  let apiClientSpy: jasmine.SpyObj<ApiClientService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;

  const mockForm: FormMetadata = {
    id: 'form-123',
    userId: 'user-456',
    tenantId: undefined,
    title: 'Test Form',
    description: 'Test Description',
    status: FormStatus.DRAFT,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    qrCodeUrl: undefined,
  };

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiClientService', ['get', 'post', 'put', 'delete']);
    const messageSpy = jasmine.createSpyObj('MessageService', ['add']);

    TestBed.configureTestingModule({
      providers: [
        FormsApiService,
        { provide: ApiClientService, useValue: apiSpy },
        { provide: MessageService, useValue: messageSpy },
      ],
    });

    service = TestBed.inject(FormsApiService);
    apiClientSpy = TestBed.inject(ApiClientService) as jasmine.SpyObj<ApiClientService>;
    messageServiceSpy = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createForm', () => {
    it('should create a new form and return it', (done) => {
      const newForm: Partial<FormMetadata> = {
        title: 'New Form',
        description: 'New Description',
      };

      const response: ApiResponse<FormMetadata> = {
        success: true,
        data: mockForm,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(response));

      service.createForm(newForm).subscribe((result) => {
        expect(result).toEqual(mockForm);
        expect(apiClientSpy.post).toHaveBeenCalledWith('/forms', newForm);
        done();
      });
    });

    it('should show error toast on create failure', (done) => {
      const error = { error: { message: 'Create failed' } };
      apiClientSpy.post.and.returnValue(throwError(() => error));

      service.createForm({ title: 'Test' }).subscribe({
        error: () => {
          expect(messageServiceSpy.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: 'Create Failed',
            detail: 'Create failed',
          });
          done();
        },
      });
    });
  });

  describe('updateForm', () => {
    it('should update an existing form', (done) => {
      const updates: Partial<FormMetadata> = {
        title: 'Updated Title',
      };

      const response: ApiResponse<FormMetadata> = {
        success: true,
        data: { ...mockForm, title: 'Updated Title' },
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.put.and.returnValue(of(response));

      service.updateForm('form-123', updates).subscribe((result) => {
        expect(result.title).toBe('Updated Title');
        expect(apiClientSpy.put).toHaveBeenCalledWith('/forms/form-123', updates);
        done();
      });
    });

    it('should show error toast on update failure', (done) => {
      const error = { error: { message: 'Update failed' } };
      apiClientSpy.put.and.returnValue(throwError(() => error));

      service.updateForm('form-123', {}).subscribe({
        error: () => {
          expect(messageServiceSpy.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: 'Update Failed',
            detail: 'Update failed',
          });
          done();
        },
      });
    });
  });

  describe('getForms', () => {
    it('should retrieve paginated forms', (done) => {
      const response: PaginatedResponse<FormMetadata> = {
        success: true,
        data: [mockForm],
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      apiClientSpy.get.and.returnValue(of(response));

      service.getForms(1, 20).subscribe((result) => {
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0]).toEqual(mockForm);
        expect(apiClientSpy.get).toHaveBeenCalledWith('/forms', {
          params: { page: '1', limit: '20' },
        });
        done();
      });
    });

    it('should use default pagination params', (done) => {
      const response: PaginatedResponse<FormMetadata> = {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };

      apiClientSpy.get.and.returnValue(of(response));

      service.getForms().subscribe(() => {
        expect(apiClientSpy.get).toHaveBeenCalledWith('/forms', {
          params: { page: '1', limit: '20' },
        });
        done();
      });
    });

    it('should show error toast on load failure', (done) => {
      const error = { error: { message: 'Load failed' } };
      apiClientSpy.get.and.returnValue(throwError(() => error));

      service.getForms().subscribe({
        error: () => {
          expect(messageServiceSpy.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: 'Load Failed',
            detail: 'Load failed',
          });
          done();
        },
      });
    });
  });

  describe('getFormById', () => {
    it('should retrieve a single form by ID', (done) => {
      const response: ApiResponse<FormMetadata> = {
        success: true,
        data: mockForm,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.get.and.returnValue(of(response));

      service.getFormById('form-123').subscribe((result) => {
        expect(result).toEqual(mockForm);
        expect(apiClientSpy.get).toHaveBeenCalledWith('/forms/form-123');
        done();
      });
    });

    it('should show error toast on load failure', (done) => {
      const error = { error: { message: 'Form not found' } };
      apiClientSpy.get.and.returnValue(throwError(() => error));

      service.getFormById('form-123').subscribe({
        error: () => {
          expect(messageServiceSpy.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: 'Load Failed',
            detail: 'Form not found',
          });
          done();
        },
      });
    });
  });

  describe('deleteForm', () => {
    it('should delete a form by ID', (done) => {
      apiClientSpy.delete.and.returnValue(of(void 0));

      service.deleteForm('form-123').subscribe(() => {
        expect(apiClientSpy.delete).toHaveBeenCalledWith('/forms/form-123');
        done();
      });
    });

    it('should show error toast on delete failure', (done) => {
      const error = { error: { message: 'Delete failed' } };
      apiClientSpy.delete.and.returnValue(throwError(() => error));

      service.deleteForm('form-123').subscribe({
        error: () => {
          expect(messageServiceSpy.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: 'Delete Failed',
            detail: 'Delete failed',
          });
          done();
        },
      });
    });
  });

  describe('date conversion', () => {
    it('should convert string dates to Date objects', (done) => {
      const formWithStringDates = {
        ...mockForm,
        createdAt: '2025-01-01T00:00:00.000Z' as any,
        updatedAt: '2025-01-02T00:00:00.000Z' as any,
      };

      const response: ApiResponse<FormMetadata> = {
        success: true,
        data: formWithStringDates,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.get.and.returnValue(of(response));

      service.getFormById('form-123').subscribe((result) => {
        expect(result.createdAt instanceof Date).toBe(true);
        expect(result.updatedAt instanceof Date).toBe(true);
        done();
      });
    });
  });

  // QR Code Integration Tests (Story 26.3)
  describe('publishForm with QR code', () => {
    const mockFormId = 'test-form-123';
    const mockRenderUrl = 'https://example.com/public/form/abc123';
    const mockQrCodeUrl = 'https://cdn.example.com/form-qr-codes/form-qr-test-123.png';

    const mockFormSchema: FormSchema = {
      id: 'schema-456',
      formId: mockFormId,
      version: 1,
      fields: [],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you!',
          allowMultipleSubmissions: false,
        },
      },
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date('2025-12-31'),
    };

    it('should publish form and return QR code information', (done) => {
      const expirationDate = new Date('2025-12-31');
      const mockPublishResponse: PublishFormResponse = {
        form: { ...mockForm, qrCodeUrl: mockQrCodeUrl },
        formSchema: mockFormSchema,
        renderUrl: mockRenderUrl,
        qrCodeUrl: mockQrCodeUrl,
        qrCodeGenerated: true,
        shortUrl: mockRenderUrl,
        shortCode: 'abc123',
      };

      const mockApiResponse: ApiResponse<PublishFormResponse> = {
        success: true,
        data: mockPublishResponse,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(mockApiResponse));

      service.publishForm(mockFormId, expirationDate).subscribe((result) => {
        expect(result.qrCodeUrl).toBe(mockQrCodeUrl);
        expect(result.qrCodeGenerated).toBe(true);
        expect(result.renderUrl).toBe(mockRenderUrl);
        expect(result.form.qrCodeUrl).toBe(mockQrCodeUrl);

        // Verify API call was made with correct parameters
        expect(apiClientSpy.post).toHaveBeenCalledWith(`/forms/${mockFormId}/publish`, {
          expiresInDays: jasmine.any(Number),
        });

        done();
      });
    });

    it('should handle publish response when QR generation fails', (done) => {
      const expirationDate = new Date('2025-12-31');
      const mockPublishResponse: PublishFormResponse = {
        form: { ...mockForm, qrCodeUrl: undefined },
        formSchema: mockFormSchema,
        renderUrl: mockRenderUrl,
        qrCodeUrl: undefined,
        qrCodeGenerated: false,
        shortUrl: mockRenderUrl,
        shortCode: 'abc123',
      };

      const mockApiResponse: ApiResponse<PublishFormResponse> = {
        success: true,
        data: mockPublishResponse,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(mockApiResponse));

      service.publishForm(mockFormId, expirationDate).subscribe((result) => {
        expect(result.qrCodeUrl).toBeUndefined();
        expect(result.qrCodeGenerated).toBe(false);
        expect(result.renderUrl).toBe(mockRenderUrl);
        expect(result.form.qrCodeUrl).toBeNull();
        done();
      });
    });

    it('should publish form without expiration and handle QR code response', (done) => {
      const mockPublishResponse: PublishFormResponse = {
        form: { ...mockForm, qrCodeUrl: mockQrCodeUrl },
        formSchema: mockFormSchema,
        renderUrl: mockRenderUrl,
        qrCodeUrl: mockQrCodeUrl,
        qrCodeGenerated: true,
        shortUrl: mockRenderUrl,
        shortCode: 'abc123',
      };

      const mockApiResponse: ApiResponse<PublishFormResponse> = {
        success: true,
        data: mockPublishResponse,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(mockApiResponse));

      service.publishForm(mockFormId, null).subscribe((result) => {
        expect(result.qrCodeUrl).toBe(mockQrCodeUrl);
        expect(result.qrCodeGenerated).toBe(true);

        // Verify API call was made without expiration
        expect(apiClientSpy.post).toHaveBeenCalledWith(`/forms/${mockFormId}/publish`, {});

        done();
      });
    });

    it('should handle missing QR code data in response gracefully', (done) => {
      const mockPublishResponse = {
        form: { ...mockForm },
        formSchema: mockFormSchema,
        renderUrl: mockRenderUrl,
        // Missing qrCodeUrl and qrCodeGenerated properties
      } as PublishFormResponse;

      const mockApiResponse: ApiResponse<PublishFormResponse> = {
        success: true,
        data: mockPublishResponse,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(mockApiResponse));

      service.publishForm(mockFormId, null).subscribe((result) => {
        expect(result.qrCodeUrl).toBeUndefined();
        expect(result.qrCodeGenerated).toBeUndefined();
        expect(result.renderUrl).toBe(mockRenderUrl);
        done();
      });
    });

    it('should convert date strings to Date objects in publish response', (done) => {
      const mockPublishResponse = {
        form: {
          ...mockForm,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          qrCodeUrl: mockQrCodeUrl,
        },
        formSchema: {
          ...mockFormSchema,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          expiresAt: '2025-12-31T23:59:59.000Z',
        },
        renderUrl: mockRenderUrl,
        qrCodeUrl: mockQrCodeUrl,
        qrCodeGenerated: true,
      };

      const mockApiResponse: ApiResponse<PublishFormResponse> = {
        success: true,
        data: mockPublishResponse as any,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(mockApiResponse));

      service.publishForm(mockFormId, null).subscribe((result) => {
        expect(result.form.createdAt).toBeInstanceOf(Date);
        expect(result.form.updatedAt).toBeInstanceOf(Date);
        expect(result.formSchema.createdAt).toBeInstanceOf(Date);
        expect(result.formSchema.updatedAt).toBeInstanceOf(Date);
        expect(result.formSchema.expiresAt).toBeInstanceOf(Date);

        // QR code data should be preserved
        expect(result.qrCodeUrl).toBe(mockQrCodeUrl);
        expect(result.qrCodeGenerated).toBe(true);

        done();
      });
    });
  });

  describe('unpublishForm with QR cleanup', () => {
    it('should unpublish form and clear QR code URL', (done) => {
      const unpublishedForm = { ...mockForm, qrCodeUrl: undefined, status: FormStatus.DRAFT };
      const mockApiResponse: ApiResponse<FormMetadata> = {
        success: true,
        data: unpublishedForm,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.post.and.returnValue(of(mockApiResponse));

      service.unpublishForm('form-123').subscribe((result) => {
        expect(result.qrCodeUrl).toBeNull();
        expect(result.status).toBe(FormStatus.DRAFT);
        expect(apiClientSpy.post).toHaveBeenCalledWith('/forms/form-123/unpublish', {});
        done();
      });
    });
  });

  describe('form retrieval with QR code URL', () => {
    it('should include QR code URL in form details', (done) => {
      const formWithQR = { ...mockForm, qrCodeUrl: 'https://cdn.example.com/qr-codes/test.png' };
      const mockApiResponse: ApiResponse<FormMetadata> = {
        success: true,
        data: formWithQR,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.getFormById('form-123').subscribe((result) => {
        expect(result.qrCodeUrl).toBe('https://cdn.example.com/qr-codes/test.png');
        expect(apiClientSpy.get).toHaveBeenCalledWith('/forms/form-123');
        done();
      });
    });

    it('should handle forms without QR code URL', (done) => {
      const formWithoutQR = { ...mockForm, qrCodeUrl: undefined };
      const mockApiResponse: ApiResponse<FormMetadata> = {
        success: true,
        data: formWithoutQR,
        timestamp: new Date().toISOString(),
      };

      apiClientSpy.get.and.returnValue(of(mockApiResponse));

      service.getFormById('form-123').subscribe((result) => {
        expect(result.qrCodeUrl).toBeNull();
        done();
      });
    });
  });
});
