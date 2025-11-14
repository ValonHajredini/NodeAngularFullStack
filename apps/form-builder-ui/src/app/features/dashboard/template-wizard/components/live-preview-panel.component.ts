import { Component, ChangeDetectionStrategy, computed, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Card } from 'primeng/card';
import { FormSchema } from '@nodeangularfullstack/shared';
import { TemplateWizardService } from '../services/template-wizard.service';

/**
 * Live Preview Panel Component
 * Displays generated schema preview (JSON + UI snapshot) by subscribing to service signals.
 * Uses OnPush change detection and responsive layout for side-by-side viewing.
 *
 * @since Epic 30, Story 30.10
 *
 * @example
 * ```html
 * <app-live-preview-panel></app-live-preview-panel>
 * ```
 */
@Component({
  selector: 'app-live-preview-panel',
  standalone: true,
  imports: [CommonModule, Tabs, TabList, Tab, TabPanels, TabPanel, Card],
  templateUrl: './live-preview-panel.component.html',
  styleUrl: './live-preview-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LivePreviewPanelComponent {
  /**
   * Inject TemplateWizardService for preview schema
   * @private
   */
  private readonly wizardService = inject(TemplateWizardService);

  /**
   * Preview schema signal from wizard service
   * Returns null if configuration is invalid or incomplete
   */
  public readonly previewSchema: Signal<FormSchema | null> = this.wizardService.previewSchema;

  /**
   * Wizard summary signal for displaying configuration details
   */
  public readonly wizardSummary = this.wizardService.wizardSummary;

  /**
   * Computed signal: Formatted JSON string for preview
   * Pretty-prints schema with 2-space indentation
   */
  public readonly previewJson: Signal<string> = computed(() => {
    const schema = this.previewSchema();
    if (!schema) {
      return '// No preview available - complete required fields to generate schema';
    }
    return JSON.stringify(schema, null, 2);
  });

  /**
   * Computed signal: Check if preview is available
   */
  public readonly hasPreview: Signal<boolean> = computed(() => {
    return this.previewSchema() !== null;
  });

  /**
   * Computed signal: Field count in preview schema
   */
  public readonly fieldCount: Signal<number> = computed(() => {
    const schema = this.previewSchema();
    return schema?.fields?.length || 0;
  });

  /**
   * Computed signal: Summary statistics for preview
   */
  public readonly previewStats: Signal<{
    fieldCount: number;
    requiredFields: number;
    optionalFields: number;
    hasBusinessLogic: boolean;
  }> = computed(() => {
    const schema = this.previewSchema();
    if (!schema) {
      return {
        fieldCount: 0,
        requiredFields: 0,
        optionalFields: 0,
        hasBusinessLogic: false,
      };
    }

    const requiredFields = schema.fields?.filter((f) => f.required).length || 0;
    const optionalFields = (schema.fields?.length || 0) - requiredFields;
    const hasBusinessLogic = !!schema.businessLogicConfig;

    return {
      fieldCount: schema.fields?.length || 0,
      requiredFields,
      optionalFields,
      hasBusinessLogic,
    };
  });
}
