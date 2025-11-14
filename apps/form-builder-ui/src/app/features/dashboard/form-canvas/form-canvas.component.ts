import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  Input,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { FormField, FormFieldType, FieldPosition, FormTheme } from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { FormSettings } from '../../../shared/components/form-settings-modal';
import { ThemePreviewService } from '../theme-preview.service';
import { FormsApiService } from '../forms-api.service';
import { FieldPreviewRendererComponent } from './field-preview-renderer/field-preview-renderer.component';
import { GroupPreviewComponent } from './field-preview-renderer/group-preview.component';
import { sanitizeCustomBackground } from '../../../shared/utils/sanitizer';
import { validateCSS, stripDangerousCSS } from '../../../shared/utils/css-validator';

interface FieldTypeDefinition {
  type: FormFieldType;
  icon: string;
  label: string;
}

/**
 * Form canvas component for displaying and managing form fields.
 * Shows the current form structure and allows field selection.
 */
@Component({
  selector: 'app-form-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DragDropModule, FieldPreviewRendererComponent, GroupPreviewComponent],
  styleUrls: ['./form-canvas.component.scss'],
  template: `
    <div class="form-canvas h-full theme-form-canvas-background p-6">
      <!-- Form Title and Description (shown when form has fields or row layout enabled) -->
      @if (formBuilderService.hasFields() || formBuilderService.rowLayoutEnabled()) {
        <div class="mb-4">
          <h3 class="theme-heading">
            {{ settings.title || 'Untitled Form' }}
          </h3>
          <p class="text-sm theme-text-secondary">
            This is a live preview of your form. Click on a field to edit its properties
            @if (settings.columnLayout > 1) {
              <span class="ml-2 theme-text-primary">{{ settings.columnLayout }} columns</span>
            }
          </p>
          @if (settings.description) {
            <p class="text-sm theme-help-text mt-1">{{ settings.description }}</p>
          }
        </div>
      }

      <!-- Step Navigation Tabs (shown when step mode enabled) -->
      @if (stepFormEnabled()) {
        <div class="step-navigation-container mb-6">
          <div
            class="step-tabs-bar flex items-center gap-2 border-b border-gray-200 pb-0"
          >
            @for (step of steps(); track step.id) {
              <button
                type="button"
                class="step-tab flex items-center gap-2 px-4 py-2 rounded-t-md border border-b-0 theme-button-secondary transition-colors whitespace-nowrap"
                [class.active]="step.id === activeStepId()"
                [attr.aria-selected]="step.id === activeStepId()"
                [attr.aria-label]="'Switch to ' + step.title"
                (click)="onStepTabClick(step.id)"
              >
                <span
                  class="step-number theme-step-indicator flex items-center justify-center w-6 h-6 text-sm"
                >
                  {{ step.order + 1 }}
                </span>
                <span class="step-title truncate max-w-[150px]">{{ step.title }}</span>
              </button>
            }
          </div>

          <!-- Step Indicator Badge -->
          <!-- <div
            class="step-indicator-bar flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-200"
          >
            <span
              class="badge-primary theme-step-indicator inline-flex items-center rounded-full"
            >
              Step {{ activeStepOrder() + 1 }} of {{ steps().length }}
            </span>
            <span class="theme-label text-lg font-semibold">{{ activeStep()?.title }}</span>
            @if (activeStep()?.description) {
              <span class="text-sm theme-help-text">{{ activeStep()?.description }}</span>
            }
          </div> -->
        </div>
      }

      @if (!formBuilderService.hasFields() && !formBuilderService.rowLayoutEnabled()) {
        <div
          class="drop-zone empty min-h-full flex flex-col items-center justify-center text-center py-20"
          cdkDropList
          #canvasDropList="cdkDropList"
          id="canvas-drop-list"
          [cdkDropListData]="formBuilderService.formFields()"
          (cdkDropListDropped)="onFieldDropped($event)"
        >
          <i class="pi pi-file-edit text-6xl text-gray-300 mb-4"></i>
          <h3 class="theme-heading mb-2">Start Building Your Form</h3>
          <p class="theme-help-text max-w-md">
            Drag fields from the palette to start building your form
          </p>
        </div>
      } @else {
        <div
          class="form-fields-wrapper"
          [style.position]="hasBackgroundImage() || hasCustomBackground() ? 'relative' : ''"
        >
          <!-- Background layer with blur -->
          @if (hasBackgroundImage()) {
            <div
              class="background-layer"
              [ngStyle]="getBackgroundStyles()"
              style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0;"
            ></div>
          }

          <!-- Custom Background (Sandboxed) -->
          @if (hasCustomBackground()) {
            <iframe
              [srcdoc]="getSandboxedPreviewHTML()"
              sandbox="allow-same-origin"
              class="custom-background-preview"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; border: none; background: transparent;"
            ></iframe>
          }

          <!-- Background overlay for opacity control -->
          @if (shouldShowBackgroundOverlay()) {
            <div
              class="background-overlay"
              [style.opacity]="1 - getBackgroundOpacity()"
              style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: white; pointer-events: none; z-index: 1;"
            ></div>
          }

          @if (formBuilderService.rowLayoutEnabled()) {
            <!-- Row-based layout mode -->
            @if (stepFormEnabled() && visibleRows().length === 0 && visibleFields().length === 0) {
              <!-- Empty step placeholder -->
              <div
                class="empty-step-state flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
                style="position: relative; z-index: 2;"
              >
                <div class="empty-icon mb-4">
                  <i class="pi pi-inbox text-gray-300" style="font-size: 6rem;"></i>
                </div>
                <h3 class="theme-heading mb-2">
                  No fields in Step {{ activeStepOrder() + 1 }} yet
                </h3>
                <p class="theme-text-secondary mb-4 max-w-md">
                  Drag field types from the palette on the left to add them to this step.
                </p>
                <p class="flex items-center gap-2 text-sm theme-help-text px-4 py-2 rounded-md">
                  <i class="pi pi-info-circle"></i>
                  You can organize fields within this step using rows and columns.
                </p>
              </div>
            } @else {
              <div class="row-layout-container space-y-4" style="position: relative; z-index: 2;">
                @for (row of visibleRows(); track row.rowId) {
                  <div class="row-wrapper">
                    <!-- Row separator with label -->
                    <div class="row-separator mb-2 flex items-center gap-2">
                      <span class="text-sm theme-label">
                        Row {{ row.order + 1 }} ({{ row.columnCount }} columns)
                      </span>
                      <div class="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <!-- Row columns grid -->
                    <div
                      class="row-grid theme-row-container"
                      [style.grid-template-columns]="getColumnGridTemplate(row)"
                      style="display: grid; gap: 16px; min-height: 120px;"
                    >
                      @for (columnIndex of getColumnIndices(row.columnCount); track columnIndex) {
                        <div class="column-wrapper">
                          @if (hasSubColumns(row.rowId, columnIndex)) {
                            <!-- Sub-column layout: render sub-column drop zones -->
                            <div
                              class="sub-columns-container"
                              [style.grid-template-columns]="
                                getSubColumnWidths(row.rowId, columnIndex)
                              "
                              style="display: grid; gap: 12px; min-height: 100px;"
                            >
                              @for (
                                subColumn of subColumnsForColumn(row.rowId, columnIndex);
                                track subColumn.index
                              ) {
                                <div
                                  class="sub-column-drop-zone"
                                  [class.sub-column-drop-zone--empty]="
                                    isSubColumnEmpty(row.rowId, columnIndex, subColumn.index)
                                  "
                                  [id]="
                                    'subColumn-' +
                                    row.rowId +
                                    '-' +
                                    columnIndex +
                                    '-' +
                                    subColumn.index
                                  "
                                  cdkDropList
                                  [cdkDropListData]="
                                    getSubColumnDropData(row.rowId, columnIndex, subColumn.index)
                                  "
                                  [cdkDropListEnterPredicate]="canDropIntoColumn"
                                  (cdkDropListDropped)="onFieldDroppedInRow($event)"
                                  role="region"
                                  [attr.aria-label]="
                                    'Sub-column ' +
                                    (subColumn.index + 1) +
                                    ' of ' +
                                    subColumnsForColumn(row.rowId, columnIndex).length +
                                    ' drop zone'
                                  "
                                >
                                  @if (isSubColumnEmpty(row.rowId, columnIndex, subColumn.index)) {
                                    <!-- Empty sub-column placeholder -->
                                    <div class="empty-placeholder">
                                      <i class="pi pi-inbox text-gray-300 text-2xl mb-2"></i>
                                      <span class="text-xs theme-help-text">Drop field here</span>
                                    </div>
                                  }

                                  <!-- Fields in sub-column -->
                                  @for (
                                    field of fieldsInSubColumn(
                                      row.rowId,
                                      columnIndex,
                                      subColumn.index
                                    );
                                    track field.id;
                                    let fieldIndex = $index
                                  ) {
                                    <div class="field-wrapper mb-3" cdkDrag [cdkDragData]="field">
                                      <div
                                        class="field-preview-container p-4 bg-white border-2 border-solid border-gray-300 rounded-lg transition-all relative group hover:border-blue-400 hover:shadow-md"
                                        [class.border-blue-500]="isFieldSelected(field)"
                                        [class.shadow-md]="isFieldSelected(field)"
                                        [class.last:mb-0]="
                                          fieldIndex ===
                                          fieldsInSubColumn(row.rowId, columnIndex, subColumn.index)
                                            .length -
                                            1
                                        "
                                        (click)="onFieldClicked(field)"
                                        tabindex="0"
                                        role="listitem"
                                        [attr.aria-label]="field.label + ' field'"
                                      >
                                        <!-- Delete Button (Top Right) -->
                                        <button
                                          type="button"
                                          class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                          (click)="onDeleteFieldFromCard($event, field)"
                                          [attr.aria-label]="'Delete ' + field.label"
                                          title="Delete field"
                                        >
                                          <i
                                            class="pi pi-times text-red-500 hover:text-red-700"
                                          ></i>
                                        </button>

                                        <div
                                          class="field-preview-content cursor-pointer"
                                          (click)="onFieldPreviewClicked($event, field)"
                                        >
                                          <app-field-preview-renderer
                                            [field]="field"
                                            (labelChanged)="onLabelChanged(field, $event)"
                                            (settingsClick)="openSettingsModal(field)"
                                            (fieldUpdated)="onFieldUpdated(field.id, $event)"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                          } @else {
                            <!-- Parent column drop zone (no sub-columns) -->
                            <div
                              class="column-drop-zone theme-column-container"
                              [attr.data-row-id]="row.rowId"
                              [attr.data-column-index]="columnIndex"
                              [class.occupied]="
                                getFieldsInColumn(row.rowId, columnIndex).length > 0
                              "
                              cdkDropList
                              [cdkDropListData]="getParentColumnDropData(row.rowId, columnIndex)"
                              [cdkDropListEnterPredicate]="canDropIntoColumn"
                              (cdkDropListDropped)="onFieldDroppedInRow($event)"
                            >
                              @if (getFieldsInColumn(row.rowId, columnIndex); as columnFields) {
                                @if (columnFields.length > 0) {
                                  <!-- Occupied column: render fields vertically stacked -->
                                  <div class="column-fields-container">
                                    @for (
                                      field of columnFields;
                                      track field.id;
                                      let fieldIndex = $index
                                    ) {
                                      <!-- Field wrapper with drag support -->
                                      <div class="field-wrapper mb-3" cdkDrag [cdkDragData]="field">
                                        <div
                                          class="field-preview-container p-4 bg-white border-2 border-solid border-gray-300 rounded-lg transition-all relative group hover:border-blue-400 hover:shadow-md"
                                          [class.border-blue-500]="isFieldSelected(field)"
                                          [class.shadow-md]="isFieldSelected(field)"
                                          [class.last:mb-0]="fieldIndex === columnFields.length - 1"
                                          (click)="onFieldClicked(field)"
                                          tabindex="0"
                                          role="listitem"
                                          [attr.aria-label]="field.label + ' field'"
                                        >
                                          <!-- Delete Button (Top Right) -->
                                          <button
                                            type="button"
                                            class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            (click)="onDeleteFieldFromCard($event, field)"
                                            [attr.aria-label]="'Delete ' + field.label"
                                            title="Delete field"
                                          >
                                            <i
                                              class="pi pi-times text-red-500 hover:text-red-700"
                                            ></i>
                                          </button>

                                          <div
                                            class="field-preview-content cursor-pointer"
                                            (click)="onFieldPreviewClicked($event, field)"
                                          >
                                            <app-field-preview-renderer
                                              [field]="field"
                                              (labelChanged)="onLabelChanged(field, $event)"
                                              (settingsClick)="openSettingsModal(field)"
                                              (fieldUpdated)="onFieldUpdated(field.id, $event)"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    }
                                  </div>
                                } @else {
                                  <!-- Empty column: placeholder -->
                                  <div class="empty-column-placeholder">
                                    <i class="pi pi-inbox text-gray-300 text-2xl mb-2"></i>
                                    <span class="text-xs theme-help-text">Drop field here</span>
                                  </div>
                                }
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          } @else {
            <!-- Global column layout mode (existing functionality) -->
            <div
              cdkDropList
              #canvasDropList="cdkDropList"
              id="canvas-drop-list"
              [cdkDropListData]="formBuilderService.formFields()"
              (cdkDropListDropped)="onFieldDropped($event)"
              class="form-fields-grid theme-form-container-wrapper"
              [ngClass]="[getGridClass(), getSpacingClass()]"
              style="position: relative; z-index: 2;"
            >
              @for (field of formBuilderService.formFields(); track field.id; let i = $index) {
                <div
                  cdkDrag
                  [cdkDragData]="field"
                  [cdkDragDisabled]="field.type === FormFieldType.GROUP"
                  class="field-preview-container p-4 bg-white border-2 border-dashed rounded-lg transition-all relative group"
                  [class.border-blue-500]="isFieldSelected(field)"
                  [class.border-gray-300]="!isFieldSelected(field)"
                  [class.shadow-md]="isFieldSelected(field)"
                  [class.hover:border-blue-400]="!isFieldSelected(field)"
                  (click)="onFieldClicked(field)"
                  tabindex="0"
                  role="listitem"
                  [attr.aria-label]="field.label + ' field'"
                  (keydown)="handleKeyboard($event, field, i)"
                >
                  <!-- Drag Handle (Top Left) -->
                  @if (field.type !== FormFieldType.GROUP) {
                    <div
                      class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <i
                        class="pi pi-bars text-gray-400 cursor-move hover:text-gray-600 text-lg"
                        cdkDragHandle
                        aria-label="Reorder field"
                      ></i>
                    </div>
                  }

                  <!-- Delete Button (Top Right) -->
                  <button
                    type="button"
                    class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    (click)="onDeleteFieldFromCard($event, field)"
                    [attr.aria-label]="'Delete ' + field.label"
                    title="Delete field"
                  >
                    <i class="pi pi-times text-red-500 hover:text-red-700"></i>
                  </button>
                  @if (field.type === FormFieldType.GROUP) {
                    <!-- Group fields - no click handler to allow drop zone interaction -->
                    <div class="field-preview-content">
                      @let childFields = getChildFields(field.id);
                      <app-group-preview
                        [field]="field"
                        [childFields]="childFields"
                        [dropListId]="getGroupDropListId(field.id)"
                        (drop)="onGroupDrop($event, field)"
                      >
                        @for (child of childFields; track child.id; let childIndex = $index) {
                          <div
                            cdkDrag
                            [cdkDragData]="child"
                            class="field-preview-container p-4 bg-white border-2 border-dashed rounded-lg transition-all relative group mb-3"
                            [class.border-blue-500]="isFieldSelected(child)"
                            [class.border-gray-300]="!isFieldSelected(child)"
                            [class.shadow-md]="isFieldSelected(child)"
                            [class.hover:border-blue-400]="!isFieldSelected(child)"
                            (click)="onFieldClicked(child)"
                            tabindex="0"
                            role="listitem"
                            [attr.aria-label]="child.label + ' field'"
                            (keydown)="handleGroupKeyboard($event, child, field.id, childIndex)"
                          >
                            <!-- Drag Handle (Top Left) -->
                            <div
                              class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              <i
                                class="pi pi-bars text-gray-400 cursor-move hover:text-gray-600 text-lg"
                                cdkDragHandle
                                aria-label="Reorder field"
                              ></i>
                            </div>

                            <!-- Delete Button (Top Right) -->
                            <button
                              type="button"
                              class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              (click)="onDeleteFieldFromCard($event, child)"
                              [attr.aria-label]="'Delete ' + child.label"
                              title="Delete field"
                            >
                              <i class="pi pi-times text-red-500 hover:text-red-700"></i>
                            </button>
                            <div
                              class="field-preview-content group cursor-pointer"
                              (click)="onFieldPreviewClicked($event, child)"
                            >
                              <app-field-preview-renderer
                                [field]="child"
                                (labelChanged)="onLabelChanged(child, $event)"
                                (settingsClick)="openSettingsModal(child)"
                                (fieldUpdated)="onFieldUpdated(child.id, $event)"
                              />
                            </div>

                            <div *cdkDragPlaceholder class="field-placeholder"></div>
                          </div>
                        }
                      </app-group-preview>
                    </div>
                  } @else {
                    <div
                      class="field-preview-content group cursor-pointer"
                      (click)="onFieldPreviewClicked($event, field)"
                    >
                      <app-field-preview-renderer
                        [field]="field"
                        (labelChanged)="onLabelChanged(field, $event)"
                        (settingsClick)="openSettingsModal(field)"
                        (fieldUpdated)="onFieldUpdated(field.id, $event)"
                      />
                    </div>
                  }
                </div>
              }

              <div *cdkDragPlaceholder class="field-placeholder"></div>
            </div>
          }
        </div>
      }

      <!-- Field Settings Modal removed - now handled by parent UnifiedFieldEditorModal (Story 16.8) -->

      <!-- View Toggle Tabs (Preview / JSON) -->
      <div class="view-toggle-container absolute bottom-4 right-4 z-10">
        <div class="flex gap-1 bg-white rounded shadow-sm border border-gray-200 p-0.5">
          <button
            type="button"
            class="px-2 py-1 rounded text-xs font-medium transition-colors"
            [class.bg-blue-500]="viewMode() === 'preview'"
            [class.text-white]="viewMode() === 'preview'"
            [class.text-gray-700]="viewMode() !== 'preview'"
            [class.hover:bg-gray-100]="viewMode() !== 'preview'"
            (click)="setViewMode('preview')"
          >
            <i class="pi pi-eye mr-1 text-xs"></i>
            Preview
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded text-xs font-medium transition-colors"
            [class.bg-blue-500]="viewMode() === 'json'"
            [class.text-white]="viewMode() === 'json'"
            [class.text-gray-700]="viewMode() !== 'json'"
            [class.hover:bg-gray-100]="viewMode() !== 'json'"
            (click)="setViewMode('json')"
          >
            <i class="pi pi-code mr-1 text-xs"></i>
            JSON
          </button>
        </div>
      </div>

      <!-- JSON View Container -->
      @if (viewMode() === 'json') {
        <div class="json-view-overlay absolute inset-0 bg-gray-900 bg-opacity-95 z-[5] p-6 overflow-auto">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-white text-lg font-semibold">Form Schema (JSON)</h3>
              <button
                type="button"
                class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                (click)="copyJsonToClipboard()"
              >
                <i class="pi pi-copy mr-2"></i>
                Copy
              </button>
            </div>
            <pre class="bg-gray-800 rounded-lg p-4 overflow-x-auto">
              <code [innerHTML]="formattedJson()"></code>
            </pre>
          </div>
        </div>
      }
    </div>
  `,
})
export class FormCanvasComponent {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly themePreviewService = inject(ThemePreviewService);
  private readonly formsApiService = inject(FormsApiService);
  private readonly messageService = inject(MessageService);
  protected readonly FormFieldType = FormFieldType;

