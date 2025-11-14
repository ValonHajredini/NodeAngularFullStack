import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LivePreviewPanelComponent } from './live-preview-panel.component';
import { TemplateWizardService } from '../services/template-wizard.service';
import { FormSchema, TemplateCategory, FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Live Preview Panel Component Tests
 * Epic 30, Story 30.10, Task 6
 */
describe('LivePreviewPanelComponent', () => {
  let component: LivePreviewPanelComponent;
  let fixture: ComponentFixture<LivePreviewPanelComponent>;
  let mockWizardService: jasmine.SpyObj<TemplateWizardService>;

  const mockFormSchema: FormSchema = {
    id: 'test-schema-id',
    title: 'Test Poll Form',
    description: 'A test poll form for testing',
    fields: [
      {
        id: 'field1',
        type: FormFieldType.TEXT,
        label: 'Question 1',
        placeholder: 'Enter your answer',
        required: true,
        order: 0,
      },
      {
        id: 'field2',
        type: FormFieldType.SELECT,
        label: 'Question 2',
        required: false,
        order: 1,
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ],
      },
    ],
    settings: {
      columnLayout: 1,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create mock wizard service with signals
    mockWizardService = jasmine.createSpyObj('TemplateWizardService', [], {
      previewSchema: signal<FormSchema | null>(null),
      wizardSummary: signal({
        category: TemplateCategory.POLLS,
        templateName: 'Test Poll',
        templateDescription: 'A test poll template',
        stepCount: 4,
        configSummary: ['Min options: 2', 'Max options: 10', 'Vote tracking: session'],
      }),
    });

    await TestBed.configureTestingModule({
      imports: [LivePreviewPanelComponent],
      providers: [{ provide: TemplateWizardService, useValue: mockWizardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LivePreviewPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with no preview schema', () => {
      expect(component.previewSchema()).toBeNull();
    });

    it('should have wizard summary from service', () => {
      const summary = component.wizardSummary();
      expect(summary.category).toBe(TemplateCategory.POLLS);
      expect(summary.templateName).toBe('Test Poll');
    });
  });

  describe('Preview Schema Signal', () => {
    it('should display empty state when no preview available', () => {
      expect(component.hasPreview()).toBe(false);
      expect(component.fieldCount()).toBe(0);
    });

    it('should update when preview schema is available', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      expect(component.previewSchema()).toBeTruthy();
      expect(component.hasPreview()).toBe(true);
      expect(component.fieldCount()).toBe(2);
    });

    it('should compute field count correctly', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      expect(component.fieldCount()).toBe(2);
    });
  });

  describe('Preview JSON Formatting', () => {
    it('should show placeholder message when no schema available', () => {
      const json = component.previewJson();
      expect(json).toContain('No preview available');
    });

    it('should format schema as pretty-printed JSON', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      const json = component.previewJson();
      expect(json).toBeDefined();
      expect(json).toContain('"title": "Test Poll Form"');
      expect(json).toContain('"fields"');
      // Should be indented with 2 spaces
      expect(json).toContain('  ');
    });

    it('should include all schema properties in JSON', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      const json = component.previewJson();
      expect(json).toContain('"id"');
      expect(json).toContain('"title"');
      expect(json).toContain('"description"');
      expect(json).toContain('"fields"');
      expect(json).toContain('"settings"');
    });
  });

  describe('Preview Statistics', () => {
    it('should compute statistics correctly with no schema', () => {
      const stats = component.previewStats();
      expect(stats.fieldCount).toBe(0);
      expect(stats.requiredFields).toBe(0);
      expect(stats.optionalFields).toBe(0);
      expect(stats.hasBusinessLogic).toBe(false);
    });

    it('should compute field counts correctly', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      const stats = component.previewStats();
      expect(stats.fieldCount).toBe(2);
      expect(stats.requiredFields).toBe(1); // field1 is required
      expect(stats.optionalFields).toBe(1); // field2 is optional
    });

    it('should detect business logic configuration', () => {
      const schemaWithLogic: FormSchema = {
        ...mockFormSchema,
        businessLogicConfig: {
          type: 'poll',
          voteField: 'field1',
          preventDuplicates: true,
          showResultsAfterVote: true,
          trackingMethod: 'session',
        },
      };
      mockWizardService.previewSchema = signal(schemaWithLogic);
      fixture.detectChanges();

      const stats = component.previewStats();
      expect(stats.hasBusinessLogic).toBe(true);
    });

    it('should handle schema without business logic', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      const stats = component.previewStats();
      expect(stats.hasBusinessLogic).toBe(false);
    });
  });

  describe('Template Rendering - Empty State', () => {
    it('should display empty preview message in JSON tab', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyMessage = compiled.querySelector('.empty-preview .empty-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage!.textContent).toContain('Complete the required wizard steps');
    });

    it('should not display statistics when no preview', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const stats = compiled.querySelector('.preview-stats');
      expect(stats).toBeFalsy();
    });
  });

  describe('Template Rendering - With Preview', () => {
    beforeEach(() => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();
    });

    it('should display preview header with statistics', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const header = compiled.querySelector('.preview-header');
      expect(header).toBeTruthy();

      const title = compiled.querySelector('.preview-title');
      expect(title!.textContent).toContain('Live Preview');
    });

    it('should display field count statistics', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const stats = compiled.querySelectorAll('.stat-badge');
      expect(stats.length).toBeGreaterThan(0);

      const fieldCountBadge = Array.from(stats).find((badge) =>
        badge.textContent?.includes('Fields'),
      );
      expect(fieldCountBadge).toBeTruthy();
    });

    it('should render JSON preview with formatted code', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const jsonPreview = compiled.querySelector('.json-preview');
      expect(jsonPreview).toBeTruthy();
      expect(jsonPreview!.textContent).toContain('Test Poll Form');
    });

    it('should render field list in UI snapshot tab', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fieldItems = compiled.querySelectorAll('.field-item');
      expect(fieldItems.length).toBe(2);
    });

    it('should display required indicator for required fields', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const requiredIndicator = compiled.querySelector('.required-indicator');
      expect(requiredIndicator).toBeTruthy();
      expect(requiredIndicator!.textContent).toContain('*');
    });

    it('should display field types', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const fieldTypes = compiled.querySelectorAll('.field-type');
      expect(fieldTypes.length).toBe(2);
    });

    it('should display wizard summary information', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const summaryList = compiled.querySelector('.summary-list');
      expect(summaryList).toBeTruthy();
    });

    it('should display configuration summary items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const configItems = compiled.querySelectorAll('.config-summary-list li');
      expect(configItems.length).toBe(3); // Based on mock data
    });
  });

  describe('Business Logic Indicator', () => {
    it('should display business logic badge when present', () => {
      const schemaWithLogic: FormSchema = {
        ...mockFormSchema,
        businessLogicConfig: {
          type: 'poll',
          voteField: 'field1',
          preventDuplicates: true,
          showResultsAfterVote: true,
          trackingMethod: 'session',
        },
      };
      mockWizardService.previewSchema = signal(schemaWithLogic);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const logicBadge = Array.from(compiled.querySelectorAll('.stat-badge')).find((badge) =>
        badge.textContent?.includes('Business Logic'),
      );
      expect(logicBadge).toBeTruthy();
    });

    it('should not display business logic badge when absent', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const logicBadge = Array.from(compiled.querySelectorAll('.stat-badge')).find((badge) =>
        badge.textContent?.includes('Business Logic'),
      );
      expect(logicBadge).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for regions', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const region = compiled.querySelector('[role="region"]');
      expect(region).toBeTruthy();
      expect(region!.getAttribute('aria-label')).toBe('Live template preview');
    });

    it('should have aria-live regions for status updates', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const liveRegions = compiled.querySelectorAll('[aria-live="polite"]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    it('should mark JSON preview as readonly textbox', () => {
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const jsonPreview = compiled.querySelector('.json-preview');
      expect(jsonPreview!.getAttribute('role')).toBe('textbox');
      expect(jsonPreview!.getAttribute('aria-readonly')).toBe('true');
    });
  });

  describe('OnPush Change Detection', () => {
    it('should update view when preview schema signal changes', () => {
      expect(component.hasPreview()).toBe(false);

      // Update signal
      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      expect(component.hasPreview()).toBe(true);
      expect(component.fieldCount()).toBe(2);
    });

    it('should recompute statistics when schema changes', () => {
      const stats1 = component.previewStats();
      expect(stats1.fieldCount).toBe(0);

      mockWizardService.previewSchema = signal(mockFormSchema);
      fixture.detectChanges();

      const stats2 = component.previewStats();
      expect(stats2.fieldCount).toBe(2);
    });
  });
});
