import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmationService } from 'primeng/api';

/**
 * Interface for components that can have unsaved changes.
 */
export interface ComponentWithUnsavedChanges {
  canDeactivate(): boolean | Observable<boolean>;
}

/**
 * Guard that prevents navigation away from a component with unsaved changes.
 * Shows a confirmation dialog if the component has unsaved changes.
 *
 * @example
 * // In route configuration:
 * {
 *   path: 'form-builder/:id',
 *   component: FormBuilderComponent,
 *   canDeactivate: [unsavedChangesGuard]
 * }
 */
export const unsavedChangesGuard: CanDeactivateFn<ComponentWithUnsavedChanges> = (
  component: ComponentWithUnsavedChanges,
) => {
  // Inject ConfirmationService at guard function level (proper injection context)
  const confirmationService = inject(ConfirmationService);

  // If component can deactivate without confirmation, allow it
  const canDeactivate = component.canDeactivate();

  if (canDeactivate === true) {
    return true;
  }

  // Show confirmation dialog
  return new Promise<boolean>((resolve) => {
    confirmationService.confirm({
      message: 'You have unsaved changes. Are you sure you want to leave?',
      header: 'Unsaved Changes',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => resolve(true),
      reject: () => resolve(false),
    });
  });
};
