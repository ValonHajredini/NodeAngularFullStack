import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { AuthService } from '../../../../../../core/auth/auth.service';
import { DrawingProject } from '@nodeangularfullstack/shared';

/**
 * Component for saving drawing projects to the server.
 * Provides form to enter project name and description.
 * Requires user authentication.
 */
@Component({
  selector: 'app-save-project',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonDirective, InputText, Textarea],
  template: `
    <div class="save-project-panel p-4">
      @if (!isAuthenticated()) {
        <!-- Login prompt for non-authenticated users -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex gap-2">
            <i class="pi pi-info-circle text-blue-600"></i>
            <p class="text-sm text-blue-800">
              Please log in to save your drawing projects to the server.
            </p>
          </div>
        </div>
      } @else {
        <!-- Header -->
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Save Project</h3>
          <p class="text-sm text-gray-600">Save your drawing to the server to access it later.</p>
        </div>

        <!-- Save form -->
        <div class="space-y-4">
          <!-- Project name input -->
          <div class="flex flex-col gap-2">
            <label for="project-name" class="text-sm font-semibold text-gray-900">
              Project Name <span class="text-red-500">*</span>
            </label>
            <input
              pInputText
              id="project-name"
              [(ngModel)]="projectName"
              [maxlength]="255"
              placeholder="Enter project name (required)"
              class="w-full"
              [disabled]="isSaving()"
            />
            @if (projectName().length > 0) {
              <span class="text-xs text-gray-500">{{ projectName().length }}/255 characters</span>
            }
          </div>

          <!-- Project description input -->
          <div class="flex flex-col gap-2">
            <label for="project-description" class="text-sm font-semibold text-gray-900">
              Description (Optional)
            </label>
            <textarea
              pTextarea
              id="project-description"
              [(ngModel)]="projectDescription"
              [rows]="3"
              placeholder="Enter project description (optional)"
              class="w-full"
              [disabled]="isSaving()"
            ></textarea>
          </div>

          <!-- Save button -->
          <div class="flex gap-2">
            <button
              pButton
              type="button"
              [label]="isSaving() ? 'Saving...' : 'Save to Server'"
              icon="pi pi-save"
              severity="success"
              (click)="onSave()"
              [disabled]="!projectName().trim() || isSaving()"
              class="flex-1"
            ></button>
            @if (projectName().trim() || projectDescription().trim()) {
              <button
                pButton
                type="button"
                label="Clear"
                icon="pi pi-times"
                severity="secondary"
                (click)="onClear()"
                [disabled]="isSaving()"
                class="flex-1"
                [outlined]="true"
              ></button>
            }
          </div>

          <!-- Info message -->
          <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div class="flex gap-2">
              <i class="pi pi-info-circle text-gray-600"></i>
              <p class="text-xs text-gray-700">
                Projects are saved to your account and can be loaded from any device.
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .save-project-panel {
        max-width: 500px;
      }

      :host ::ng-deep .p-inputtext,
      :host ::ng-deep .p-textarea {
        width: 100%;
      }
    `,
  ],
})
export class SaveProjectComponent {
  private readonly authService = inject(AuthService);

  /** Event emitted when save is requested */
  @Output() save = new EventEmitter<{ name: string; description?: string }>();

  /** Project name input */
  projectName = signal<string>('');

  /** Project description input */
  projectDescription = signal<string>('');

  /** Loading state during save */
  isSaving = signal<boolean>(false);

  /** Whether user is authenticated */
  isAuthenticated = this.authService.isAuthenticated;

  /**
   * Handles save button click.
   * Validates and emits save event with project data.
   */
  onSave(): void {
    const name = this.projectName().trim();

    if (!name) {
      return;
    }

    this.isSaving.set(true);

    const description = this.projectDescription().trim();

    // Emit save event with project data
    this.save.emit({
      name,
      description: description || undefined,
    });

    // Reset state after a short delay
    setTimeout(() => {
      this.isSaving.set(false);
      this.onClear();
    }, 1000);
  }

  /**
   * Clears the form inputs.
   */
  onClear(): void {
    this.projectName.set('');
    this.projectDescription.set('');
  }

  /**
   * Sets the saving state (called from parent component).
   * @param saving - Whether save is in progress
   */
  setSavingState(saving: boolean): void {
    this.isSaving.set(saving);
  }
}
