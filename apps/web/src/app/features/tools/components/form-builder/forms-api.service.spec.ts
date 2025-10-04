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
} from '@nodeangularfullstack/shared';

describe('FormsApiService', () => {
  let service: FormsApiService;
  let apiClientSpy: jasmine.SpyObj<ApiClientService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;

  const mockForm: FormMetadata = {
    id: 'form-123',
    userId: 'user-456',
    title: 'Test Form',
    description: 'Test Description',
    status: FormStatus.DRAFT,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
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
});
