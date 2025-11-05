import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FormsListComponent } from './forms-list.component';
import { FormsApiService } from '../forms-api.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormMetadata, FormStatus, PaginatedResponse } from '@nodeangularfullstack/shared';

describe('FormsListComponent', () => {
  let component: FormsListComponent;
  let fixture: ComponentFixture<FormsListComponent>;
  let formsApiServiceSpy: jasmine.SpyObj<FormsApiService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let confirmationServiceSpy: jasmine.SpyObj<ConfirmationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockForms: FormMetadata[] = [
    {
      id: 'form-1',
      userId: 'user-1',
      title: 'Contact Form',
      description: 'Main contact form',
      status: FormStatus.DRAFT,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    },
    {
      id: 'form-2',
      userId: 'user-1',
      title: 'Feedback Form',
      description: 'Customer feedback',
      status: FormStatus.PUBLISHED,
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-04'),
    },
  ];

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('FormsApiService', [
      'getForms',
      'deleteForm',
      'createForm',
    ]);
    const msgSpy = jasmine.createSpyObj('MessageService', ['add']);
    const confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [FormsListComponent],
      providers: [
        { provide: FormsApiService, useValue: apiSpy },
        { provide: MessageService, useValue: msgSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: Router, useValue: routerSpyObj },
      ],
    }).compileComponents();

    formsApiServiceSpy = TestBed.inject(FormsApiService) as jasmine.SpyObj<FormsApiService>;
    messageServiceSpy = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    confirmationServiceSpy = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(FormsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load forms on init', () => {
      const mockResponse: PaginatedResponse<FormMetadata> = {
        success: true,
        data: mockForms,
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: 9,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      formsApiServiceSpy.getForms.and.returnValue(of(mockResponse));

      fixture.detectChanges(); // Triggers ngOnInit

      expect(formsApiServiceSpy.getForms).toHaveBeenCalledWith(1, 9);
      expect(component.forms()).toEqual(mockForms);
      expect(component.totalItems()).toBe(2);
      expect(component.totalPages()).toBe(1);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle load error', () => {
      formsApiServiceSpy.getForms.and.returnValue(throwError(() => new Error('Load failed')));

      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.forms()).toEqual([]);
    });
  });

  describe('pagination', () => {
    it('should change page and reload forms', () => {
      const mockResponse: PaginatedResponse<FormMetadata> = {
        success: true,
        data: mockForms,
        timestamp: new Date().toISOString(),
        pagination: {
          page: 2,
          pageSize: 9,
          totalItems: 20,
          totalPages: 3,
          hasNext: true,
          hasPrevious: true,
        },
      };

      formsApiServiceSpy.getForms.and.returnValue(of(mockResponse));

      component.onPageChange({ page: 1 }); // PrimeNG is 0-indexed, so page 1 = our page 2

      expect(component.currentPage()).toBe(2);
      expect(formsApiServiceSpy.getForms).toHaveBeenCalledWith(2, 9);
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      const mockResponse: PaginatedResponse<FormMetadata> = {
        success: true,
        data: mockForms,
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: 9,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };
      formsApiServiceSpy.getForms.and.returnValue(of(mockResponse));
      fixture.detectChanges();
    });

    it('should filter forms by title', () => {
      component.searchTerm.set('Contact');
      expect(component.filteredForms().length).toBe(1);
      expect(component.filteredForms()[0].title).toBe('Contact Form');
    });

    it('should filter forms by description', () => {
      component.searchTerm.set('feedback');
      expect(component.filteredForms().length).toBe(1);
      expect(component.filteredForms()[0].description).toContain('feedback');
    });

    it('should return all forms when search term is empty', () => {
      component.searchTerm.set('');
      expect(component.filteredForms().length).toBe(2);
    });

    it('should return empty array when no matches found', () => {
      component.searchTerm.set('nonexistent');
      expect(component.filteredForms().length).toBe(0);
    });

    it('should clear search term', () => {
      component.searchTerm.set('test');
      component.clearSearch();
      expect(component.searchTerm()).toBe('');
    });

    it('should debounce search input', (done) => {
      const event = { target: { value: 'Contact' } } as any;
      component.onSearchInput(event);

      // Immediately check - should not be updated yet
      expect(component.searchTerm()).toBe('');

      // After debounce timeout
      setTimeout(() => {
        expect(component.searchTerm()).toBe('Contact');
        done();
      }, 350);
    });
  });

  describe('create form modal', () => {
    it('should open create modal with default settings', () => {
      component.openCreateFormModal();

      expect(component.showCreateModal()).toBe(true);
      expect(component.newFormSettings()).toEqual({
        title: '',
        description: '',
        columnLayout: 1,
        fieldSpacing: 'normal',
        successMessage: 'Thank you for your submission!',
        redirectUrl: '',
        allowMultipleSubmissions: true,
      });
    });

    it('should create form and navigate to builder on settings saved', (done) => {
      const mockCreatedForm: FormMetadata = {
        id: 'new-form-id',
        userId: 'user-1',
        title: 'New Form',
        description: 'New form description',
        status: FormStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      formsApiServiceSpy.createForm.and.returnValue(of(mockCreatedForm));

      const settings = {
        title: 'New Form',
        description: 'New form description',
        columnLayout: 2 as 1 | 2 | 3,
        fieldSpacing: 'normal' as 'compact' | 'normal' | 'relaxed',
        successMessage: 'Thanks!',
        redirectUrl: 'https://example.com',
        allowMultipleSubmissions: false,
      };

      component.onFormSettingsSaved(settings);

      expect(formsApiServiceSpy.createForm).toHaveBeenCalledWith({
        title: 'New Form',
        description: 'New form description',
        status: FormStatus.DRAFT,
      });

      expect(component.showCreateModal()).toBe(false);
      expect(messageServiceSpy.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Form Created',
        detail: 'Form created successfully. Redirecting to builder...',
        life: 2000,
      });

      // Wait for navigation timeout
      setTimeout(() => {
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/Dashboard', 'new-form-id']);
        done();
      }, 600);
    });

    it('should show error message on create failure', () => {
      const error = { error: { message: 'Creation failed' } };
      formsApiServiceSpy.createForm.and.returnValue(throwError(() => error));

      const settings = {
        title: 'New Form',
        description: '',
        columnLayout: 1 as 1 | 2 | 3,
        fieldSpacing: 'normal' as 'compact' | 'normal' | 'relaxed',
        successMessage: 'Thanks!',
        redirectUrl: '',
        allowMultipleSubmissions: true,
      };

      component.onFormSettingsSaved(settings);

      expect(messageServiceSpy.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Creation Failed',
        detail: 'Creation failed',
        life: 3000,
      });
    });
  });

  describe('confirmDelete', () => {
    it('should show confirmation dialog for draft forms', () => {
      const draftForm = mockForms[0]; // Draft status

      component.confirmDelete(draftForm.id);

      expect(confirmationServiceSpy.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: `Are you sure you want to delete "${draftForm.title}"? This action cannot be undone.`,
          header: 'Delete Form',
        }),
      );
    });

    it('should show warning for published forms', () => {
      const publishedForm = mockForms[1]; // Published status

      component.confirmDelete(publishedForm.id);

      expect(confirmationServiceSpy.confirm).not.toHaveBeenCalled();
      expect(messageServiceSpy.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: 'Published forms cannot be deleted',
        life: 3000,
      });
    });
  });

  describe('deleteForm', () => {
    it('should delete form and reload list', () => {
      const mockResponse: PaginatedResponse<FormMetadata> = {
        success: true,
        data: [mockForms[1]], // Only second form remains
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: 9,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      formsApiServiceSpy.deleteForm.and.returnValue(of(void 0));
      formsApiServiceSpy.getForms.and.returnValue(of(mockResponse));

      // Trigger delete via confirmation accept callback
      confirmationServiceSpy.confirm.and.callFake((options: any) => {
        options.accept();
        return confirmationServiceSpy;
      });

      component.confirmDelete(mockForms[0].id);

      expect(formsApiServiceSpy.deleteForm).toHaveBeenCalledWith('form-1');
      expect(messageServiceSpy.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Form Deleted',
        detail: 'Form has been deleted successfully',
        life: 3000,
      });
      expect(formsApiServiceSpy.getForms).toHaveBeenCalled();
    });
  });

  describe('QR Code Modal Functionality', () => {
    beforeEach(() => {
      // Setup mock forms response
      const mockResponse: PaginatedResponse<FormMetadata> = {
        success: true,
        data: mockForms,
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: 9,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };
      formsApiServiceSpy.getForms.and.returnValue(of(mockResponse));
      fixture.detectChanges();
    });

    it('should handle view-qr action and open QR code modal', () => {
      const qrCodeUrl = 'https://example.com/qr-code.png';
      const formTitle = 'Test Form';

      component.handleFormAction({
        type: 'view-qr',
        formId: 'form-1',
        qrCodeUrl,
        formTitle,
      });

      expect(component.showQrCodeModal()).toBe(true);
      expect(component.qrCodeModalData()).toEqual({
        qrCodeUrl,
        formTitle,
      });
    });

    it('should not open QR code modal for view-qr action without required data', () => {
      component.handleFormAction({
        type: 'view-qr',
        formId: 'form-1',
      });

      expect(component.showQrCodeModal()).toBe(false);
      expect(component.qrCodeModalData()).toBeNull();
    });

    it('should open QR code modal with correct data', () => {
      const qrCodeUrl = 'https://example.com/qr-code.png';
      const formTitle = 'Test Form';

      component.openQrCodeModal(qrCodeUrl, formTitle);

      expect(component.showQrCodeModal()).toBe(true);
      expect(component.qrCodeModalData()).toEqual({
        qrCodeUrl,
        formTitle,
      });
    });

    it('should generate correct QR code modal title', () => {
      const formTitle = 'Test Form';
      component.qrCodeModalData.set({
        qrCodeUrl: 'https://example.com/qr-code.png',
        formTitle,
      });

      expect(component.qrCodeModalTitle()).toBe('QR Code - Test Form');
    });

    it('should generate default QR code modal title when no data', () => {
      component.qrCodeModalData.set(null);
      expect(component.qrCodeModalTitle()).toBe('QR Code');
    });

    it('should download QR code and show success message', () => {
      const mockData = {
        qrCodeUrl: 'https://example.com/qr-code.png',
        formTitle: 'Test Form',
      };
      component.qrCodeModalData.set(mockData);

      // Mock document methods
      const mockLink = jasmine.createSpyObj('HTMLAnchorElement', ['click']);
      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');

      component.downloadQrCode();

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe(mockData.qrCodeUrl);
      expect(mockLink.download).toBe('qr-code-test-form.png');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);

      expect(messageServiceSpy.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'QR Code Downloaded',
        detail: 'QR code for "Test Form" has been downloaded',
        life: 2000,
      });
    });

    it('should not download QR code when no modal data', () => {
      component.qrCodeModalData.set(null);
      spyOn(document, 'createElement');

      component.downloadQrCode();

      expect(document.createElement).not.toHaveBeenCalled();
      expect(messageServiceSpy.add).not.toHaveBeenCalled();
    });

    it('should sanitize form title for QR code filename', () => {
      const mockData = {
        qrCodeUrl: 'https://example.com/qr-code.png',
        formTitle: 'Test Form With Special@#$%Characters',
      };
      component.qrCodeModalData.set(mockData);

      const mockLink = jasmine.createSpyObj('HTMLAnchorElement', ['click']);
      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');

      component.downloadQrCode();

      expect(mockLink.download).toBe('qr-code-test-form-with-special----characters.png');
    });
  });
});
