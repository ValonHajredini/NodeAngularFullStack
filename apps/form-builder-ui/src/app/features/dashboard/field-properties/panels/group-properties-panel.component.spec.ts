import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { GroupPropertiesPanelComponent } from './group-properties-panel.component';
import { FormField, FormFieldType, GroupMetadata } from '@nodeangularfullstack/shared';

describe('GroupPropertiesPanelComponent', () => {
  let component: GroupPropertiesPanelComponent;
  let fixture: ComponentFixture<GroupPropertiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupPropertiesPanelComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupPropertiesPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values when metadata is empty', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'contactInfo',
        label: 'Contact Information',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value).toEqual({
        groupTitle: '',
        groupBorderStyle: 'solid',
        groupCollapsible: false,
        groupBackgroundColor: '',
      });
    });

    it('should load existing metadata values into form', () => {
      // Arrange
      const metadata: GroupMetadata = {
        groupTitle: 'Personal Information',
        groupBorderStyle: 'dashed',
        groupCollapsible: true,
        groupBackgroundColor: '#F5F5F5',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'contactInfo',
        label: 'Contact Information',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.groupTitle).toBe('Personal Information');
      expect(component['form'].value.groupBorderStyle).toBe('dashed');
      expect(component['form'].value.groupCollapsible).toBe(true);
      expect(component['form'].value.groupBackgroundColor).toBe('#F5F5F5');
    });
  });

  describe('Field Change Emission', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should emit fieldChange when groupTitle changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as GroupMetadata).groupTitle).toBe('Contact Details');
        done();
      });

      // Act
      component['form'].patchValue({ groupTitle: 'Contact Details' });
    });

    it('should emit fieldChange when groupBorderStyle changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as GroupMetadata).groupBorderStyle).toBe('none');
        done();
      });

      // Act
      component['form'].patchValue({ groupBorderStyle: 'none' });
    });

    it('should emit fieldChange when groupCollapsible changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as GroupMetadata).groupCollapsible).toBe(true);
        done();
      });

      // Act
      component['form'].patchValue({ groupCollapsible: true });
    });

    it('should emit fieldChange when groupBackgroundColor changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as GroupMetadata).groupBackgroundColor).toBe('#FFFFFF');
        done();
      });

      // Act
      component['form'].patchValue({ groupBackgroundColor: '#FFFFFF' });
    });
  });

  describe('Metadata Persistence', () => {
    it('should preserve customStyle when emitting field changes', (done) => {
      // Arrange
      const metadata: GroupMetadata = {
        groupTitle: 'Section',
        groupBorderStyle: 'solid',
        groupCollapsible: false,
        customStyle: 'margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as GroupMetadata).customStyle).toBe(
          'margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
        );
        expect((updatedField.metadata as GroupMetadata).groupBorderStyle).toBe('dashed');
        done();
      });

      // Act
      component['form'].patchValue({ groupBorderStyle: 'dashed' });
    });

    it('should set undefined for empty optional fields', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupTitle).toBeUndefined();
        expect(metadata.groupBackgroundColor).toBeUndefined();
        expect(metadata.groupBorderStyle).toBe('solid'); // Has default value
        done();
      });

      // Act
      component['form'].patchValue({
        groupTitle: '',
        groupBackgroundColor: '',
      });
    });

    it('should default groupBorderStyle to solid', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupBorderStyle).toBe('solid');
        done();
      });

      // Act
      component['form'].patchValue({ groupTitle: 'Test' });
    });

    it('should default groupCollapsible to false', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupCollapsible).toBe(false);
        done();
      });

      // Act
      component['form'].patchValue({ groupTitle: 'Test' });
    });
  });

  describe('Border Style Options', () => {
    it('should have 3 border style options', () => {
      expect(component['borderStyleOptions'].length).toBe(3);
    });

    it('should include solid, dashed, and none border styles', () => {
      const borderValues = component['borderStyleOptions'].map((b) => b.value);
      expect(borderValues).toEqual(['solid', 'dashed', 'none']);
    });
  });

  describe('Collapsible Behavior', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should toggle collapsible from false to true', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupCollapsible).toBe(true);
        done();
      });

      // Act
      component['form'].patchValue({ groupCollapsible: true });
    });

    it('should toggle collapsible from true to false', (done) => {
      // Arrange
      const metadata: GroupMetadata = {
        groupBorderStyle: 'solid',
        groupCollapsible: true,
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupCollapsible).toBe(false);
        done();
      });

      // Act
      component['form'].patchValue({ groupCollapsible: false });
    });
  });

  describe('Background Color Handling', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should handle hex color format', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupBackgroundColor).toBe('#FF5733');
        done();
      });

      // Act
      component['form'].patchValue({ groupBackgroundColor: '#FF5733' });
    });

    it('should handle empty background color', (done) => {
      // Arrange
      const metadata: GroupMetadata = {
        groupBorderStyle: 'solid',
        groupBackgroundColor: '#FFFFFF',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupBackgroundColor).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({ groupBackgroundColor: '' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle field without metadata property', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
        // No metadata property
      };
      component.field = field;

      // Act
      expect(() => component.ngOnInit()).not.toThrow();

      // Assert
      expect(component['form'].value.groupTitle).toBe('');
      expect(component['form'].value.groupBorderStyle).toBe('solid');
    });

    it('should handle metadata with minimal properties', () => {
      // Arrange
      const metadata: GroupMetadata = {
        groupBorderStyle: 'none',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.groupTitle).toBe('');
      expect(component['form'].value.groupBorderStyle).toBe('none');
      expect(component['form'].value.groupCollapsible).toBe(false);
    });

    it('should handle rapid form changes', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      let emitCount = 0;
      component.fieldChange.subscribe(() => {
        emitCount++;
      });

      // Act - rapid changes
      component['form'].patchValue({ groupTitle: 'Section 1' });
      component['form'].patchValue({ groupTitle: 'Section 2' });
      component['form'].patchValue({ groupTitle: 'Section 3' });

      // Assert
      expect(emitCount).toBe(3);
    });
  });

  describe('Field Emission Format', () => {
    it('should emit field with all group metadata properties', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        const metadata = updatedField.metadata as GroupMetadata;
        expect(updatedField.id).toBe('field-1');
        expect(updatedField.type).toBe(FormFieldType.GROUP);
        expect(metadata.groupTitle).toBe('My Section');
        expect(metadata.groupBorderStyle).toBe('dashed');
        expect(metadata.groupCollapsible).toBe(true);
        expect(metadata.groupBackgroundColor).toBe('#F0F0F0');
        done();
      });

      // Act
      component['form'].patchValue({
        groupTitle: 'My Section',
        groupBorderStyle: 'dashed',
        groupCollapsible: true,
        groupBackgroundColor: '#F0F0F0',
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all properties set to non-default values', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        // Assert
        expect(metadata.groupTitle).toBe('Address Information');
        expect(metadata.groupBorderStyle).toBe('none');
        expect(metadata.groupCollapsible).toBe(true);
        expect(metadata.groupBackgroundColor).toBe('#E8F4F8');
        done();
      });

      // Act
      component['form'].patchValue({
        groupTitle: 'Address Information',
        groupBorderStyle: 'none',
        groupCollapsible: true,
        groupBackgroundColor: '#E8F4F8',
      });
    });

    it('should handle switching between border styles', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.GROUP,
        fieldName: 'group',
        label: 'Group',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      const borderStyles = ['solid', 'dashed', 'none'];
      let emitIndex = 0;

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as GroupMetadata;
        expect(metadata.groupBorderStyle).toBe(
          borderStyles[emitIndex] as 'solid' | 'dashed' | 'none',
        );
        emitIndex++;
      });

      // Act
      borderStyles.forEach((style) => {
        component['form'].patchValue({ groupBorderStyle: style as 'solid' | 'dashed' | 'none' });
      });

      // Assert
      expect(emitIndex).toBe(3);
    });
  });
});
