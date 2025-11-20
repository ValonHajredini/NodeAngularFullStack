import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  OnDestroy,
  input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormFieldType, isInputField, isDisplayElement, TemplateCategory } from '@nodeangularfullstack/shared';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TemplateValidationService } from '../template-editor/services/template-validation.service';

interface FieldTypeDefinition {
  type: FormFieldType;
  icon: string;
  label: string;
  category: 'input' | 'preview';
}

/**
 * Collapsible field palette component for displaying available field types.
 * Users can click field types to add them to the form canvas.
 * Features collapsible sidebar with localStorage persistence.
 */
@Component({
  selector: 'app-field-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ScrollPanelModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    TooltipModule,
    BadgeModule,
    DragDropModule,
  ],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)', opacity: 0 })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('200ms 100ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
  ],
  template: `
    <!-- Floating toggle button (only visible when collapsed) -->
    @if (isCollapsed()) {
      <button
        @fadeIn
        pButton
        icon="pi pi-list"
        (click)="toggleCollapse()"
        class="floating-toggle-btn"
        [attr.aria-label]="'Expand field palette'"
        severity="primary"
        [rounded]="true"
      ></button>
    }

    <!-- Sidebar (only visible when expanded) -->
    @if (!isCollapsed()) {
      <div
        @slideInOut
        class="field-palette h-full bg-white border-r border-gray-200"
        (click)="resetInactivityTimer()"
        (scroll)="resetInactivityTimer()"
        (mousemove)="onMouseMove()"
      >
        <!-- Close button -->
        <div class="flex items-center justify-between p-2 border-b border-gray-200">
          <span class="text-sm font-semibold text-gray-700">Field Types</span>
          <button
            pButton
            icon="pi pi-times"
            (click)="toggleCollapse()"
            size="small"
            [text]="true"
            [rounded]="true"
            [attr.aria-label]="'Collapse sidebar'"
          ></button>
        </div>

        <div class="palette-content">
          <div class="p-4 border-b border-gray-200">
            <!-- Search Input -->
            <p-iconfield iconPosition="left">
              <p-inputicon styleClass="pi pi-search" />
              <input
                type="text"
                pInputText
                placeholder="Search fields..."
                [value]="searchQuery()"
                (input)="onSearchChange($any($event.target).value)"
                class="w-full"
              />
            </p-iconfield>
          </div>

          <p-scrollpanel [style]="{ width: '100%', height: 'calc(100vh - 260px)' }">
            <div
              cdkDropList
              #paletteDropList="cdkDropList"
              id="palette-drop-list"
              [cdkDropListData]="fieldTypes"
              [cdkDropListSortingDisabled]="true"
              class="space-y-4"
            >
              <!-- Input Fields Section -->
              @if (filteredInputFields().length > 0) {
                <div>
                  <div class="flex items-center gap-2 mb-2 px-1">
                    <span class="text-xs font-bold text-green-700 uppercase tracking-wider"
                      >Input Fields</span
                    >
                    <span class="flex-1 h-px bg-green-200"></span>
                  </div>
                  <div class="space-y-2">
                    @for (fieldType of filteredInputFields(); track fieldType.type) {
                      <div
                        cdkDrag
                        [cdkDragData]="fieldType"
                        [class]="isFieldTypeRequired(fieldType.type)
                          ? 'field-type-card border-2 border-blue-400 bg-blue-50 rounded-lg cursor-move hover:bg-blue-100 hover:border-blue-500 transition-all'
                          : 'field-type-card border border-gray-300 rounded-lg cursor-move hover:bg-green-50 hover:border-green-400 transition-all'"
                        [pTooltip]="isFieldTypeRequired(fieldType.type) ? getRequiredFieldTooltip(fieldType.type) : ''"
                        [tooltipPosition]="'right'"
                        [escape]="false"
                        (click)="onFieldTypeSelected(fieldType.type)"
                      >
                        <div class="flex items-center gap-3 justify-between">
                          <div class="flex items-center gap-3">
                            <i [class]="'pi ' + fieldType.icon + ' text-green-600 text-xl'"></i>
                            <span class="text-sm font-medium text-gray-800">{{
                              fieldType.label
                            }}</span>
                          </div>
                          @if (isFieldTypeRequired(fieldType.type)) {
                            <p-badge value="Required" severity="info" />
                          }
                        </div>

                        <div
                          *cdkDragPreview
                          class="drag-preview bg-white border-2 border-green-400 rounded-lg shadow-lg opacity-90"
                        >
                          <div class="flex items-center gap-3">
                            <i [class]="'pi ' + fieldType.icon + ' text-green-600 text-xl'"></i>
                            <span class="text-sm font-medium text-gray-800">{{
                              fieldType.label
                            }}</span>
                          </div>
                        </div>

                        <div *cdkDragPlaceholder class="field-type-placeholder bg-green-50"></div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Preview Elements Section -->
              @if (filteredPreviewFields().length > 0) {
                <div>
                  <div class="flex items-center gap-2 mb-2 px-1">
                    <span class="text-xs font-bold text-purple-700 uppercase tracking-wider"
                      >Preview Elements</span
                    >
                    <span class="flex-1 h-px bg-purple-200"></span>
                  </div>
                  <div class="space-y-2">
                    @for (fieldType of filteredPreviewFields(); track fieldType.type) {
                      <div
                        cdkDrag
                        [cdkDragData]="fieldType"
                        class="field-type-card border border-gray-300 rounded-lg cursor-move hover:bg-purple-50 hover:border-purple-400 transition-all"
                        (click)="onFieldTypeSelected(fieldType.type)"
                      >
                        <div class="flex items-center gap-3">
                          <i [class]="'pi ' + fieldType.icon + ' text-purple-600 text-xl'"></i>
                          <span class="text-sm font-medium text-gray-800">{{
                            fieldType.label
                          }}</span>
                        </div>

                        <div
                          *cdkDragPreview
                          class="drag-preview bg-white border-2 border-purple-400 rounded-lg shadow-lg opacity-90"
                        >
                          <div class="flex items-center gap-3">
                            <i [class]="'pi ' + fieldType.icon + ' text-purple-600 text-xl'"></i>
                            <span class="text-sm font-medium text-gray-800">{{
                              fieldType.label
                            }}</span>
                          </div>
                        </div>

                        <div *cdkDragPlaceholder class="field-type-placeholder bg-purple-50"></div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- No Results Message -->
              @if (
                filteredInputFields().length === 0 &&
                filteredPreviewFields().length === 0 &&
                searchQuery()
              ) {
                <div class="text-center py-8 px-4">
                  <i class="pi pi-search text-4xl text-gray-400 mb-3 block"></i>
                  <p class="text-sm text-gray-600">
                    No fields found matching "{{ searchQuery() }}"
                  </p>
                </div>
              }
            </div>
          </p-scrollpanel>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .field-palette {
        width: 280px;
        min-width: 280px;
      }

      .floating-toggle-btn {
        position: fixed;
        left: 16px;
        top: 25%;
        transform: translateY(-50%);
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        width: 48px;
        height: 48px;
      }

      .palette-content {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
      }

      .field-type-card {
        user-select: none;
        padding: 3px 0.75rem !important;
      }

      .field-type-card:active {
        transform: scale(0.98);
      }

      .drag-preview {
        min-width: 200px;
        padding: 3px 0.75rem !important;
      }

      .field-type-placeholder {
        background: #dbeafe;
        border: 2px dashed #3b82f6;
        border-radius: 8px;
        min-height: 48px;
      }

      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class FieldPaletteComponent implements OnInit, OnDestroy {
  @Output() fieldSelected = new EventEmitter<FormFieldType>();

  /**
   * Template category for showing required field hints (AC 4)
   * When provided, highlights required field types and shows tooltips
   */
  readonly templateCategory = input<TemplateCategory | null>(null);

  // Inject validation service for required field detection
  private readonly validationService = inject(TemplateValidationService);

  private readonly STORAGE_KEY = 'formBuilder.fieldPaletteSidebarCollapsed';
  private inactivityTimer?: number;
  private timeoutStartTime?: number;
  private readonly INACTIVITY_TIMEOUT = 30000; // 30 seconds
  private readonly HOVER_GRACE_PERIOD = 5000; // 5 seconds

  /**
   * Signal tracking the collapsed state of the sidebar.
   */
  readonly isCollapsed = signal<boolean>(false);

  // Search query signal
  searchQuery = signal<string>('');

  readonly fieldTypes: FieldTypeDefinition[] = [
    { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text Input', category: 'input' },
    { type: FormFieldType.EMAIL, icon: 'pi-envelope', label: 'Email', category: 'input' },
    { type: FormFieldType.NUMBER, icon: 'pi-hashtag', label: 'Number', category: 'input' },
    { type: FormFieldType.SELECT, icon: 'pi-list', label: 'Select', category: 'input' },
    { type: FormFieldType.TEXTAREA, icon: 'pi-align-left', label: 'Textarea', category: 'input' },
    { type: FormFieldType.FILE, icon: 'pi-upload', label: 'File Upload', category: 'input' },
    { type: FormFieldType.CHECKBOX, icon: 'pi-check-square', label: 'Checkbox', category: 'input' },
    { type: FormFieldType.RADIO, icon: 'pi-circle', label: 'Radio Group', category: 'input' },
    { type: FormFieldType.DATE, icon: 'pi-calendar', label: 'Date', category: 'input' },
    { type: FormFieldType.DATETIME, icon: 'pi-clock', label: 'DateTime', category: 'input' },
    { type: FormFieldType.TOGGLE, icon: 'pi-toggle-on', label: 'Toggle', category: 'input' },
    {
      type: FormFieldType.IMAGE_GALLERY,
      icon: 'pi-images',
      label: 'Image Gallery',
      category: 'input',
    },
    {
      type: FormFieldType.TIME_SLOT,
      icon: 'pi-hourglass',
      label: 'Time Slot',
      category: 'input',
    },
    {
      type: FormFieldType.DIVIDER,
      icon: 'pi-minus',
      label: 'Section Divider',
      category: 'preview',
    },
    { type: FormFieldType.HEADING, icon: 'pi-align-center', label: 'Heading', category: 'preview' },
    { type: FormFieldType.IMAGE, icon: 'pi-image', label: 'Image', category: 'preview' },
    {
      type: FormFieldType.TEXT_BLOCK,
      icon: 'pi-align-justify',
      label: 'Text Block',
      category: 'preview',
    },
    // Note: Background Image and Custom Background moved to Form Settings
  ];

  // Base arrays for Input and Preview fields
  readonly inputFields = this.fieldTypes.filter((f) => f.category === 'input');
  readonly previewFields = this.fieldTypes.filter((f) => f.category === 'preview');

  // Computed filtered arrays based on search query
  readonly filteredInputFields = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.inputFields;
    return this.inputFields.filter((field) => field.label.toLowerCase().includes(query));
  });

  readonly filteredPreviewFields = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.previewFields;
    return this.previewFields.filter((field) => field.label.toLowerCase().includes(query));
  });

  /**
   * Map of required field types for the current template category (AC 4)
   * Returns a map of field type -> requirement explanation
   */
  readonly requiredFieldTypes = computed(() => {
    const category = this.templateCategory();
    if (!category) return new Map<string, string>();

    const requirements = this.validationService.getRequirementsForCategory(category);
    const requiredTypes = new Map<string, string>();

    for (const req of requirements) {
      // Extract field types from requirement
      for (const fieldType of req.allowedTypes) {
        // Map backend field type names to frontend FormFieldType enum values
        const frontendType = this.mapBackendToFrontendType(fieldType);
        if (frontendType) {
          const fieldName = req.fieldName || req.fieldNamePattern?.source || 'field';
          requiredTypes.set(frontendType, `${fieldType} field required for ${fieldName} (${this.getCategoryPurpose(category)})`);
        }
      }
    }

    return requiredTypes;
  });

  /**
   * Maps backend field type names to frontend FormFieldType enum values
   */
  private mapBackendToFrontendType(backendType: string): string | null {
    const typeMap: Record<string, string> = {
      'TEXT': FormFieldType.TEXT,
      'EMAIL': FormFieldType.EMAIL,
      'NUMBER': FormFieldType.NUMBER,
      'SELECT': FormFieldType.SELECT,
      'TEXTAREA': FormFieldType.TEXTAREA,
      'CHECKBOX': FormFieldType.CHECKBOX,
      'RADIO': FormFieldType.RADIO,
      'DATE': FormFieldType.DATE,
      'DATETIME': FormFieldType.DATETIME,
      'TIME_SLOT': FormFieldType.TIME_SLOT,
      'FILE': FormFieldType.FILE,
      'TOGGLE': FormFieldType.TOGGLE,
    };
    return typeMap[backendType] || null;
  }

  /**
   * Gets a user-friendly purpose description for the category
   */
  private getCategoryPurpose(category: TemplateCategory): string {
    const purposeMap: Record<TemplateCategory, string> = {
      [TemplateCategory.POLLS]: 'vote tracking',
      [TemplateCategory.QUIZ]: 'quiz questions',
      [TemplateCategory.ECOMMERCE]: 'product orders',
      [TemplateCategory.SERVICES]: 'appointment booking',
      [TemplateCategory.DATA_COLLECTION]: 'menu orders',
      [TemplateCategory.EVENTS]: 'event registration',
    };
    return purposeMap[category] || 'data collection';
  }

  /**
   * Checks if a field type is required for the current template category
   */
  isFieldTypeRequired(fieldType: FormFieldType): boolean {
    return this.requiredFieldTypes().has(fieldType);
  }

  /**
   * Gets the tooltip text explaining why a field type is required
   */
  getRequiredFieldTooltip(fieldType: FormFieldType): string {
    return this.requiredFieldTypes().get(fieldType) || '';
  }

  /**
   * Lifecycle hook that initializes the component.
   * Restores collapse state from localStorage.
   */
  ngOnInit(): void {
    this.restoreCollapseState();
  }

  /**
   * Lifecycle hook for cleanup.
   * Clears inactivity timer to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.clearInactivityTimer();
  }

  /**
   * Toggles the sidebar collapse state and persists it to localStorage.
   * Manages inactivity timer: starts when opening, clears when closing.
   */
  toggleCollapse(): void {
    const wasCollapsed = this.isCollapsed();
    this.isCollapsed.update((collapsed) => !collapsed);
    localStorage.setItem(this.STORAGE_KEY, String(this.isCollapsed()));

    if (wasCollapsed) {
      // Opening sidebar - start inactivity timer
      this.startInactivityTimer();
    } else {
      // Closing sidebar - clear timer
      this.clearInactivityTimer();
    }
  }

  /**
   * Restores the sidebar collapse state from localStorage.
   */
  private restoreCollapseState(): void {
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState !== null) {
      this.isCollapsed.set(savedState === 'true');
    } else {
      // Default to collapsed on small screens
      this.isCollapsed.set(window.innerWidth < 1024);
    }
  }

  /**
   * Handles search input change
   */
  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  /**
   * Emits the selected field type when a user clicks on a field type card.
   * This allows the parent component to add the field to the form canvas.
   * @param type - The FormFieldType that was selected
   */
  onFieldTypeSelected(type: FormFieldType): void {
    this.fieldSelected.emit(type);
  }

  /**
   * Handles mouse move events.
   * Only resets timer if less than 5 seconds remaining (grace period).
   */
  onMouseMove(): void {
    const remainingTime = this.getRemainingTime();
    if (remainingTime !== null && remainingTime < this.HOVER_GRACE_PERIOD) {
      this.resetInactivityTimer();
    }
  }

  /**
   * Starts the inactivity timer.
   * After timeout, automatically closes the sidebar.
   */
  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    this.timeoutStartTime = Date.now();
    this.inactivityTimer = window.setTimeout(() => {
      this.isCollapsed.set(true);
      localStorage.setItem(this.STORAGE_KEY, 'true');
      this.clearInactivityTimer();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Resets the inactivity timer.
   * Called on user interactions (click, scroll, drag).
   */
  resetInactivityTimer(): void {
    if (!this.isCollapsed()) {
      this.startInactivityTimer();
    }
  }

  /**
   * Clears the inactivity timer.
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      window.clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
      this.timeoutStartTime = undefined;
    }
  }

  /**
   * Calculates remaining time on the inactivity timer.
   * @returns Milliseconds remaining, or null if no timer active
   */
  private getRemainingTime(): number | null {
    if (!this.timeoutStartTime || !this.inactivityTimer) {
      return null;
    }
    const elapsed = Date.now() - this.timeoutStartTime;
    return Math.max(0, this.INACTIVITY_TIMEOUT - elapsed);
  }
}