  // View mode signal for toggling between preview and JSON view
  protected readonly viewMode = signal<'preview' | 'json'>('preview');

  private _settings = signal<FormSettings>({
    title: 'Untitled Form',
    description: '',
    columnLayout: 1,
    fieldSpacing: 'normal',
    successMessage: 'Thank you for your submission!',
    redirectUrl: '',
    allowMultipleSubmissions: true,
  });

  @Input()
  set settings(value: FormSettings) {
    this._settings.set(value);
  }
  get settings(): FormSettings {
    return this._settings();
  }

  @Output() fieldClicked = new EventEmitter<FormField>();

  constructor() {
    // Watch for theme changes and apply theme in real-time
    effect(() => {
      const themeId = this.formBuilderService.currentForm()?.schema?.settings?.themeId;

      if (themeId) {
        this.loadAndApplyTheme(themeId);
      } else {
        // No theme selected - clear theme CSS to use defaults
        this.themePreviewService.clearThemeCss();
      }
    });
  }

  // Step form computed signals
  protected readonly stepFormEnabled = this.formBuilderService.stepFormEnabled;
  protected readonly steps = this.formBuilderService.steps;
  protected readonly activeStepId = this.formBuilderService.activeStepId;
  protected readonly activeStep = this.formBuilderService.activeStep;
  protected readonly activeStepOrder = this.formBuilderService.activeStepOrder;

