import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ToolsService } from '../../services/tools.service';
import { CreateToolRequest, ToolCategory } from '@nodeangularfullstack/shared';

/**
 * Interface defining the complete tool form data structure
 * across all wizard steps.
 */
export interface ToolFormData {
  // Step 1: Basic Info
  name: string;
  description: string;
  toolKey: string;

  // Step 2: Configuration
  slug: string; // auto-generated, editable
  icon: string;
  category: ToolCategory;
  codePath: string;
}

/**
 * Tool registration wizard component providing a guided, three-step process
 * for creating new tools with validation and live preview.
 *
 * Features:
 * - Step 1: Basic information (name, description, tool key)
 * - Step 2: Configuration (slug, icon, category)
 * - Step 3: Preview and confirmation
 * - Real-time validation and form persistence across steps
 */
@Component({
  selector: 'app-create-tool-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    ToastModule,
    MessageModule,
  ],
  providers: [MessageService],
  template: `
    <div class="create-tool-wizard">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center space-x-4">
            <p-button
              icon="pi pi-arrow-left"
              [text]="true"
              [rounded]="true"
              pTooltip="Back to Tools Management"
              (onClick)="navigateBack()"
            />
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Create New Tool</h2>
              <p class="mt-1 text-sm text-gray-600">
                Follow the guided wizard to register a new tool in the system.
              </p>
            </div>
          </div>
        </div>

        <!-- Wizard Steps Indicator -->
        <div class="mb-8">
          <div class="flex items-center justify-center space-x-4">
            <div class="flex items-center" [class.text-blue-600]="activeStep() >= 0">
              <div
                class="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                [class.bg-blue-600]="activeStep() >= 0"
                [class.border-blue-600]="activeStep() >= 0"
                [class.text-white]="activeStep() >= 0"
                [class.border-gray-300]="activeStep() < 0"
                [class.text-gray-400]="activeStep() < 0"
              >
                1
              </div>
              <span class="ml-2 font-medium">Basic Info</span>
            </div>
            <div class="w-8 h-0.5 bg-gray-200" [class.bg-blue-600]="activeStep() >= 1"></div>
            <div class="flex items-center" [class.text-blue-600]="activeStep() >= 1">
              <div
                class="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                [class.bg-blue-600]="activeStep() >= 1"
                [class.border-blue-600]="activeStep() >= 1"
                [class.text-white]="activeStep() >= 1"
                [class.border-gray-300]="activeStep() < 1"
                [class.text-gray-400]="activeStep() < 1"
              >
                2
              </div>
              <span class="ml-2 font-medium">Configuration</span>
            </div>
            <div class="w-8 h-0.5 bg-gray-200" [class.bg-blue-600]="activeStep() >= 2"></div>
            <div class="flex items-center" [class.text-blue-600]="activeStep() >= 2">
              <div
                class="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                [class.bg-blue-600]="activeStep() >= 2"
                [class.border-blue-600]="activeStep() >= 2"
                [class.text-white]="activeStep() >= 2"
                [class.border-gray-300]="activeStep() < 2"
                [class.text-gray-400]="activeStep() < 2"
              >
                3
              </div>
              <span class="ml-2 font-medium">Preview</span>
            </div>
          </div>
        </div>

        <!-- Step Content -->
        <p-card class="min-h-96">
          <!-- Step 1: Basic Information -->
          <div *ngIf="activeStep() === 0" class="step-content">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Basic Information</h3>
              <p class="text-sm text-gray-600">Enter the fundamental details for your new tool.</p>
            </div>

            <form [formGroup]="basicInfoForm" class="space-y-6">
              <!-- Tool Name -->
              <div>
                <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                  Tool Name <span class="text-red-500">*</span>
                </label>
                <input
                  pInputText
                  id="name"
                  formControlName="name"
                  placeholder="Enter tool name (e.g., 'Short Link Generator')"
                  class="w-full"
                  (input)="onNameChange()"
                />
                <small
                  *ngIf="
                    basicInfoForm.get('name')?.errors?.['required'] &&
                    basicInfoForm.get('name')?.touched
                  "
                  class="p-error"
                >
                  Tool name is required.
                </small>
              </div>

              <!-- Tool Description -->
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                  Description <span class="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  formControlName="description"
                  rows="3"
                  placeholder="Describe what this tool does and its purpose..."
                  class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
                <small
                  *ngIf="
                    basicInfoForm.get('description')?.errors?.['required'] &&
                    basicInfoForm.get('description')?.touched
                  "
                  class="p-error"
                >
                  Description is required.
                </small>
              </div>

              <!-- Tool Key -->
              <div>
                <label for="toolKey" class="block text-sm font-medium text-gray-700 mb-2">
                  Tool Key <span class="text-red-500">*</span>
                </label>
                <input
                  pInputText
                  id="toolKey"
                  formControlName="toolKey"
                  placeholder="unique-tool-key"
                  class="w-full"
                />
                <small class="text-gray-500 block mt-1">
                  Unique identifier for this tool (lowercase, hyphens allowed). Auto-generated from
                  name.
                </small>
                <small
                  *ngIf="
                    basicInfoForm.get('toolKey')?.errors?.['required'] &&
                    basicInfoForm.get('toolKey')?.touched
                  "
                  class="p-error block"
                >
                  Tool key is required.
                </small>
                <small
                  *ngIf="
                    basicInfoForm.get('toolKey')?.errors?.['pattern'] &&
                    basicInfoForm.get('toolKey')?.touched
                  "
                  class="p-error block"
                >
                  Tool key must be lowercase with hyphens only.
                </small>
                <small *ngIf="keyValidationError()" class="p-error block">
                  {{ keyValidationError() }}
                </small>
              </div>

              <!-- Validation Status -->
              <div
                *ngIf="validatingKey()"
                class="flex items-center space-x-2 text-sm text-blue-600"
              >
                <p-progressSpinner [style]="{ width: '16px', height: '16px' }"></p-progressSpinner>
                <span>Validating tool key...</span>
              </div>
            </form>

            <!-- Navigation Buttons -->
            <div class="flex justify-end mt-8 pt-6 border-t">
              <p-button
                label="Next"
                icon="pi pi-arrow-right"
                iconPos="right"
                [disabled]="!basicInfoForm.valid || validatingKey()"
                (onClick)="nextStep()"
              />
            </div>
          </div>

          <!-- Step 2: Configuration -->
          <div *ngIf="activeStep() === 1" class="step-content">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Configuration</h3>
              <p class="text-sm text-gray-600">
                Configure the tool's appearance and categorization.
              </p>
            </div>

            <form [formGroup]="configurationForm" class="space-y-6">
              <!-- Slug -->
              <div>
                <label for="slug" class="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug <span class="text-red-500">*</span>
                </label>
                <input
                  pInputText
                  id="slug"
                  formControlName="slug"
                  placeholder="tool-url-slug"
                  class="w-full"
                />
                <small class="text-gray-500 block mt-1">
                  Used in URLs and routing. Auto-generated from tool name.
                </small>
                <small
                  *ngIf="
                    configurationForm.get('slug')?.errors?.['required'] &&
                    configurationForm.get('slug')?.touched
                  "
                  class="p-error block"
                >
                  Slug is required.
                </small>
              </div>

              <!-- Icon -->
              <div>
                <label for="icon" class="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <select
                  id="icon"
                  formControlName="icon"
                  class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an icon</option>
                  <option *ngFor="let option of iconOptions" [value]="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <!-- Category -->
              <div>
                <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
                  Category <span class="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  formControlName="category"
                  class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  <option *ngFor="let option of categoryOptions" [value]="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <small
                  *ngIf="
                    configurationForm.get('category')?.errors?.['required'] &&
                    configurationForm.get('category')?.touched
                  "
                  class="p-error block"
                >
                  Category is required.
                </small>
              </div>

              <!-- Code Path -->
              <div>
                <label for="codePath" class="block text-sm font-medium text-gray-700 mb-2">
                  Code Path
                </label>
                <input
                  pInputText
                  id="codePath"
                  formControlName="codePath"
                  placeholder="src/app/features/tools/components/my-tool/"
                  class="w-full"
                />
                <small class="text-gray-500 block mt-1">
                  Optional. Path to the tool's source code location for developer reference.
                </small>
              </div>
            </form>

            <!-- Navigation Buttons -->
            <div class="flex justify-between mt-8 pt-6 border-t">
              <p-button
                label="Previous"
                icon="pi pi-arrow-left"
                severity="secondary"
                [outlined]="true"
                (onClick)="previousStep()"
              />
              <p-button
                label="Next"
                icon="pi pi-arrow-right"
                iconPos="right"
                [disabled]="!configurationForm.valid"
                (onClick)="nextStep()"
              />
            </div>
          </div>

          <!-- Step 3: Preview & Confirmation -->
          <div *ngIf="activeStep() === 2" class="step-content">
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Preview & Confirmation</h3>
              <p class="text-sm text-gray-600">
                Review your tool configuration and see how it will appear in the system.
              </p>
            </div>

            <!-- Tool Preview Card -->
            <div class="mb-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">Tool Card Preview</h4>
              <p-card class="tool-preview-card">
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i [class]="getPreviewIcon()" class="text-2xl text-blue-600"></i>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="text-lg font-semibold text-gray-900 truncate">
                      {{ basicInfoForm.get('name')?.value || 'Tool Name' }}
                    </h5>
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                      {{ basicInfoForm.get('description')?.value || 'Tool description' }}
                    </p>
                    <div class="mt-3 flex items-center space-x-4">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {{ getCategoryLabel(configurationForm.get('category')?.value) }}
                      </span>
                      <span class="text-xs text-gray-500">
                        Key: {{ basicInfoForm.get('toolKey')?.value || 'tool-key' }}
                      </span>
                    </div>
                  </div>
                </div>
              </p-card>
            </div>

            <!-- Configuration Summary -->
            <div class="mb-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">Configuration Summary</h4>
              <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm font-medium text-gray-500">Tool Name:</span>
                    <span class="text-sm text-gray-900 ml-2">
                      {{ basicInfoForm.get('name')?.value || 'Not set' }}
                    </span>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Tool Key:</span>
                    <span class="text-sm text-gray-900 ml-2">
                      {{ basicInfoForm.get('toolKey')?.value || 'Not set' }}
                    </span>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">URL Slug:</span>
                    <span class="text-sm text-gray-900 ml-2">
                      {{ configurationForm.get('slug')?.value || 'Not set' }}
                    </span>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Category:</span>
                    <span class="text-sm text-gray-900 ml-2">
                      {{ getCategoryLabel(configurationForm.get('category')?.value) || 'Not set' }}
                    </span>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Code Path:</span>
                    <span class="text-sm text-gray-900 ml-2">
                      {{ configurationForm.get('codePath')?.value || 'Not specified' }}
                    </span>
                  </div>
                </div>
                <div class="pt-2 border-t border-gray-200">
                  <span class="text-sm font-medium text-gray-500">Description:</span>
                  <p class="text-sm text-gray-900 mt-1">
                    {{ basicInfoForm.get('description')?.value || 'No description provided' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Navigation Buttons -->
            <div class="flex justify-between mt-8 pt-6 border-t">
              <p-button
                label="Previous"
                icon="pi pi-arrow-left"
                severity="secondary"
                [outlined]="true"
                (onClick)="previousStep()"
              />
              <p-button
                label="Create Tool"
                icon="pi pi-plus"
                iconPos="right"
                severity="success"
                [loading]="submitting()"
                [disabled]="!isFormValid() || submitting()"
                (onClick)="createTool()"
              />
            </div>
          </div>
        </p-card>
      </div>
    </div>

    <!-- Toast for notifications -->
    <p-toast />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateToolWizardComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toolsService = inject(ToolsService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  // Wizard state
  activeStep = signal(0);
  submitting = signal(false);
  validatingKey = signal(false);
  keyValidationError = signal<string | null>(null);

  // Form groups for each step
  basicInfoForm!: FormGroup;
  configurationForm!: FormGroup;

  // Dropdown options
  iconOptions = [
    { label: 'Link', value: 'pi pi-link' },
    { label: 'Settings', value: 'pi pi-cog' },
    { label: 'Document', value: 'pi pi-file' },
    { label: 'Chart', value: 'pi pi-chart-bar' },
    { label: 'Users', value: 'pi pi-users' },
    { label: 'Globe', value: 'pi pi-globe' },
    { label: 'Calculator', value: 'pi pi-calculator' },
    { label: 'Code', value: 'pi pi-code' },
    { label: 'Database', value: 'pi pi-database' },
    { label: 'Tools', value: 'pi pi-wrench' },
  ];

  categoryOptions = [
    { label: 'Productivity', value: 'productivity' },
    { label: 'Utility', value: 'utility' },
    { label: 'Communication', value: 'communication' },
    { label: 'Data', value: 'data' },
  ];

  ngOnInit(): void {
    this.initializeForms();
    this.setupKeyValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initializes reactive forms for all wizard steps.
   */
  private initializeForms(): void {
    // Step 1: Basic Information
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      toolKey: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    });

    // Step 2: Configuration
    this.configurationForm = this.fb.group({
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      icon: ['pi pi-cog'], // Default icon
      category: ['', Validators.required],
      codePath: [''], // Optional field
    });
  }

  /**
   * Sets up debounced key validation for real-time feedback.
   */
  private setupKeyValidation(): void {
    this.basicInfoForm
      .get('toolKey')
      ?.valueChanges.pipe(
        debounceTime(300), // 300ms debounce as requested
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((key: string) => {
        if (key && key.length >= 2 && this.basicInfoForm.get('toolKey')?.valid) {
          this.validateToolKey(key);
        }
      });
  }

  /**
   * Handles tool name changes and auto-generates key and slug.
   */
  onNameChange(): void {
    const name = this.basicInfoForm.get('name')?.value || '';
    if (name.trim()) {
      const generatedKey = this.generateKeyFromName(name);
      const generatedSlug = this.generateSlugFromName(name);

      // Update key and slug if they haven't been manually modified
      this.basicInfoForm.patchValue({ toolKey: generatedKey });
      this.configurationForm.patchValue({ slug: generatedSlug });

      // Don't call validateToolKey here - let the debounced valueChanges handle it
    }
  }

  /**
   * Generates a tool key from the tool name.
   */
  private generateKeyFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Generates a URL slug from the tool name.
   */
  private generateSlugFromName(name: string): string {
    return this.generateKeyFromName(name); // Same logic for now
  }

  /**
   * Validates tool key uniqueness against the API.
   */
  private validateToolKey(key: string): void {
    if (!key || key.length < 2) return;

    this.validatingKey.set(true);
    this.keyValidationError.set(null);

    this.toolsService
      .validateToolKey(key)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isAvailable) => {
          this.validatingKey.set(false);
          if (!isAvailable) {
            this.keyValidationError.set(
              'This tool key is already taken. Please choose a different one.',
            );
          }
        },
        error: (error) => {
          this.validatingKey.set(false);
          this.keyValidationError.set('Unable to validate key. Please check your connection.');
          console.error('Key validation error:', error);
        },
      });
  }

  /**
   * Moves to the next step in the wizard.
   */
  nextStep(): void {
    if (this.activeStep() < 2) {
      this.activeStep.set(this.activeStep() + 1);
    }
  }

  /**
   * Moves to the previous step in the wizard.
   */
  previousStep(): void {
    if (this.activeStep() > 0) {
      this.activeStep.set(this.activeStep() - 1);
    }
  }

  /**
   * Gets the preview icon class.
   */
  getPreviewIcon(): string {
    return this.configurationForm.get('icon')?.value || 'pi pi-cog';
  }

  /**
   * Gets the category label for display.
   */
  getCategoryLabel(value: string): string {
    const option = this.categoryOptions.find((opt) => opt.value === value);
    return option?.label || '';
  }

  /**
   * Checks if the entire form is valid across all steps.
   */
  isFormValid(): boolean {
    return this.basicInfoForm.valid && this.configurationForm.valid;
  }

  /**
   * Creates the tool by submitting to the API.
   */
  createTool(): void {
    if (!this.isFormValid()) return;

    this.submitting.set(true);

    const toolData: CreateToolRequest = {
      key: this.basicInfoForm.get('toolKey')?.value,
      name: this.basicInfoForm.get('name')?.value,
      description: this.basicInfoForm.get('description')?.value,
      slug: this.configurationForm.get('slug')?.value,
      icon: this.configurationForm.get('icon')?.value,
      category: this.configurationForm.get('category')?.value,
      codePath: this.configurationForm.get('codePath')?.value || undefined,
      active: true, // Tools are created active by default
    };

    this.toolsService.createTool(toolData).subscribe({
      next: (createdTool) => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Tool "${createdTool.name}" created successfully!`,
        });

        // Navigate back to tools list after brief delay
        setTimeout(() => {
          this.navigateBack();
        }, 2000);
      },
      error: (error) => {
        this.submitting.set(false);
        console.error('Error creating tool:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.error?.message || 'Failed to create tool. Please try again.',
        });
      },
    });
  }

  /**
   * Navigates back to the tools management page.
   */
  navigateBack(): void {
    this.router.navigate(['/admin/tools']);
  }
}
