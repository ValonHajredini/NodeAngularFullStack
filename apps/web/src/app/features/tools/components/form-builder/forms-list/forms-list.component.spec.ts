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
    const apiSpy = jasmine.createSpyObj('FormsApiService', ['getForms', 'deleteForm']);
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

  describe('createNewForm', () => {
    it('should navigate to form builder', () => {
      component.createNewForm();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tools/form-builder']);
    });
  });

  describe('editForm', () => {
    it('should navigate to form builder with ID', () => {
      component.editForm('form-123');

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tools/form-builder', 'form-123']);
    });
  });

  describe('confirmDelete', () => {
    it('should show confirmation dialog for draft forms', () => {
      const draftForm = mockForms[0]; // Draft status

      component.confirmDelete(draftForm);

      expect(confirmationServiceSpy.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: `Are you sure you want to delete "${draftForm.title}"? This action cannot be undone.`,
          header: 'Delete Form',
        }),
      );
    });

    it('should show warning for published forms', () => {
      const publishedForm = mockForms[1]; // Published status

      component.confirmDelete(publishedForm);

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

      component.confirmDelete(mockForms[0]);

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
});