  /**
   * Computed signal: Visible fields filtered by active step
   * Returns all fields when step mode is disabled, or only fields for active step when enabled
   */
  public readonly visibleFields = computed(() => {
    if (!this.stepFormEnabled()) {
      return this.formBuilderService.formFields();
    }
    const activeId = this.activeStepId();
    if (!activeId) return [];
    return this.formBuilderService
      .formFields()
      .filter((field) => field.position?.stepId === activeId);
  });

  /**
   * Computed signal: Visible rows filtered by active step
   * Returns all rows when step mode is disabled, or only rows for active step when enabled
   */
  public readonly visibleRows = computed(() => {
    const rows = this.formBuilderService.rowConfigs();
    if (!this.stepFormEnabled()) {
      return rows;
    }
    const activeId = this.activeStepId();
    if (!activeId) return [];
    return rows.filter((row) => row.stepId === activeId);
  });

  /**
   * Computed signal: Formatted and syntax-highlighted JSON for the form schema.
   * Generates colorized HTML representation of the current form structure.
   */
  protected readonly formattedJson = computed(() => {
    const currentForm = this.formBuilderService.currentForm();
    if (!currentForm?.schema) {
      return this.sanitizer.bypassSecurityTrustHtml(
        '<span style="color: #999;">No form schema available</span>',
      );
    }

    // Build complete schema object for JSON display
    const schemaForDisplay = {
      formId: currentForm.id,
      title: this.settings.title || 'Untitled Form',
      description: this.settings.description || '',
      fields: currentForm.schema.fields || [],
      settings: currentForm.schema.settings || {},
      rowLayout: this.formBuilderService.rowLayoutEnabled()
        ? {
            enabled: true,
            rows: this.formBuilderService.rowConfigs(),
          }
        : undefined,
      steps: this.stepFormEnabled() ? this.formBuilderService.steps() : undefined,
    };

    // Format as pretty JSON
    const jsonString = JSON.stringify(schemaForDisplay, null, 2);

    // Apply syntax highlighting
    const highlighted = this.syntaxHighlightJson(jsonString);

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  });

