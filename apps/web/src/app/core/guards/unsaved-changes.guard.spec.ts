import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { unsavedChangesGuard, ComponentWithUnsavedChanges } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let confirmationServiceSpy: jasmine.SpyObj<ConfirmationService>;
  let mockComponent: ComponentWithUnsavedChanges;

  beforeEach(() => {
    const confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: Router, useValue: {} },
      ],
    });

    confirmationServiceSpy = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;
  });

  it('should allow navigation when component can deactivate', () => {
    mockComponent = {
      canDeactivate: () => true,
    };

    TestBed.runInInjectionContext(() => {
      const result = unsavedChangesGuard(mockComponent, {} as any, {} as any, {} as any);
      expect(result).toBe(true);
    });
  });

  it('should show confirmation dialog when component has unsaved changes', (done) => {
    mockComponent = {
      canDeactivate: () => false,
    };

    confirmationServiceSpy.confirm.and.callFake((options: any) => {
      expect(options.message).toContain('unsaved changes');
      expect(options.header).toBe('Unsaved Changes');
      options.accept(); // Simulate user clicking "Yes"
      return confirmationServiceSpy;
    });

    TestBed.runInInjectionContext(() => {
      const result = unsavedChangesGuard(mockComponent, {} as any, {} as any, {} as any);

      if (result instanceof Promise) {
        result.then((allowed) => {
          expect(allowed).toBe(true);
          done();
        });
      }
    });
  });

  it('should prevent navigation when user rejects confirmation', (done) => {
    mockComponent = {
      canDeactivate: () => false,
    };

    confirmationServiceSpy.confirm.and.callFake((options: any) => {
      options.reject(); // Simulate user clicking "No"
      return confirmationServiceSpy;
    });

    TestBed.runInInjectionContext(() => {
      const result = unsavedChangesGuard(mockComponent, {} as any, {} as any, {} as any);

      if (result instanceof Promise) {
        result.then((allowed) => {
          expect(allowed).toBe(false);
          done();
        });
      }
    });
  });
});
