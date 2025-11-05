import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { GroupPreviewComponent } from './group-preview.component';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';

describe('GroupPreviewComponent', () => {
  let component: GroupPreviewComponent;
  let fixture: ComponentFixture<GroupPreviewComponent>;
  let compiled: HTMLElement;

  const createMockGroupField = (overrides?: Partial<FormField>): FormField => ({
    id: 'group-1',
    type: FormFieldType.GROUP,
    label: 'Test Group',
    fieldName: 'testGroup',
    required: false,
    order: 0,
    metadata: {
      groupTitle: 'Default Group Title',
      groupBorderStyle: 'solid' as const,
      groupCollapsible: false,
      groupBackgroundColor: '#ffffff',
    },
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupPreviewComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    component.field = createMockGroupField();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Group Title Rendering', () => {
    it('should display group title from metadata', () => {
      component.field = createMockGroupField({
        metadata: {
          groupTitle: 'Contact Information',
        },
      });
      fixture.detectChanges();

      const titleElement = compiled.querySelector('.group-header span');
      expect(titleElement?.textContent).toContain('Contact Information');
    });

    it('should display "Untitled Group" when groupTitle is not provided', () => {
      component.field = createMockGroupField({
        metadata: {},
      });
      fixture.detectChanges();

      const titleElement = compiled.querySelector('.group-header span');
      expect(titleElement?.textContent).toContain('Untitled Group');
    });

    it('should display "Untitled Group" when metadata is undefined', () => {
      component.field = createMockGroupField({
        metadata: undefined,
      });
      fixture.detectChanges();

      const titleElement = compiled.querySelector('.group-header span');
      expect(titleElement?.textContent).toContain('Untitled Group');
    });

    it('should apply italic style to untitled group text', () => {
      component.field = createMockGroupField({
        metadata: {},
      });
      fixture.detectChanges();

      const titleElement = compiled.querySelector('.group-header span.italic');
      expect(titleElement).toBeTruthy();
    });
  });

  describe('Border Style Application', () => {
    it('should apply solid border class when borderStyle is solid', () => {
      component.field = createMockGroupField({
        metadata: {
          groupBorderStyle: 'solid',
        },
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container');
      expect(container?.classList.contains('border-solid')).toBe(true);
    });

    it('should apply dashed border class when borderStyle is dashed', () => {
      component.field = createMockGroupField({
        metadata: {
          groupBorderStyle: 'dashed',
        },
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container');
      expect(container?.classList.contains('border-dashed')).toBe(true);
    });

    it('should apply none border class when borderStyle is none', () => {
      component.field = createMockGroupField({
        metadata: {
          groupBorderStyle: 'none',
        },
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container');
      expect(container?.classList.contains('border-none')).toBe(true);
    });

    it('should default to solid border when borderStyle is not provided', () => {
      component.field = createMockGroupField({
        metadata: {},
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container');
      expect(container?.classList.contains('border-solid')).toBe(true);
    });
  });

  describe('Background Color Application', () => {
    it('should apply background color from metadata', () => {
      component.field = createMockGroupField({
        metadata: {
          groupBackgroundColor: '#f0f9ff',
        },
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container') as HTMLElement;
      expect(container?.style.backgroundColor).toBe('rgb(240, 249, 255)');
    });

    it('should default to white background when color is not provided', () => {
      component.field = createMockGroupField({
        metadata: {},
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container') as HTMLElement;
      expect(container?.style.backgroundColor).toBe('rgb(255, 255, 255)');
    });

    it('should apply hex color with transparency', () => {
      component.field = createMockGroupField({
        metadata: {
          groupBackgroundColor: '#fef2f2',
        },
      });
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container') as HTMLElement;
      expect(container?.style.backgroundColor).toBe('rgb(254, 242, 242)');
    });
  });

  describe('Collapsible Functionality', () => {
    it('should not show collapse button when groupCollapsible is false', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: false,
        },
      });
      fixture.detectChanges();

      const collapseButton = compiled.querySelector('.collapse-toggle');
      expect(collapseButton).toBeNull();
    });

    it('should show collapse button when groupCollapsible is true', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: true,
        },
      });
      fixture.detectChanges();

      const collapseButton = compiled.querySelector('.collapse-toggle');
      expect(collapseButton).toBeTruthy();
    });

    it('should toggle collapsed state when collapse button is clicked', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: true,
        },
      });
      fixture.detectChanges();

      const collapseButton = compiled.querySelector('.collapse-toggle') as HTMLButtonElement;
      expect(component['isCollapsed']()).toBe(false);

      collapseButton.click();
      fixture.detectChanges();
      expect(component['isCollapsed']()).toBe(true);

      collapseButton.click();
      fixture.detectChanges();
      expect(component['isCollapsed']()).toBe(false);
    });

    it('should show chevron-up icon when group is expanded', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: true,
        },
      });
      fixture.detectChanges();

      const icon = compiled.querySelector('.collapse-toggle i');
      expect(icon?.classList.contains('pi-chevron-up')).toBe(true);
    });

    it('should show chevron-down icon when group is collapsed', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: true,
        },
      });
      fixture.detectChanges();

      const collapseButton = compiled.querySelector('.collapse-toggle') as HTMLButtonElement;
      collapseButton.click();
      fixture.detectChanges();

      const icon = compiled.querySelector('.collapse-toggle i');
      expect(icon?.classList.contains('pi-chevron-down')).toBe(true);
    });

    it('should hide group content when collapsed', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: true,
        },
      });
      fixture.detectChanges();

      let groupContent = compiled.querySelector('.group-content');
      expect(groupContent).toBeTruthy();

      const collapseButton = compiled.querySelector('.collapse-toggle') as HTMLButtonElement;
      collapseButton.click();
      fixture.detectChanges();

      groupContent = compiled.querySelector('.group-content');
      expect(groupContent).toBeNull();
    });

    it('should show group content when expanded', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: true,
        },
      });
      fixture.detectChanges();

      const groupContent = compiled.querySelector('.group-content');
      expect(groupContent).toBeTruthy();
    });
  });

  describe('Default Value Handling', () => {
    it('should handle missing metadata gracefully', () => {
      component.field = createMockGroupField({
        metadata: undefined,
      });

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();

      const container = compiled.querySelector('.group-preview-container');
      expect(container).toBeTruthy();
    });

    it('should use default values when metadata properties are undefined', () => {
      component.field = createMockGroupField({
        metadata: {},
      });
      fixture.detectChanges();

      // Check defaults
      const container = compiled.querySelector('.group-preview-container');
      expect(container?.classList.contains('border-solid')).toBe(true); // Default border
      expect((container as HTMLElement)?.style.backgroundColor).toBe('rgb(255, 255, 255)'); // Default color
      expect(compiled.querySelector('.collapse-toggle')).toBeNull(); // Not collapsible by default
    });
  });

  describe('Placeholder Rendering', () => {
    it('should show empty placeholder when group has no children', () => {
      component.field = createMockGroupField();
      fixture.detectChanges();

      const placeholder = compiled.querySelector('.empty-placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder?.textContent).toContain('Drag fields here to add to group');
    });

    it('should show inbox icon in empty placeholder', () => {
      component.field = createMockGroupField();
      fixture.detectChanges();

      const icon = compiled.querySelector('.empty-placeholder i.pi-inbox');
      expect(icon).toBeTruthy();
    });
  });

  describe('CDK Drop List Integration', () => {
    it('should have cdkDropList directive on group content', () => {
      component.field = createMockGroupField();
      fixture.detectChanges();

      const dropList = fixture.debugElement.query(By.css('[cdkDropList]'));
      expect(dropList).toBeTruthy();
    });

    it('should initialize cdkDropListData as empty array', () => {
      component.field = createMockGroupField();
      fixture.detectChanges();

      const dropList = fixture.debugElement.query(By.css('[cdkDropList]'));
      expect(dropList?.nativeElement.getAttribute('ng-reflect-cdk-drop-list-data')).toBe('');
    });
  });

  describe('Getter Methods', () => {
    it('should return correct groupTitle from getter', () => {
      component.field = createMockGroupField({
        metadata: {
          groupTitle: 'Test Title',
        },
      });

      expect(component['groupTitle']).toBe('Test Title');
    });

    it('should return undefined when groupTitle is not set', () => {
      component.field = createMockGroupField({
        metadata: {},
      });

      expect(component['groupTitle']).toBeUndefined();
    });

    it('should return correct borderStyle from getter', () => {
      component.field = createMockGroupField({
        metadata: {
          groupBorderStyle: 'dashed',
        },
      });

      expect(component['borderStyle']).toBe('dashed');
    });

    it('should return solid as default borderStyle', () => {
      component.field = createMockGroupField({
        metadata: {},
      });

      expect(component['borderStyle']).toBe('solid');
    });

    it('should return correct isCollapsible from getter', () => {
      component.field = createMockGroupField({
        metadata: {
          groupCollapsible: true,
        },
      });

      expect(component['isCollapsible']).toBe(true);
    });

    it('should return false as default isCollapsible', () => {
      component.field = createMockGroupField({
        metadata: {},
      });

      expect(component['isCollapsible']).toBe(false);
    });

    it('should return correct backgroundColor from getter', () => {
      component.field = createMockGroupField({
        metadata: {
          groupBackgroundColor: '#f0f0f0',
        },
      });

      expect(component['backgroundColor']).toBe('#f0f0f0');
    });

    it('should return white as default backgroundColor', () => {
      component.field = createMockGroupField({
        metadata: {},
      });

      expect(component['backgroundColor']).toBe('#ffffff');
    });
  });

  describe('Visual Structure', () => {
    it('should render group icon in header', () => {
      component.field = createMockGroupField();
      fixture.detectChanges();

      const icon = compiled.querySelector('.group-header i.pi-objects-column');
      expect(icon).toBeTruthy();
    });

    it('should have correct CSS class structure', () => {
      component.field = createMockGroupField();
      fixture.detectChanges();

      const container = compiled.querySelector('.group-preview-container');
      const header = compiled.querySelector('.group-header');
      const content = compiled.querySelector('.group-content');

      expect(container).toBeTruthy();
      expect(header).toBeTruthy();
      expect(content).toBeTruthy();
    });
  });
});