  /**
   * Switch between preview and JSON view modes.
   * @param mode - The view mode to activate ('preview' or 'json')
   */
  protected setViewMode(mode: 'preview' | 'json'): void {
    this.viewMode.set(mode);
  }

  /**
   * Copy the formatted JSON to clipboard and show toast notification.
   */
  protected async copyJsonToClipboard(): Promise<void> {
    try {
      const currentForm = this.formBuilderService.currentForm();
      if (!currentForm?.schema) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Schema',
          detail: 'No form schema available to copy',
        });
        return;
      }

      // Build complete schema object for clipboard
      const schemaForClipboard = {
        formId: currentForm.id,
        title: this.settings.title || 'Untitled Form',
        description: this.settings.description || '',
        fields: currentForm.schema.fields || [],
        settings: currentForm.schema.settings || {},
        rowLayout: this.formBuilderService.rowLayoutEnabled()
          ? {
              enabled: true,
              rows: this.formBuilderService.rowConfigs(),
            }
          : undefined,
        steps: this.stepFormEnabled() ? this.formBuilderService.steps() : undefined,
      };

      // Format as pretty JSON
      const jsonString = JSON.stringify(schemaForClipboard, null, 2);

      // Use Clipboard API to copy
      await navigator.clipboard.writeText(jsonString);

      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Form schema copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy JSON to clipboard:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Failed to copy JSON to clipboard',
      });
    }
  }

  /**
   * Apply syntax highlighting to JSON string.
   * Returns HTML string with color-coded spans for different token types.
   * @param json - The JSON string to highlight
   * @returns HTML string with syntax highlighting
   */
  private syntaxHighlightJson(json: string): string {
    // Replace tokens with colored spans
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = 'number'; // Default color for numbers
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'key'; // JSON object keys
            } else {
              cls = 'string'; // JSON string values
            }
          } else if (/true|false/.test(match)) {
            cls = 'boolean'; // Booleans
          } else if (/null/.test(match)) {
            cls = 'null'; // Null values
          }
          return `<span class="json-${cls}">${match}</span>`;
        },
      );
  }

  /**
   * Check if background image exists with URL (from settings)
   */
  protected readonly hasBackgroundImage = computed(() => {
    const s = this._settings();
    return (
      s.backgroundType === 'image' &&
      s.backgroundImageUrl !== undefined &&
      s.backgroundImageUrl !== ''
    );
  });

  /**
   * Check if custom background exists with HTML/CSS (from settings)
   */
  protected readonly hasCustomBackground = computed(() => {
    const s = this._settings();
    return (
      s.backgroundType === 'custom' &&
      (s.backgroundCustomHtml !== undefined || s.backgroundCustomCss !== undefined)
    );
  });

  /**
   * Computed signal: Fields grouped by sub-column position for O(1) lookup.
   * Map key format: "${rowId}-${columnIndex}-${subColumnIndex}"
   * Performance optimization to avoid filtering on every render.
   */
  protected readonly fieldsBySubColumn = computed(() => {
    const map = new Map<string, FormField[]>();

    this.formBuilderService.formFields().forEach((field) => {
      if (
        field.position?.rowId &&
        field.position?.columnIndex !== undefined &&
        field.position?.subColumnIndex !== undefined
      ) {
        const key = `${field.position.rowId}-${field.position.columnIndex}-${field.position.subColumnIndex}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(field);
      }
    });

    // Sort fields within each sub-column by orderInColumn
    map.forEach((fields) => {
      fields.sort((a, b) => {
        const orderA = a.position?.orderInColumn ?? 0;
        const orderB = b.position?.orderInColumn ?? 0;
        return orderA - orderB;
      });
    });

    return map;
  });

  /**
   * Handles drop events on the canvas.
   * Either adds a new field from the palette or reorders existing fields.
   * @param event - The CdkDragDrop event containing drag-drop metadata
   */
  onFieldDropped(event: CdkDragDrop<FormField[]>): void {
    const data = event.item.data;

    if (this.isFieldTypeDefinition(data)) {
      this.formBuilderService.addFieldFromType(data.type, event.currentIndex);
      return;
    }

    const field = data as FormField;

    if (event.previousContainer === event.container) {
      this.formBuilderService.reorderFields(event.previousIndex, event.currentIndex);
      return;
    }

    const previousContainerId = event.previousContainer.id;
    if (previousContainerId.startsWith('group-drop-')) {
      this.formBuilderService.assignFieldToGroup(field.id, null, event.currentIndex);
    } else {
      this.formBuilderService.reorderFields(event.previousIndex, event.currentIndex);
    }
  }

  /**
   * Handles drop interactions within a group container.
   * Supports adding new fields, moving fields between groups, and reordering children.
   */
  onGroupDrop(event: CdkDragDrop<FormField[]>, group: FormField): void {
    const data = event.item.data;
    const groupId = group.id;

    if (this.isFieldTypeDefinition(data)) {
      const newField = this.formBuilderService.addFieldFromType(data.type);
      this.formBuilderService.assignFieldToGroup(newField.id, groupId, event.currentIndex);
      return;
    }

    const field = data as FormField;
    this.formBuilderService.assignFieldToGroup(field.id, groupId, event.currentIndex);
  }

  /**
   * Keyboard interactions for fields within a group container.
   * Supports Enter/Space (select), ArrowUp/ArrowDown (reorder within group).
   * Note: Delete/Backspace functionality has been disabled to prevent accidental deletion.
   */
  handleGroupKeyboard(
    event: KeyboardEvent,
    field: FormField,
    groupId: string,
    index: number,
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        // Don't handle space/enter if user is typing in an input field
        if (this.isUserTyping(event)) {
          return;
        }
        event.preventDefault();
        this.onFieldClicked(field);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          this.formBuilderService.assignFieldToGroup(field.id, groupId, index - 1);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.formBuilderService.assignFieldToGroup(field.id, groupId, index + 1);
        break;
      // Backspace/Delete functionality disabled to prevent accidental field deletion
      // Users can still delete fields using the delete button or settings modal
      // case 'Delete':
      // case 'Backspace':
      //   if (!this.isUserTyping(event)) {
      //     event.preventDefault();
      //     this.formBuilderService.removeField(field.id);
      //   }
      //   break;
    }
  }

  /**
   * Retrieves child fields for a group.
   */
  getChildFields(groupId: string): FormField[] {
    return this.formBuilderService.getChildFields(groupId);
  }

  /**
   * Provides drop list IDs connected to the canvas drop zone.
   */
  getConnectedDropListsForCanvas(): string[] {
    return ['palette-drop-list', ...this.getAllGroupDropListIds()];
  }

  /**
   * Provides drop list IDs connected to a specific group.
   */
  getConnectedDropLists(groupId: string): string[] {
    return ['palette-drop-list', 'canvas-drop-list', ...this.getAllGroupDropListIds(groupId)];
  }

  /**
   * Generates the drop list ID for a group container.
   */
  getGroupDropListId(groupId: string): string {
    return `group-drop-${groupId}`;
  }

  protected getAllGroupDropListIds(excludeGroupId?: string): string[] {
    return this.formBuilderService
      .getAllFields()
      .filter((field) => field.type === FormFieldType.GROUP)
      .map((field) => this.getGroupDropListId(field.id))
      .filter((id) => !excludeGroupId || id !== this.getGroupDropListId(excludeGroupId));
  }

  private isFieldTypeDefinition(data: unknown): data is FieldTypeDefinition {
    return (
      !!data &&
      typeof data === 'object' &&
      'type' in (data as Record<string, unknown>) &&
      !('id' in (data as Record<string, unknown>))
    );
  }

  /**
   * Handles field selection when a user clicks on a field card.
   * Selects the field in the service and emits the fieldClicked event.
   * @param field - The FormField that was clicked
   */
  onFieldClicked(field: FormField): void {
    this.formBuilderService.selectField(field);
    this.fieldClicked.emit(field);
  }

  /**
   * Checks if a field is currently selected.
   * @param field - The FormField to check
   * @returns true if the field is selected, false otherwise
   */
  isFieldSelected(field: FormField): boolean {
    const selected = this.formBuilderService.selectedField();
    return selected?.id === field.id;
  }

  /**
   * Handles keyboard navigation and actions on fields.
   * Supports Enter/Space (select), ArrowUp/ArrowDown (reorder).
   * Note: Delete/Backspace functionality has been disabled to prevent accidental deletion.
   * @param event - The keyboard event
   * @param field - The FormField being interacted with
   * @param index - The index of the field in the fields array
   */
  handleKeyboard(event: KeyboardEvent, field: FormField, index: number): void {
    const fields = this.formBuilderService.formFields();

    switch (event.key) {
      case 'Enter':
      case ' ':
        // Don't handle space/enter if user is typing in an input field
        if (this.isUserTyping(event)) {
          return;
        }
        event.preventDefault();
        this.onFieldClicked(field);
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          this.formBuilderService.reorderFields(index, index - 1);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (index < fields.length - 1) {
          this.formBuilderService.reorderFields(index, index + 1);
        }
        break;

      // Backspace/Delete functionality disabled to prevent accidental field deletion
      // Users can still delete fields using the delete button or settings modal
      // case 'Delete':
      // case 'Backspace':
      //   if (!this.isUserTyping(event)) {
      //     event.preventDefault();
      //     this.formBuilderService.removeField(field.id);
      //   }
      //   break;
    }
  }

  /**
   * Gets the PrimeNG icon class for a given field type.
   * @param type - The field type string (e.g., 'text', 'email', 'number')
   * @returns The PrimeNG icon class name (e.g., 'pi-pencil')
   */
  getFieldIcon(type: string): string {
    const iconMap: Record<string, string> = {
      text: 'pi-pencil',
      email: 'pi-envelope',
      number: 'pi-hashtag',
      select: 'pi-list',
      textarea: 'pi-align-left',
      file: 'pi-upload',
      checkbox: 'pi-check-square',
      radio: 'pi-circle',
      date: 'pi-calendar',
      datetime: 'pi-clock',
      toggle: 'pi-toggle-on',
      divider: 'pi-minus',
    };
    return iconMap[type] || 'pi-question';
  }

  /**
   * Gets the CSS grid class based on column layout.
   * @returns The grid class name for the current column layout
   */
  getGridClass(): string {
    return `grid-cols-${this.settings.columnLayout}`;
  }

  /**
   * Maps the spacing setting to a CSS class for grid gap control.
   */
  getSpacingClass(): string {
    switch (this.settings.fieldSpacing) {
      case 'compact':
        return 'spacing-compact';
      case 'relaxed':
        return 'spacing-relaxed';
      default:
        return 'spacing-normal';
    }
  }

  /**
   * Generates CSS Grid template columns string for a row.
   * Uses custom columnWidths if defined, otherwise falls back to equal-width columns.
   *
   * @param row - Row configuration object
   * @returns CSS grid-template-columns value (e.g., "1fr 3fr" or "repeat(2, 1fr)")
   *
   * @example
   * // Row with custom widths
   * getColumnGridTemplate({ columnCount: 2, columnWidths: ['1fr', '3fr'] })
   * // Returns: "1fr 3fr"
   *
   * // Row without custom widths (equal width fallback)
   * getColumnGridTemplate({ columnCount: 3 })
   * // Returns: "repeat(3, 1fr)"
   */
  getColumnGridTemplate(row: { columnCount: number; columnWidths?: string[] }): string {
    if (row.columnWidths && row.columnWidths.length === row.columnCount) {
      return row.columnWidths.join(' '); // Custom widths: "1fr 3fr"
    }
    return `repeat(${row.columnCount}, 1fr)`; // Equal width fallback
  }

  /**
   * Handles label changes from the inline label editor.
   * Updates the field's label property and auto-generates fieldName in the service.
   * @param field - The field being edited
   * @param newLabel - The new label value
   */
  onLabelChanged(field: FormField, newLabel: string): void {
    // Auto-generate fieldName from label (kebab-case)
    const generatedFieldName = this.generateFieldNameFromLabel(newLabel);

    // Update both label and fieldName
    this.formBuilderService.updateFieldProperties(field.id, {
      label: newLabel,
      fieldName: generatedFieldName,
    });
  }

  /**
   * Generates a kebab-case field name from a label.
   * @param label - The label to convert
   * @returns Kebab-case field name
   */
  private generateFieldNameFromLabel(label: string): string {
    return label
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Opens the unified field editor modal for a specific field.
   * Story 16.8: Simplified to emit fieldClicked event instead of managing separate modal.
   * Parent FormBuilderComponent handles the unified modal.
   * @param field - The field to edit settings for
   */
  openSettingsModal(field: FormField): void {
    this.formBuilderService.selectField(field);
    this.fieldClicked.emit(field);
  }

  /**
   * Handles field deletion from the card delete button.
   * Shows confirmation and removes the field.
   * @param event - The click event
   * @param field - The field to delete
   */
  onDeleteFieldFromCard(event: MouseEvent, field: FormField): void {
    event.stopPropagation();
    if (
      confirm(`Are you sure you want to delete "${field.label}"? This action cannot be undone.`)
    ) {
      this.formBuilderService.removeField(field.id);
    }
  }

  /**
   * Handles field updates from the field preview renderer (e.g., option changes).
   * @param fieldId - The ID of the field being updated
   * @param updates - Partial field object with updated properties
   */
  onFieldUpdated(fieldId: string, updates: Partial<FormField>): void {
    this.formBuilderService.updateFieldProperties(fieldId, updates);
  }

  /**
   * Handles clicks on the field preview area.
   * Opens the settings modal for the field.
   * @param event - The click event
   * @param field - The field being clicked
   */
  onFieldPreviewClicked(event: MouseEvent, field: FormField): void {
    // Check if the click target is an interactive element (input, button, etc.)
    const target = event.target as HTMLElement;
    const isInteractive =
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('p-button') ||
      target.closest('.pi-bars') ||
      target.closest('.inline-option-manager');

    // Only open modal if not clicking on interactive elements
    if (!isInteractive) {
      event.stopPropagation();
      this.openSettingsModal(field);
    } else {
      // For interactive elements, just stop propagation to prevent field selection
      event.stopPropagation();
    }
  }

  /**
   * Checks if the user is currently typing in an input field, textarea, or other editable element.
   * Used to prevent keyboard shortcuts from interfering with typing.
   * @param event - The keyboard event to check
   * @returns True if user is typing in an editable element, false otherwise
   */
  private isUserTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;

    // Check if target is an editable element
    const isEditable =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest('input') !== null ||
      target.closest('textarea') !== null ||
      target.closest('select') !== null ||
      target.closest('[contenteditable="true"]') !== null;

    return isEditable;
  }

  /**
   * Get background image CSS url() value (from settings)
   * @returns CSS url() string or 'none'
   */
  getBackgroundImageStyle(): string {
    const s = this._settings();
    if (s.backgroundType !== 'image' || !s.backgroundImageUrl) {
      return 'none';
    }
    return `url(${s.backgroundImageUrl})`;
  }

  /**
   * Get background styles object for canvas (from settings)
   * @returns Object with CSS style properties
   */
  getBackgroundStyles(): Record<string, string> {
    const s = this._settings();
    if (s.backgroundType !== 'image' || !s.backgroundImageUrl) {
      return {};
    }

    const styles: Record<string, string> = {
      'background-image': `url(${s.backgroundImageUrl})`,
      'background-size': s.backgroundImagePosition ?? 'cover',
      'background-position': s.backgroundImageAlignment ?? 'center',
      'background-repeat': s.backgroundImagePosition === 'repeat' ? 'repeat' : 'no-repeat',
    };

    // Apply blur filter if specified
    if (s.backgroundImageBlur !== undefined && s.backgroundImageBlur > 0) {
      styles['filter'] = `blur(${s.backgroundImageBlur}px)`;
    }

    return styles;
  }

  /**
   * Get opacity value for background overlay (from settings)
   * @returns Opacity value as CSS decimal (0-1)
   */
  getBackgroundOpacity(): number {
    const s = this._settings();
    return s.backgroundImageOpacity !== undefined ? s.backgroundImageOpacity / 100 : 1;
  }

  /**
   * Check if background overlay should be shown (when opacity < 100%, from settings)
   * @returns True if overlay should be displayed
   */
  shouldShowBackgroundOverlay(): boolean {
    const s = this._settings();
    return (
      s.backgroundType === 'image' &&
      s.backgroundImageUrl !== undefined &&
      s.backgroundImageOpacity !== undefined &&
      s.backgroundImageOpacity < 100
    );
  }

  /**
   * Generates sandboxed iframe HTML for custom background preview (from settings)
   * Implements defense-in-depth security: sanitizes HTML, validates CSS, and uses restrictive sandbox
   * @returns SafeHtml for iframe srcdoc attribute
   */
  protected getSandboxedPreviewHTML(): SafeHtml {
    const s = this._settings();
    // Return empty if no custom background in settings
    if (s.backgroundType !== 'custom' || (!s.backgroundCustomHtml && !s.backgroundCustomCss)) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Sanitize HTML (already sanitized in settings dialog, but defense-in-depth)
    const sanitizedHTML = sanitizeCustomBackground(s.backgroundCustomHtml || '');

    // Validate and clean CSS
    const validatedCSS = this.validateAndCleanCSS(s.backgroundCustomCss || '');

    // Build iframe content with HTML5 DOCTYPE
    const iframeContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset default styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
    }
    /* User custom CSS */
    ${validatedCSS}
  </style>
</head>
<body>
  ${sanitizedHTML}
</body>
</html>`;

    // Bypass Angular's sanitization for srcdoc (safe because we've already sanitized)
    return this.sanitizer.bypassSecurityTrustHtml(iframeContent);
  }

  /**
   * Validates CSS and strips dangerous patterns
   * @param css - CSS code to validate
   * @returns Safe CSS code
   */
  private validateAndCleanCSS(css: string): string {
    if (!css || css.trim() === '') {
      return '';
    }

    // Validate CSS for dangerous patterns
    const validation = validateCSS(css);

    // If CSS has critical errors, return empty string
    if (!validation.isValid) {
      console.warn('Custom background CSS validation errors:', validation.errors);
      return '';
    }

    // Strip any dangerous patterns (defense-in-depth)
    return stripDangerousCSS(css);
  }

  /**
   * Get array of column indices for rendering columns in row layout
   * @param columnCount - Number of columns in the row
   * @returns Array of column indices [0, 1, 2, ...]
   */
  getColumnIndices(columnCount: number): number[] {
    return Array.from({ length: columnCount }, (_, i) => i);
  }

  /**
   * Get field at specific row-column position (legacy method for backward compatibility)
   * @param rowId - Row ID to search in
   * @param columnIndex - Column index within the row
   * @returns FormField if found, null otherwise
   * @deprecated Use getFieldsInColumn instead for multi-field column support
   */
  getFieldAtPosition(rowId: string, columnIndex: number): FormField | null {
    const fields = this.formBuilderService.getFieldsInColumn(rowId, columnIndex);
    return fields.length > 0 ? fields[0] : null;
  }

  /**
   * Get all fields in a specific column, sorted by orderInColumn.
   * @param rowId - Row ID to search in
   * @param columnIndex - Column index within the row
   * @returns Array of FormField objects in the column, sorted by orderInColumn
   */
  getFieldsInColumn(rowId: string, columnIndex: number): FormField[] {
    return this.formBuilderService.getFieldsInColumn(rowId, columnIndex);
  }

  /**
   * Check if a column has sub-columns configured.
   * Story 27.5: Sub-Column Drag-Drop Support
   * @param rowId - Row identifier
   * @param columnIndex - Column index to check
   * @returns True if sub-columns are configured for this column
   */
  protected hasSubColumns(rowId: string, columnIndex: number): boolean {
    const key = `${rowId}-${columnIndex}`;
    return this.formBuilderService.subColumnsByRowColumn().has(key);
  }

  /**
   * Get drop data for sub-column drop zone.
   * Story 27.5: Type-safe helper for sub-column drop data
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @param subColumnIndex - Sub-column index
   * @returns Drop data with correct typing
   */
  protected getSubColumnDropData(
    rowId: string,
    columnIndex: number,
    subColumnIndex: number,
  ): { rowId: string; columnIndex: number; subColumnIndex?: number } {
    return { rowId, columnIndex, subColumnIndex };
  }

  /**
   * Get drop data for parent column drop zone.
   * Story 27.5: Type-safe helper for parent column drop data
   * @param rowId - Row identifier
   * @param columnIndex - Column index
   * @returns Drop data with correct typing
   */
  protected getParentColumnDropData(
    rowId: string,
    columnIndex: number,
  ): { rowId: string; columnIndex: number; subColumnIndex?: number } {
    return { rowId, columnIndex, subColumnIndex: undefined };
  }

  /**
   * Get array of sub-column indices for rendering.
   * Story 27.5: Sub-Column Drag-Drop Support
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @returns Array of sub-column indices [{index: 0}, {index: 1}, ...]
   */
  protected subColumnsForColumn(rowId: string, columnIndex: number): { index: number }[] {
    const key = `${rowId}-${columnIndex}`;
    const config = this.formBuilderService.subColumnsByRowColumn().get(key);
    if (!config) return [];
    return Array.from({ length: config.subColumnCount }, (_, i) => ({ index: i }));
  }

  /**
   * Get CSS grid-template-columns value for sub-columns.
   * Story 27.5: Sub-Column Drag-Drop Support
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @returns CSS grid-template-columns string (e.g., "1fr 2fr" or "repeat(2, 1fr)")
   */
  protected getSubColumnWidths(rowId: string, columnIndex: number): string {
    const key = `${rowId}-${columnIndex}`;
    const config = this.formBuilderService.subColumnsByRowColumn().get(key);
    if (!config) return '1fr';

    // Use custom widths if defined, otherwise equal-width fallback
    if (config.subColumnWidths && config.subColumnWidths.length === config.subColumnCount) {
      return config.subColumnWidths.join(' ');
    }
    return `repeat(${config.subColumnCount}, 1fr)`;
  }

  /**
   * Get all fields in a specific sub-column, sorted by orderInColumn.
   * Story 27.5: Sub-Column Drag-Drop Support
   * Performance optimized using computed signal for O(1) lookup instead of O(n) filtering.
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @param subColumnIndex - Sub-column index within parent column
   * @returns Array of fields in the sub-column (already sorted by orderInColumn)
   */
  public fieldsInSubColumn(
    rowId: string,
    columnIndex: number,
    subColumnIndex: number,
  ): FormField[] {
    const key = `${rowId}-${columnIndex}-${subColumnIndex}`;
    return this.fieldsBySubColumn().get(key) ?? [];
  }

  /**
   * Check if a sub-column is empty (has no fields).
   * Story 27.5: Sub-Column Drag-Drop Support
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @param subColumnIndex - Sub-column index
   * @returns True if sub-column has no fields
   */
  protected isSubColumnEmpty(rowId: string, columnIndex: number, subColumnIndex: number): boolean {
    return this.fieldsInSubColumn(rowId, columnIndex, subColumnIndex).length === 0;
  }

  /**
   * Can drop predicate for row-column drop zones.
   * With multi-field column support, all drops are now allowed (no more "occupied" restriction).
   * @param _drag - The CDK dragged item
   * @param _drop - The CDK drop list target
   * @returns Always returns true (all drops allowed)
   */
  canDropIntoColumn = (_drag: CdkDrag, _drop: CdkDropList): boolean => {
    // Multi-field column support: allow drops into any column
    return true;
  };

  /**
   * Handle field dropped into row-column or sub-column position.
   * Creates new field from palette or moves existing field to new position.
   * Calculates orderInColumn based on drop index within column or sub-column.
   * Assigns stepId to field when step mode is enabled.
   * Story 27.5: Extended to support sub-column positioning via subColumnIndex
   * @param event - The CdkDragDrop event with row-column-subColumn position data
   */
  onFieldDroppedInRow(
    event: CdkDragDrop<{ rowId: string; columnIndex: number; subColumnIndex?: number }>,
  ): void {
    // Runtime validation of drop data structure (Story 27.5 - REL-001)
    const dropData = event.container.data;
    if (
      !dropData ||
      typeof dropData !== 'object' ||
      typeof dropData.rowId !== 'string' ||
      typeof dropData.columnIndex !== 'number'
    ) {
      console.error('Invalid drop data structure:', dropData);
      this.showErrorToast('Invalid drop position. Please try again.');
      return;
    }

    const validatedDropData = dropData as {
      rowId: string;
      columnIndex: number;
      subColumnIndex?: number;
    };
    const dragData = event.item.data;

    // Get fields in target column or sub-column
    let targetFields: FormField[];
    if (validatedDropData.subColumnIndex !== undefined) {
      // Dropping into sub-column: filter by subColumnIndex
      targetFields = this.fieldsInSubColumn(
        validatedDropData.rowId,
        validatedDropData.columnIndex,
        validatedDropData.subColumnIndex,
      );
    } else {
      // Dropping into parent column: filter out fields with subColumnIndex
      targetFields = this.getFieldsInColumn(
        validatedDropData.rowId,
        validatedDropData.columnIndex,
      ).filter((f) => f.position?.subColumnIndex === undefined);
    }

    // Calculate orderInColumn based on drop index (defaults to end of column/sub-column)
    const orderInColumn = event.currentIndex ?? targetFields.length;

    // Check if dragging field type from palette (create new field)
    if (this.isFieldTypeDefinition(dragData)) {
      this.createFieldAtPosition(dragData.type, {
        rowId: validatedDropData.rowId,
        columnIndex: validatedDropData.columnIndex,
        subColumnIndex: validatedDropData.subColumnIndex,
        orderInColumn,
      });
      return;
    }

    // Dragging existing field (reorder or move)
    const field = dragData as FormField;

    // Prevent moving fields between steps
    if (this.stepFormEnabled() && field.position?.stepId) {
      const targetStepId = this.activeStepId();
      if (field.position.stepId !== targetStepId) {
        this.showErrorToast(
          'Cannot move fields between steps. Create a new field in the target step instead.',
        );
        return;
      }
    }

    const position: FieldPosition = {
      rowId: validatedDropData.rowId,
      columnIndex: validatedDropData.columnIndex,
      subColumnIndex: validatedDropData.subColumnIndex, // Includes undefined for parent column drops
      orderInColumn,
      stepId: this.stepFormEnabled() ? this.activeStepId() || undefined : undefined,
    };

    // Check if trying to drop in same position (no-op)
    if (
      field.position?.rowId === position.rowId &&
      field.position?.columnIndex === position.columnIndex &&
      field.position?.subColumnIndex === position.subColumnIndex &&
      field.position?.orderInColumn === orderInColumn
    ) {
      return;
    }

    // Update field position
    this.formBuilderService.setFieldPosition(field.id, position);
  }

  /**
   * Create new field at specific row-column or sub-column position.
   * Called when dropping field type from palette into row-column or sub-column zone.
   * Assigns stepId when step mode is enabled.
   * Story 27.5: Extended to support sub-column positioning
   * @param type - The field type to create
   * @param position - The row-column-subColumn position with orderInColumn
   */
  private createFieldAtPosition(
    type: FormFieldType,
    position: {
      rowId: string;
      columnIndex: number;
      subColumnIndex?: number;
      orderInColumn?: number;
    },
  ): void {
    // Create field using service (auto-generates ID and defaults)
    const newField = this.formBuilderService.addFieldFromType(type);

    // Set position after creation (includes orderInColumn, subColumnIndex, and stepId)
    this.formBuilderService.setFieldPosition(newField.id, {
      rowId: position.rowId,
      columnIndex: position.columnIndex,
      subColumnIndex: position.subColumnIndex, // Undefined for parent column drops
      orderInColumn: position.orderInColumn ?? 0,
      stepId: this.stepFormEnabled() ? this.activeStepId() || undefined : undefined,
    });
  }

  /**
   * Show error toast notification.
   * TODO: Integrate with MessageService (injected from FormBuilderComponent)
   * @param message - Error message to display
   */
  private showErrorToast(message: string): void {
    // Temporary console.error until MessageService integration
    console.error(message);
    // Future: Use MessageService to show toast
    // this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  /**
   * Handle step tab click to switch active step
   * @param stepId - ID of the step to activate
   */
  onStepTabClick(stepId: string): void {
    this.formBuilderService.setActiveStep(stepId);
  }

  /**
   * Get step order by step ID for displaying step badges
   * @param stepId - ID of the step
   * @returns Step order (0-based) or 0 if not found
   */
  getStepOrder(stepId: string): number {
    const step = this.steps().find((s) => s.id === stepId);
    return step?.order ?? 0;
  }

  /**
   * Check if field can be dropped into target (step validation)
   * Prevents dragging fields between steps
   * @param drag - The CDK dragged item
   * @param _drop - The CDK drop list target
   * @returns True if drop is allowed
   */
  canDropField = (drag: CdkDrag, _drop: CdkDropList): boolean => {
    const draggedField = drag.data as FormField;

    // Allow drop from palette (new fields have no stepId yet)
    if (!draggedField.position?.stepId) {
      return true;
    }

    const targetStepId = this.activeStepId();

    // Prevent drop if different step
    if (draggedField.position.stepId !== targetStepId) {
      return false;
    }

    return true;
  };

  /**
   * Loads theme from API and applies CSS variables to canvas.
   * Called by effect() when themeId changes.
   * @param themeId - The ID of the theme to load
   * @private
   */
  private loadAndApplyTheme(themeId: string): void {
    this.formsApiService.getTheme(themeId).subscribe({
      next: (theme: FormTheme) => {
        this.themePreviewService.applyThemeCss(theme);
      },
      error: (err: Error) => {
        console.warn('Failed to load theme for canvas, using defaults', err);
        this.themePreviewService.clearThemeCss();
      },
    });
  }
}
