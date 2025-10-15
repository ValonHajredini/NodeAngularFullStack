import { TestBed } from '@angular/core/testing';
import { FormBuilderService } from './form-builder.service';
import { FormField, FormFieldType, FormMetadata, FormStatus } from '@nodeangularfullstack/shared';

describe('FormBuilderService', () => {
  let service: FormBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormBuilderService],
    });
    service = TestBed.inject(FormBuilderService);
  });

  afterEach(() => {
    service.resetForm();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Group Nesting - assignFieldToGroup()', () => {
    it('should assign a field to a group by setting parentGroupId', () => {
      const groupField: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Contact Info',
        fieldName: 'contactInfo',
        required: false,
        order: 0,
      };

      const textField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 1,
      };

      service.setFormFields([groupField, textField]);

      service.assignFieldToGroup('field-1', 'group-1');

      const fields = service.getAllFields();
      const updatedField = fields.find((f) => f.id === 'field-1');

      expect(updatedField?.parentGroupId).toBe('group-1');
    });

    it('should remove a field from a group by setting parentGroupId to null', () => {
      const textField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 0,
        parentGroupId: 'group-1',
      };

      service.setFormFields([textField]);

      service.assignFieldToGroup('field-1', null);

      const fields = service.getAllFields();
      const updatedField = fields.find((f) => f.id === 'field-1');

      expect(updatedField?.parentGroupId).toBeUndefined();
    });

    it('should mark form as dirty when assigning field to group', () => {
      const textField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 0,
      };

      service.setFormFields([textField]);
      service.markClean();

      expect(service.isDirty()).toBe(false);

      service.assignFieldToGroup('field-1', 'group-1');

      expect(service.isDirty()).toBe(true);
    });

    it('should do nothing when field ID does not exist', () => {
      const textField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 0,
      };

      service.setFormFields([textField]);

      service.assignFieldToGroup('non-existent-id', 'group-1');

      const fields = service.getAllFields();
      const field = fields.find((f) => f.id === 'field-1');

      expect(field?.parentGroupId).toBeUndefined();
    });

    it('should handle reassigning field to different group', () => {
      const textField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 0,
        parentGroupId: 'group-1',
      };

      service.setFormFields([textField]);

      service.assignFieldToGroup('field-1', 'group-2');

      const fields = service.getAllFields();
      const updatedField = fields.find((f) => f.id === 'field-1');

      expect(updatedField?.parentGroupId).toBe('group-2');
    });
  });

  describe('Group Nesting - getChildFields()', () => {
    it('should return only direct children of a group', () => {
      const groupField: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Contact Info',
        fieldName: 'contactInfo',
        required: false,
        order: 0,
      };

      const childField1: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 1,
        parentGroupId: 'group-1',
      };

      const childField2: FormField = {
        id: 'field-2',
        type: FormFieldType.EMAIL,
        label: 'Email',
        fieldName: 'email',
        required: false,
        order: 2,
        parentGroupId: 'group-1',
      };

      const otherField: FormField = {
        id: 'field-3',
        type: FormFieldType.TEXT,
        label: 'Other',
        fieldName: 'other',
        required: false,
        order: 3,
      };

      service.setFormFields([groupField, childField1, childField2, otherField]);

      const children = service.getChildFields('group-1');

      expect(children.length).toBe(2);
      expect(children.find((f) => f.id === 'field-1')).toBeTruthy();
      expect(children.find((f) => f.id === 'field-2')).toBeTruthy();
      expect(children.find((f) => f.id === 'field-3')).toBeUndefined();
    });

    it('should return empty array when group has no children', () => {
      const groupField: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Empty Group',
        fieldName: 'emptyGroup',
        required: false,
        order: 0,
      };

      service.setFormFields([groupField]);

      const children = service.getChildFields('group-1');

      expect(children.length).toBe(0);
    });

    it('should return empty array when group ID does not exist', () => {
      const textField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 0,
      };

      service.setFormFields([textField]);

      const children = service.getChildFields('non-existent-group');

      expect(children.length).toBe(0);
    });

    it('should not return nested grandchildren (only direct children)', () => {
      const parentGroup: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Parent Group',
        fieldName: 'parentGroup',
        required: false,
        order: 0,
      };

      const childGroup: FormField = {
        id: 'group-2',
        type: FormFieldType.GROUP,
        label: 'Child Group',
        fieldName: 'childGroup',
        required: false,
        order: 1,
        parentGroupId: 'group-1',
      };

      const grandchild: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 2,
        parentGroupId: 'group-2',
      };

      service.setFormFields([parentGroup, childGroup, grandchild]);

      const children = service.getChildFields('group-1');

      expect(children.length).toBe(1);
      expect(children[0].id).toBe('group-2');
      expect(children.find((f) => f.id === 'field-1')).toBeUndefined();
    });
  });

  describe('Group Nesting - moveFieldBetweenGroups()', () => {
    it('should move a field from one group to another', () => {
      const group1: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Group 1',
        fieldName: 'group1',
        required: false,
        order: 0,
      };

      const group2: FormField = {
        id: 'group-2',
        type: FormFieldType.GROUP,
        label: 'Group 2',
        fieldName: 'group2',
        required: false,
        order: 1,
      };

      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 2,
        parentGroupId: 'group-1',
      };

      service.setFormFields([group1, group2, field]);

      service.moveFieldBetweenGroups('field-1', 'group-2');

      const fields = service.getAllFields();
      const movedField = fields.find((f) => f.id === 'field-1');

      expect(movedField?.parentGroupId).toBe('group-2');

      const group1Children = service.getChildFields('group-1');
      const group2Children = service.getChildFields('group-2');

      expect(group1Children.length).toBe(0);
      expect(group2Children.length).toBe(1);
      expect(group2Children[0].id).toBe('field-1');
    });

    it('should move a field from group to top-level', () => {
      const group: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Group',
        fieldName: 'group',
        required: false,
        order: 0,
      };

      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 1,
        parentGroupId: 'group-1',
      };

      service.setFormFields([group, field]);

      service.moveFieldBetweenGroups('field-1', null);

      const fields = service.getAllFields();
      const movedField = fields.find((f) => f.id === 'field-1');

      expect(movedField?.parentGroupId).toBeUndefined();

      const groupChildren = service.getChildFields('group-1');
      expect(groupChildren.length).toBe(0);
    });

    it('should move a field from top-level into a group', () => {
      const group: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Group',
        fieldName: 'group',
        required: false,
        order: 0,
      };

      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 1,
      };

      service.setFormFields([group, field]);

      service.moveFieldBetweenGroups('field-1', 'group-1');

      const fields = service.getAllFields();
      const movedField = fields.find((f) => f.id === 'field-1');

      expect(movedField?.parentGroupId).toBe('group-1');

      const groupChildren = service.getChildFields('group-1');
      expect(groupChildren.length).toBe(1);
      expect(groupChildren[0].id).toBe('field-1');
    });

    it('should mark form as dirty when moving field between groups', () => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: false,
        order: 0,
        parentGroupId: 'group-1',
      };

      service.setFormFields([field]);
      service.markClean();

      expect(service.isDirty()).toBe(false);

      service.moveFieldBetweenGroups('field-1', 'group-2');

      expect(service.isDirty()).toBe(true);
    });
  });

  describe('Top-level Fields Filtering - formFields()', () => {
    it('should exclude fields with parentGroupId from top-level display', () => {
      const topLevelField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Top Level',
        fieldName: 'topLevel',
        required: false,
        order: 0,
      };

      const groupField: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Group',
        fieldName: 'group',
        required: false,
        order: 1,
      };

      const nestedField: FormField = {
        id: 'field-2',
        type: FormFieldType.EMAIL,
        label: 'Nested',
        fieldName: 'nested',
        required: false,
        order: 2,
        parentGroupId: 'group-1',
      };

      service.setFormFields([topLevelField, groupField, nestedField]);

      const topLevelFields = service.formFields();

      expect(topLevelFields.length).toBe(2);
      expect(topLevelFields.find((f) => f.id === 'field-1')).toBeTruthy();
      expect(topLevelFields.find((f) => f.id === 'group-1')).toBeTruthy();
      expect(topLevelFields.find((f) => f.id === 'field-2')).toBeUndefined();
    });

    it('should show all fields when none have parentGroupId', () => {
      const field1: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Field 1',
        fieldName: 'field1',
        required: false,
        order: 0,
      };

      const field2: FormField = {
        id: 'field-2',
        type: FormFieldType.EMAIL,
        label: 'Field 2',
        fieldName: 'field2',
        required: false,
        order: 1,
      };

      service.setFormFields([field1, field2]);

      const topLevelFields = service.formFields();

      expect(topLevelFields.length).toBe(2);
    });

    it('should show group fields at top level', () => {
      const group: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Group',
        fieldName: 'group',
        required: false,
        order: 0,
      };

      service.setFormFields([group]);

      const topLevelFields = service.formFields();

      expect(topLevelFields.length).toBe(1);
      expect(topLevelFields[0].type).toBe(FormFieldType.GROUP);
    });
  });

  describe('Get All Fields - getAllFields()', () => {
    it('should return all fields including nested children', () => {
      const group: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Group',
        fieldName: 'group',
        required: false,
        order: 0,
      };

      const nestedField: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Nested',
        fieldName: 'nested',
        required: false,
        order: 1,
        parentGroupId: 'group-1',
      };

      const topLevelField: FormField = {
        id: 'field-2',
        type: FormFieldType.EMAIL,
        label: 'Top Level',
        fieldName: 'topLevel',
        required: false,
        order: 2,
      };

      service.setFormFields([group, nestedField, topLevelField]);

      const allFields = service.getAllFields();

      expect(allFields.length).toBe(3);
      expect(allFields.find((f) => f.id === 'group-1')).toBeTruthy();
      expect(allFields.find((f) => f.id === 'field-1')).toBeTruthy();
      expect(allFields.find((f) => f.id === 'field-2')).toBeTruthy();
    });

    it('should return complete flattened array regardless of parent relationships', () => {
      const fields: FormField[] = [
        {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
        },
        {
          id: 'field-2',
          type: FormFieldType.TEXT,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
          parentGroupId: 'group-1',
        },
        {
          id: 'field-3',
          type: FormFieldType.TEXT,
          label: 'Field 3',
          fieldName: 'field3',
          required: false,
          order: 2,
          parentGroupId: 'group-2',
        },
      ];

      service.setFormFields(fields);

      const allFields = service.getAllFields();

      expect(allFields.length).toBe(3);
      expect(allFields).toEqual(fields);
    });
  });

  describe('Service Integration with Group Operations', () => {
    it('should maintain field integrity when removing a group with children', () => {
      const group: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Group',
        fieldName: 'group',
        required: false,
        order: 0,
      };

      const child: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Child',
        fieldName: 'child',
        required: false,
        order: 1,
        parentGroupId: 'group-1',
      };

      service.setFormFields([group, child]);

      // Remove the group
      service.removeField('group-1');

      const allFields = service.getAllFields();

      // Child should still exist but now orphaned
      expect(allFields.length).toBe(1);
      expect(allFields[0].id).toBe('field-1');
      expect(allFields[0].parentGroupId).toBe('group-1'); // Still references removed group
    });

    it('should support complex nested structures', () => {
      const parentGroup: FormField = {
        id: 'group-1',
        type: FormFieldType.GROUP,
        label: 'Parent',
        fieldName: 'parent',
        required: false,
        order: 0,
      };

      const childGroup: FormField = {
        id: 'group-2',
        type: FormFieldType.GROUP,
        label: 'Child Group',
        fieldName: 'childGroup',
        required: false,
        order: 1,
        parentGroupId: 'group-1',
      };

      const grandchild: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Grandchild',
        fieldName: 'grandchild',
        required: false,
        order: 2,
        parentGroupId: 'group-2',
      };

      service.setFormFields([parentGroup, childGroup, grandchild]);

      // Verify structure
      const topLevel = service.formFields();
      expect(topLevel.length).toBe(1);
      expect(topLevel[0].id).toBe('group-1');

      const childrenOfParent = service.getChildFields('group-1');
      expect(childrenOfParent.length).toBe(1);
      expect(childrenOfParent[0].id).toBe('group-2');

      const childrenOfChild = service.getChildFields('group-2');
      expect(childrenOfChild.length).toBe(1);
      expect(childrenOfChild[0].id).toBe('field-1');
    });
  });

  describe('Row Layout - enableRowLayout() / disableRowLayout()', () => {
    it('should enable row layout and create initial row', () => {
      expect(service.rowLayoutEnabled()).toBe(false);

      service.enableRowLayout();

      expect(service.rowLayoutEnabled()).toBe(true);
      expect(service.rowConfigs().length).toBe(1);
      expect(service.rowConfigs()[0].columnCount).toBe(2);
    });

    it('should disable row layout and clear row configurations', () => {
      service.enableRowLayout();
      service.addRow(3);

      expect(service.rowLayoutEnabled()).toBe(true);
      expect(service.rowConfigs().length).toBe(2);

      service.disableRowLayout();

      expect(service.rowLayoutEnabled()).toBe(false);
      expect(service.rowConfigs().length).toBe(0);
    });

    it('should clear field position metadata when disabling row layout', () => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Test',
        fieldName: 'test',
        required: false,
        order: 0,
        position: { rowId: 'row-1', columnIndex: 0 },
      };

      service.setFormFields([field]);
      service.disableRowLayout();

      const fields = service.getAllFields();
      expect(fields[0].position).toBeUndefined();
    });
  });

  describe('Row Layout - addRow()', () => {
    it('should add a new row with specified column count', () => {
      service.enableRowLayout();

      const rowId = service.addRow(3);

      expect(rowId).toBeTruthy();
      expect(service.rowConfigs().length).toBe(2); // Initial row + new row
      expect(service.rowConfigs()[1].columnCount).toBe(3);
      expect(service.rowConfigs()[1].rowId).toBe(rowId);
    });

    it('should assign correct order to new rows', () => {
      service.enableRowLayout();

      service.addRow(2);
      service.addRow(3);

      const rows = service.rowConfigs();
      expect(rows[0].order).toBe(0);
      expect(rows[1].order).toBe(1);
      expect(rows[2].order).toBe(2);
    });

    it('should default to 2 columns when no count specified', () => {
      service.enableRowLayout();

      const rowId = service.addRow();

      const row = service.rowConfigs().find((r) => r.rowId === rowId);
      expect(row?.columnCount).toBe(2);
    });
  });

  describe('Row Layout - removeRow()', () => {
    it('should remove row and reassign orphaned fields to first row', () => {
      service.enableRowLayout();
      const row1 = service.rowConfigs()[0].rowId;
      const row2 = service.addRow(2);

      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Test',
        fieldName: 'test',
        required: false,
        order: 0,
        position: { rowId: row2, columnIndex: 0 },
      };
      service.setFormFields([field]);

      service.removeRow(row2);

      expect(service.rowConfigs().length).toBe(1);
      const fields = service.getAllFields();
      expect(fields[0].position?.rowId).toBe(row1);
      expect(fields[0].position?.columnIndex).toBe(0);
    });

    it('should clear positions when removing last row', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;

      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Test',
        fieldName: 'test',
        required: false,
        order: 0,
        position: { rowId, columnIndex: 0 },
      };
      service.setFormFields([field]);

      service.removeRow(rowId);

      expect(service.rowConfigs().length).toBe(0);
      const fields = service.getAllFields();
      expect(fields[0].position).toBeUndefined();
    });
  });

  describe('Row Layout - updateRowColumns()', () => {
    it('should update column count for specified row', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;

      service.updateRowColumns(rowId, 4);

      expect(service.rowConfigs()[0].columnCount).toBe(4);
    });

    it('should reassign fields exceeding new column count', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;

      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Test',
        fieldName: 'test',
        required: false,
        order: 0,
        position: { rowId, columnIndex: 3 },
      };
      service.setFormFields([field]);

      service.updateRowColumns(rowId, 2);

      const fields = service.getAllFields();
      expect(fields[0].position?.columnIndex).toBe(1); // Max(0, 2-1)
    });
  });

  describe('Row Layout - setFieldPosition()', () => {
    it('should set field position and mark form dirty', () => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Test',
        fieldName: 'test',
        required: false,
        order: 0,
      };
      service.setFormFields([field]);
      service.markClean();

      service.setFieldPosition('field-1', { rowId: 'row-1', columnIndex: 2 });

      const fields = service.getAllFields();
      expect(fields[0].position).toEqual({ rowId: 'row-1', columnIndex: 2 });
      expect(service.isDirty()).toBe(true);
    });
  });

  describe('Row Layout - migrateToRowLayout()', () => {
    it('should create rows and distribute fields based on column count', () => {
      const fields: FormField[] = [
        {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
        },
        {
          id: 'field-2',
          type: FormFieldType.TEXT,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
        },
        {
          id: 'field-3',
          type: FormFieldType.TEXT,
          label: 'Field 3',
          fieldName: 'field3',
          required: false,
          order: 2,
        },
        {
          id: 'field-4',
          type: FormFieldType.TEXT,
          label: 'Field 4',
          fieldName: 'field4',
          required: false,
          order: 3,
        },
      ];
      service.setFormFields(fields);

      service.migrateToRowLayout(2);

      expect(service.rowLayoutEnabled()).toBe(true);
      expect(service.rowConfigs().length).toBe(2); // 4 fields / 2 columns = 2 rows

      const allFields = service.getAllFields();
      expect(allFields[0].position?.columnIndex).toBe(0); // Field 1: row 0, col 0
      expect(allFields[1].position?.columnIndex).toBe(1); // Field 2: row 0, col 1
      expect(allFields[2].position?.columnIndex).toBe(0); // Field 3: row 1, col 0
      expect(allFields[3].position?.columnIndex).toBe(1); // Field 4: row 1, col 1
    });
  });

  describe('Row Layout - fieldsByRow computed signal', () => {
    it('should return null when row layout is disabled', () => {
      expect(service.fieldsByRow()).toBeNull();
    });

    it('should group fields by rowId when row layout enabled', () => {
      service.enableRowLayout();
      const row1 = service.rowConfigs()[0].rowId;
      const row2 = service.addRow(2);

      const fields: FormField[] = [
        {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0 },
        },
        {
          id: 'field-2',
          type: FormFieldType.TEXT,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
          position: { rowId: row2, columnIndex: 0 },
        },
      ];
      service.setFormFields(fields);

      const fieldsByRow = service.fieldsByRow();
      expect(fieldsByRow).toBeTruthy();
      expect(fieldsByRow!.get(row1)?.length).toBe(1);
      expect(fieldsByRow!.get(row2)?.length).toBe(1);
      expect(fieldsByRow!.get(row1)![0].id).toBe('field-1');
      expect(fieldsByRow!.get(row2)![0].id).toBe('field-2');
    });

    it('should assign orphaned fields to first row', () => {
      service.enableRowLayout();
      const row1 = service.rowConfigs()[0].rowId;

      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Orphan',
        fieldName: 'orphan',
        required: false,
        order: 0,
        // No position set - orphaned
      };
      service.setFormFields([field]);

      const fieldsByRow = service.fieldsByRow();
      expect(fieldsByRow!.get(row1)?.length).toBe(1);
      expect(fieldsByRow!.get(row1)![0].id).toBe('field-1');
    });
  });

  describe('Row Layout - Schema Serialization', () => {
    it('should include row layout in exported form data when enabled', () => {
      service.enableRowLayout();
      service.addRow(3);

      const formData = service.exportFormData({
        title: 'Test Form',
        description: 'Test',
        columnLayout: 2,
        fieldSpacing: 'normal',
        successMessage: 'Success',
        redirectUrl: '',
        allowMultipleSubmissions: false,
      });

      expect(formData.schema?.settings?.rowLayout).toBeTruthy();
      expect(formData.schema?.settings?.rowLayout?.enabled).toBe(true);
      expect(formData.schema?.settings?.rowLayout?.rows.length).toBe(2);
    });

    it('should not include row layout when disabled', () => {
      const formData = service.exportFormData({
        title: 'Test Form',
        description: 'Test',
        columnLayout: 2,
        fieldSpacing: 'normal',
        successMessage: 'Success',
        redirectUrl: '',
        allowMultipleSubmissions: false,
      });

      expect(formData.schema?.settings?.rowLayout).toBeUndefined();
    });
  });

  describe('Row Layout - Schema Deserialization', () => {
    it('should restore row layout from schema when loading form', () => {
      const formMetadata: FormMetadata = {
        id: 'form-1',
        userId: 'user-1',
        title: 'Test Form',
        status: FormStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        schema: {
          id: 'schema-1',
          formId: 'form-1',
          version: 1,
          fields: [],
          settings: {
            layout: { columns: 2, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you',
              allowMultipleSubmissions: false,
            },
            rowLayout: {
              enabled: true,
              rows: [
                { rowId: 'row-1', columnCount: 2, order: 0 },
                { rowId: 'row-2', columnCount: 3, order: 1 },
              ],
            },
          },
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      service.loadForm(formMetadata);

      expect(service.rowLayoutEnabled()).toBe(true);
      expect(service.rowConfigs().length).toBe(2);
      expect(service.rowConfigs()[0].columnCount).toBe(2);
      expect(service.rowConfigs()[1].columnCount).toBe(3);
    });

    it('should reset row layout for forms without row layout in schema', () => {
      // First enable row layout
      service.enableRowLayout();
      expect(service.rowLayoutEnabled()).toBe(true);

      // Load form without row layout
      const formMetadata: FormMetadata = {
        id: 'form-1',
        userId: 'user-1',
        title: 'Test Form',
        status: FormStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        schema: {
          id: 'schema-1',
          formId: 'form-1',
          version: 1,
          fields: [],
          settings: {
            layout: { columns: 2, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you',
              allowMultipleSubmissions: false,
            },
          },
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      service.loadForm(formMetadata);

      expect(service.rowLayoutEnabled()).toBe(false);
      expect(service.rowConfigs().length).toBe(0);
    });
  });

  describe('Row Layout - Field Auto-Assignment', () => {
    it('should auto-assign new fields to first row when row layout enabled', () => {
      service.enableRowLayout();
      const row1 = service.rowConfigs()[0].rowId;

      const newField = service.addFieldFromType(FormFieldType.TEXT);

      expect(newField.position).toBeTruthy();
      expect(newField.position?.rowId).toBe(row1);
      expect(newField.position?.columnIndex).toBe(0);
    });

    it('should not assign position when row layout disabled', () => {
      const newField = service.addFieldFromType(FormFieldType.TEXT);

      expect(newField.position).toBeUndefined();
    });
  });

  describe('Multi-Field Column Support', () => {
    beforeEach(() => {
      service.enableRowLayout();
    });

    describe('getFieldsInColumn()', () => {
      it('should return fields sorted by orderInColumn', () => {
        const row1 = service.rowConfigs()[0].rowId;

        const field1: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 2 },
        };

        const field2: FormField = {
          id: 'field-2',
          type: FormFieldType.EMAIL,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 0 },
        };

        const field3: FormField = {
          id: 'field-3',
          type: FormFieldType.NUMBER,
          label: 'Field 3',
          fieldName: 'field3',
          required: false,
          order: 2,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 1 },
        };

        service.setFormFields([field1, field2, field3]);

        const fieldsInColumn = service.getFieldsInColumn(row1, 0);

        expect(fieldsInColumn.length).toBe(3);
        expect(fieldsInColumn[0].id).toBe('field-2'); // orderInColumn: 0
        expect(fieldsInColumn[1].id).toBe('field-3'); // orderInColumn: 1
        expect(fieldsInColumn[2].id).toBe('field-1'); // orderInColumn: 2
      });

      it('should return empty array for empty column', () => {
        const row1 = service.rowConfigs()[0].rowId;
        const fieldsInColumn = service.getFieldsInColumn(row1, 0);

        expect(fieldsInColumn.length).toBe(0);
      });

      it('should return empty array for non-existent row', () => {
        const fieldsInColumn = service.getFieldsInColumn('non-existent-row', 0);

        expect(fieldsInColumn.length).toBe(0);
      });
    });

    describe('setFieldPosition() with orderInColumn', () => {
      it('should set orderInColumn and default to 0 if not provided', () => {
        const row1 = service.rowConfigs()[0].rowId;
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
        };

        service.setFormFields([field]);

        service.setFieldPosition('field-1', { rowId: row1, columnIndex: 0 });

        const fields = service.getAllFields();
        const updatedField = fields.find((f) => f.id === 'field-1');

        expect(updatedField?.position?.orderInColumn).toBe(0);
      });

      it('should shift fields in target column to make room for new field', () => {
        const row1 = service.rowConfigs()[0].rowId;

        const field1: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 0 },
        };

        const field2: FormField = {
          id: 'field-2',
          type: FormFieldType.EMAIL,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 1 },
        };

        const field3: FormField = {
          id: 'field-3',
          type: FormFieldType.NUMBER,
          label: 'Field 3',
          fieldName: 'field3',
          required: false,
          order: 2,
        };

        service.setFormFields([field1, field2, field3]);

        // Insert field3 at position 1 (between field1 and field2)
        service.setFieldPosition('field-3', { rowId: row1, columnIndex: 0, orderInColumn: 1 });

        const fields = service.getAllFields();
        const f1 = fields.find((f) => f.id === 'field-1');
        const f2 = fields.find((f) => f.id === 'field-2');
        const f3 = fields.find((f) => f.id === 'field-3');

        expect(f1?.position?.orderInColumn).toBe(0); // Unchanged
        expect(f3?.position?.orderInColumn).toBe(1); // New position
        expect(f2?.position?.orderInColumn).toBe(2); // Shifted down from 1 to 2
      });

      it('should recalculate orderInColumn when field moves from one column to another', () => {
        const row1 = service.rowConfigs()[0].rowId;

        const field1: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 0 },
        };

        const field2: FormField = {
          id: 'field-2',
          type: FormFieldType.EMAIL,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 1 },
        };

        service.setFormFields([field1, field2]);

        // Move field1 to column 1
        service.setFieldPosition('field-1', { rowId: row1, columnIndex: 1, orderInColumn: 0 });

        const fields = service.getAllFields();
        const f1 = fields.find((f) => f.id === 'field-1');
        const f2 = fields.find((f) => f.id === 'field-2');

        // Field1 moved to column 1
        expect(f1?.position?.columnIndex).toBe(1);
        expect(f1?.position?.orderInColumn).toBe(0);

        // Field2 shifted up in column 0 (from orderInColumn 1 to 0)
        expect(f2?.position?.orderInColumn).toBe(0);
      });
    });

    describe('reorderFieldInColumn()', () => {
      it('should update field orderInColumn and shift other fields', () => {
        const row1 = service.rowConfigs()[0].rowId;

        const field1: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 0 },
        };

        const field2: FormField = {
          id: 'field-2',
          type: FormFieldType.EMAIL,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 1 },
        };

        const field3: FormField = {
          id: 'field-3',
          type: FormFieldType.NUMBER,
          label: 'Field 3',
          fieldName: 'field3',
          required: false,
          order: 2,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 2 },
        };

        service.setFormFields([field1, field2, field3]);

        // Move field3 (orderInColumn 2) to position 0 (top of column)
        service.reorderFieldInColumn('field-3', 0);

        const fields = service.getAllFields();
        const f1 = fields.find((f) => f.id === 'field-1');
        const f2 = fields.find((f) => f.id === 'field-2');
        const f3 = fields.find((f) => f.id === 'field-3');

        expect(f3?.position?.orderInColumn).toBe(0); // Moved to top
        expect(f1?.position?.orderInColumn).toBe(1); // Shifted down
        expect(f2?.position?.orderInColumn).toBe(2); // Shifted down
      });

      it('should mark form as dirty when reordering', () => {
        const row1 = service.rowConfigs()[0].rowId;

        const field1: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 0 },
        };

        service.setFormFields([field1]);
        service.markClean();

        expect(service.isDirty()).toBe(false);

        service.reorderFieldInColumn('field-1', 1);

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('fieldsByRowColumn() computed signal', () => {
      it('should group fields by row-column with sorting', () => {
        const row1 = service.rowConfigs()[0].rowId;

        const field1: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 1 },
        };

        const field2: FormField = {
          id: 'field-2',
          type: FormFieldType.EMAIL,
          label: 'Field 2',
          fieldName: 'field2',
          required: false,
          order: 1,
          position: { rowId: row1, columnIndex: 0, orderInColumn: 0 },
        };

        const field3: FormField = {
          id: 'field-3',
          type: FormFieldType.NUMBER,
          label: 'Field 3',
          fieldName: 'field3',
          required: false,
          order: 2,
          position: { rowId: row1, columnIndex: 1, orderInColumn: 0 },
        };

        service.setFormFields([field1, field2, field3]);

        const grouped = service.fieldsByRowColumn();
        const row1Map = grouped.get(row1);

        expect(row1Map).toBeTruthy();

        const col0Fields = row1Map?.get(0) || [];
        expect(col0Fields.length).toBe(2);
        expect(col0Fields[0].id).toBe('field-2'); // orderInColumn 0
        expect(col0Fields[1].id).toBe('field-1'); // orderInColumn 1

        const col1Fields = row1Map?.get(1) || [];
        expect(col1Fields.length).toBe(1);
        expect(col1Fields[0].id).toBe('field-3');
      });
    });

    describe('Backward Compatibility', () => {
      it('should treat fields without orderInColumn as orderInColumn = 0', () => {
        const row1 = service.rowConfigs()[0].rowId;

        const field1: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Field 1',
          fieldName: 'field1',
          required: false,
          order: 0,
          position: { rowId: row1, columnIndex: 0 }, // No orderInColumn
        };

        service.setFormFields([field1]);

        const fieldsInColumn = service.getFieldsInColumn(row1, 0);

        expect(fieldsInColumn.length).toBe(1);
        expect(fieldsInColumn[0].id).toBe('field-1');
        expect(fieldsInColumn[0].position?.orderInColumn).toBeUndefined(); // Original data unchanged
      });
    });
  });

  describe('Step Form Management', () => {
    describe('enableStepForm()', () => {
      it('should enable step form and create default first step', () => {
        expect(service.stepFormEnabled()).toBe(false);

        service.enableStepForm();

        expect(service.stepFormEnabled()).toBe(true);
        expect(service.steps().length).toBe(1);
        expect(service.steps()[0].title).toBe('Step 1');
        expect(service.steps()[0].order).toBe(0);
      });

      it('should migrate all existing fields to first step', () => {
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Test',
          fieldName: 'test',
          required: false,
          order: 0,
        };
        service.setFormFields([field]);

        service.enableStepForm();

        const fields = service.getAllFields();
        expect(fields[0].position?.stepId).toBeTruthy();
        expect(fields[0].position?.stepId).toBe(service.steps()[0].id);
      });

      it('should assign existing rows to the default step', () => {
        service.enableRowLayout();
        const rowConfigurationsBefore = service.getRowLayout();
        expect(rowConfigurationsBefore.length).toBeGreaterThan(0);
        expect(rowConfigurationsBefore[0].stepId).toBeUndefined();

        service.enableStepForm();

        const rows = service.getRowLayout();
        expect(rows[0].stepId).toBe(service.steps()[0].id);
      });

      it('should set active step to first step', () => {
        service.enableStepForm();

        expect(service.activeStepId()).toBe(service.steps()[0].id);
      });

      it('should mark form as dirty', () => {
        service.markClean();
        service.enableStepForm();

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('disableStepForm()', () => {
      it('should disable step form and clear steps', () => {
        service.enableStepForm();
        expect(service.stepFormEnabled()).toBe(true);

        service.disableStepForm();

        expect(service.stepFormEnabled()).toBe(false);
        expect(service.steps().length).toBe(0);
        expect(service.activeStepId()).toBeNull();
      });

      it('should clear step assignments from fields', () => {
        service.enableStepForm();
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Test',
          fieldName: 'test',
          required: false,
          order: 0,
          position: { rowId: 'row-1', columnIndex: 0, stepId: 'step-1' },
        };
        service.setFormFields([field]);

        service.disableStepForm();

        const fields = service.getAllFields();
        expect(fields[0].position?.stepId).toBeUndefined();
        expect(fields[0].position?.rowId).toBe('row-1');
      });

      it('should clear step assignments from rows when disabled', () => {
        service.enableRowLayout();
        service.enableStepForm();
        const rowsBeforeDisable = service.getRowLayout();
        expect(rowsBeforeDisable[0].stepId).toBe(service.steps()[0].id);

        service.disableStepForm();

        const rows = service.getRowLayout();
        expect(rows[0].stepId).toBeUndefined();
      });

      it('should mark form as dirty', () => {
        service.enableStepForm();
        service.markClean();

        service.disableStepForm();

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('addStep()', () => {
      it('should add step to array', () => {
        service.enableStepForm();
        const newStep = {
          id: 'step-2',
          title: 'Step 2',
          description: 'Second step',
          order: 1,
        };

        service.addStep(newStep);

        expect(service.steps().length).toBe(2);
        expect(service.steps()[1]).toEqual(newStep);
      });

      it('should set new step as active', () => {
        service.enableStepForm();
        const newStep = {
          id: 'step-2',
          title: 'Step 2',
          description: '',
          order: 1,
        };

        service.addStep(newStep);

        expect(service.activeStepId()).toBe('step-2');
      });

      it('should mark form as dirty', () => {
        service.enableStepForm();
        service.markClean();

        service.addStep({
          id: 'step-2',
          title: 'Step 2',
          description: '',
          order: 1,
        });

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('removeStep()', () => {
      it('should not allow removing the last step', () => {
        service.enableStepForm();
        const stepId = service.steps()[0].id;

        service.removeStep(stepId);

        expect(service.steps().length).toBe(1);
      });

      it('should remove step and reassign fields to first step', () => {
        service.enableStepForm();
        const step2 = {
          id: 'step-2',
          title: 'Step 2',
          description: '',
          order: 1,
        };
        service.addStep(step2);

        // Create a row for step 2
        service.addRow(2);

        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Test',
          fieldName: 'test',
          required: false,
          order: 0,
          position: { rowId: 'row-1', columnIndex: 0, stepId: 'step-2' },
        };
        service.setFormFields([field]);

        service.removeStep('step-2');

        expect(service.steps().length).toBe(1);
        const fields = service.getAllFields();
        expect(fields[0].position?.stepId).toBe(service.steps()[0].id);
      });

      it('should reassign rows from removed step to first step', () => {
        service.enableStepForm();
        const step2 = {
          id: 'step-2',
          title: 'Step 2',
          description: '',
          order: 1,
        };
        service.addStep(step2);

        // Row created while step 2 active should belong to step 2
        const newRowId = service.addRow(2);
        let rows = service.getRowLayout();
        const step2Row = rows.find((row) => row.rowId === newRowId);
        expect(step2Row?.stepId).toBe('step-2');

        service.removeStep('step-2');

        rows = service.getRowLayout();
        const reassignedRow = rows.find((row) => row.rowId === newRowId);
        expect(reassignedRow?.stepId).toBe(service.steps()[0].id);
      });

      it('should reorder remaining steps', () => {
        service.enableStepForm();
        service.addStep({ id: 'step-2', title: 'Step 2', description: '', order: 1 });
        service.addStep({ id: 'step-3', title: 'Step 3', description: '', order: 2 });

        service.removeStep('step-2');

        expect(service.steps().length).toBe(2);
        expect(service.steps()[0].order).toBe(0);
        expect(service.steps()[1].order).toBe(1);
      });

      it('should update active step if removed step was active', () => {
        service.enableStepForm();
        service.addStep({ id: 'step-2', title: 'Step 2', description: '', order: 1 });

        service.removeStep('step-2');

        expect(service.activeStepId()).toBe(service.steps()[0].id);
      });
    });

    describe('updateStep()', () => {
      it('should update step properties', () => {
        service.enableStepForm();
        const stepId = service.steps()[0].id;

        service.updateStep(stepId, {
          title: 'Updated Title',
          description: 'Updated Description',
        });

        expect(service.steps()[0].title).toBe('Updated Title');
        expect(service.steps()[0].description).toBe('Updated Description');
      });

      it('should mark form as dirty', () => {
        service.enableStepForm();
        service.markClean();
        const stepId = service.steps()[0].id;

        service.updateStep(stepId, { title: 'New Title' });

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('reorderSteps()', () => {
      it('should update step order indices', () => {
        service.enableStepForm();
        service.addStep({ id: 'step-2', title: 'Step 2', description: '', order: 1 });
        service.addStep({ id: 'step-3', title: 'Step 3', description: '', order: 2 });

        const steps = service.steps();
        const reordered = [steps[2], steps[0], steps[1]];

        service.reorderSteps(reordered);

        const newOrder = service.steps();
        expect(newOrder[0].order).toBe(0);
        expect(newOrder[1].order).toBe(1);
        expect(newOrder[2].order).toBe(2);
        expect(newOrder[0].id).toBe('step-3');
      });

      it('should mark form as dirty', () => {
        service.enableStepForm();
        service.addStep({ id: 'step-2', title: 'Step 2', description: '', order: 1 });
        service.markClean();

        const steps = service.steps();
        service.reorderSteps([steps[1], steps[0]]);

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('getStepById()', () => {
      it('should return step when ID exists', () => {
        service.enableStepForm();
        const stepId = service.steps()[0].id;

        const step = service.getStepById(stepId);

        expect(step).toBeTruthy();
        expect(step?.id).toBe(stepId);
      });

      it('should return undefined when ID does not exist', () => {
        service.enableStepForm();

        const step = service.getStepById('non-existent-id');

        expect(step).toBeUndefined();
      });
    });

    describe('Computed Signals', () => {
      it('canAddStep should return true when less than 10 steps', () => {
        service.enableStepForm();

        expect(service.canAddStep()).toBe(true);
      });

      it('canAddStep should return false when 10 or more steps', () => {
        service.enableStepForm();
        for (let i = 1; i < 10; i++) {
          service.addStep({
            id: `step-${i + 1}`,
            title: `Step ${i + 1}`,
            description: '',
            order: i,
          });
        }

        expect(service.steps().length).toBe(10);
        expect(service.canAddStep()).toBe(false);
      });

      it('canDeleteStep should return false when only 1 step', () => {
        service.enableStepForm();

        expect(service.canDeleteStep()).toBe(false);
      });

      it('canDeleteStep should return true when more than 1 step', () => {
        service.enableStepForm();
        service.addStep({ id: 'step-2', title: 'Step 2', description: '', order: 1 });

        expect(service.canDeleteStep()).toBe(true);
      });

      it('activeStep should return correct step', () => {
        service.enableStepForm();
        const stepId = service.steps()[0].id;

        const activeStep = service.activeStep();

        expect(activeStep).toBeTruthy();
        expect(activeStep?.id).toBe(stepId);
      });
    });

    describe('Schema Serialization', () => {
      it('should include step form in exported data when enabled', () => {
        service.enableStepForm();
        service.addStep({ id: 'step-2', title: 'Step 2', description: '', order: 1 });

        const formData = service.exportFormData({
          title: 'Test Form',
          description: 'Test',
          columnLayout: 2,
          fieldSpacing: 'normal',
          successMessage: 'Success',
          redirectUrl: '',
          allowMultipleSubmissions: false,
        });

        expect(formData.schema?.settings?.stepForm).toBeTruthy();
        expect(formData.schema?.settings?.stepForm?.enabled).toBe(true);
        expect(formData.schema?.settings?.stepForm?.steps.length).toBe(2);
      });

      it('should not include step form when disabled', () => {
        const formData = service.exportFormData({
          title: 'Test Form',
          description: 'Test',
          columnLayout: 2,
          fieldSpacing: 'normal',
          successMessage: 'Success',
          redirectUrl: '',
          allowMultipleSubmissions: false,
        });

        expect(formData.schema?.settings?.stepForm).toBeUndefined();
      });
    });

    describe('Schema Deserialization', () => {
      it('should restore step form from schema when loading form', () => {
        const formMetadata: FormMetadata = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
          schema: {
            id: 'schema-1',
            formId: 'form-1',
            version: 1,
            fields: [],
            settings: {
              layout: { columns: 2, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you',
                allowMultipleSubmissions: false,
              },
              stepForm: {
                enabled: true,
                steps: [
                  { id: 'step-1', title: 'Step 1', description: 'First', order: 0 },
                  { id: 'step-2', title: 'Step 2', description: 'Second', order: 1 },
                ],
              },
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        service.loadForm(formMetadata);

        expect(service.stepFormEnabled()).toBe(true);
        expect(service.steps().length).toBe(2);
        expect(service.steps()[0].title).toBe('Step 1');
        expect(service.steps()[1].title).toBe('Step 2');
        expect(service.activeStepId()).toBe('step-1');
      });

      it('should reset step form for forms without step configuration', () => {
        service.enableStepForm();
        expect(service.stepFormEnabled()).toBe(true);

        const formMetadata: FormMetadata = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
          schema: {
            id: 'schema-1',
            formId: 'form-1',
            version: 1,
            fields: [],
            settings: {
              layout: { columns: 2, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you',
                allowMultipleSubmissions: false,
              },
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        service.loadForm(formMetadata);

        expect(service.stepFormEnabled()).toBe(false);
        expect(service.steps().length).toBe(0);
        expect(service.activeStepId()).toBeNull();
      });
    });
  });

  describe('Step Navigation', () => {
    beforeEach(() => {
      service.enableStepForm();
      service.addStep({ id: 'step-2', title: 'Step 2', description: '', order: 1 });
    });

    it('setActiveStep() should update activeStepId signal', () => {
      const step2Id = service.steps()[1].id;

      service.setActiveStep(step2Id);

      expect(service.activeStepId()).toBe(step2Id);
    });

    it('setActiveStep() with invalid ID should log error and not update', () => {
      const originalActiveId = service.activeStepId();
      spyOn(console, 'error');

      service.setActiveStep('non-existent-step-id');

      expect(console.error).toHaveBeenCalledWith('Invalid step ID:', 'non-existent-step-id');
      expect(service.activeStepId()).toBe(originalActiveId);
    });

    it('activeStep computed should return correct step', () => {
      const step1 = service.steps()[0];
      const step2 = service.steps()[1];

      // Initially on step 1
      expect(service.activeStep()).toEqual(step1);

      // Switch to step 2
      service.setActiveStep(step2.id);
      expect(service.activeStep()).toEqual(step2);
    });

    it('activeStepOrder computed should return correct order', () => {
      const step1 = service.steps()[0];
      const step2 = service.steps()[1];

      // Initially on step 1 (order 0)
      expect(service.activeStepOrder()).toBe(0);

      // Switch to step 2 (order 1)
      service.setActiveStep(step2.id);
      expect(service.activeStepOrder()).toBe(1);
    });

    it('enableStepForm() should set first step as active', () => {
      // Reset and re-enable
      service.disableStepForm();
      expect(service.activeStepId()).toBeNull();

      service.enableStepForm();

      const firstStepId = service.steps()[0].id;
      expect(service.activeStepId()).toBe(firstStepId);
      expect(service.activeStepOrder()).toBe(0);
    });

    it('should filter fields by active step correctly', () => {
      const step1Id = service.steps()[0].id;
      const step2Id = service.steps()[1].id;

      // Add fields to different steps
      const field1: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Field 1',
        fieldName: 'field1',
        required: false,
        order: 0,
        position: { stepId: step1Id, rowId: 'row-1', columnIndex: 0 },
      };

      const field2: FormField = {
        id: 'field-2',
        type: FormFieldType.EMAIL,
        label: 'Field 2',
        fieldName: 'field2',
        required: false,
        order: 1,
        position: { stepId: step2Id, rowId: 'row-1', columnIndex: 0 },
      };

      const field3: FormField = {
        id: 'field-3',
        type: FormFieldType.NUMBER,
        label: 'Field 3',
        fieldName: 'field3',
        required: false,
        order: 2,
        position: { stepId: step1Id, rowId: 'row-1', columnIndex: 1 },
      };

      service.setFormFields([field1, field2, field3]);

      // Step 1 should show 2 fields
      service.setActiveStep(step1Id);
      const step1Fields = service.formFields().filter((f) => f.position?.stepId === step1Id);
      expect(step1Fields.length).toBe(2);
      expect(step1Fields.map((f) => f.id)).toContain('field-1');
      expect(step1Fields.map((f) => f.id)).toContain('field-3');

      // Step 2 should show 1 field
      service.setActiveStep(step2Id);
      const step2Fields = service.formFields().filter((f) => f.position?.stepId === step2Id);
      expect(step2Fields.length).toBe(1);
      expect(step2Fields[0].id).toBe('field-2');
    });
  });

  describe('Theme Management', () => {
    let mockThemesApiService: jasmine.SpyObj<any>;
    let mockThemePreviewService: jasmine.SpyObj<any>;

    beforeEach(() => {
      // Create spies for the injected services
      mockThemesApiService = jasmine.createSpyObj('ThemesApiService', ['getThemes', 'applyTheme']);
      mockThemePreviewService = jasmine.createSpyObj('ThemePreviewService', [
        'applyThemeCss',
        'clearThemeCss',
      ]);

      // Replace the injected services with spies
      (service as any).themesApi = mockThemesApiService;
      (service as any).themePreviewService = mockThemePreviewService;
    });

    describe('applyTheme', () => {
      it('should apply theme and mark form dirty', () => {
        const mockTheme = {
          id: 'theme-1',
          name: 'Neon Theme',
          description: 'A bright neon theme',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          themeConfig: {
            desktop: {
              primaryColor: '#FF5733',
              secondaryColor: '#33FF57',
              backgroundColor: '#FFFFFF',
              textColorPrimary: '#000000',
              textColorSecondary: '#666666',
              fontFamilyHeading: 'Arial, sans-serif',
              fontFamilyBody: 'Helvetica, sans-serif',
              fieldBorderRadius: '8px',
              fieldSpacing: '12px',
              containerBackground: '#F5F5F5',
              containerOpacity: 0.9,
              containerPosition: 'center' as const,
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Set up available themes
        (service as any)._availableThemes.set([mockTheme]);

        // Set up current form
        const mockForm: FormMetadata = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        service.setCurrentForm(mockForm);

        // Mock API response
        mockThemesApiService.applyTheme.and.returnValue({
          subscribe: (callback: any) => {
            callback.next({ data: { usageCount: 10 } });
          },
        });

        // Apply theme
        service.applyTheme('theme-1');

        // Verify theme was applied
        expect(service.currentTheme()).toEqual(mockTheme);
        expect(service.isDirty()).toBe(true);
        expect(mockThemePreviewService.applyThemeCss).toHaveBeenCalledWith(mockTheme);
        expect(mockThemesApiService.applyTheme).toHaveBeenCalledWith('theme-1');

        // Verify form schema was updated
        const currentForm = service.currentForm();
        expect(currentForm?.schema?.settings?.themeId).toBe('theme-1');
      });

      it('should warn when theme not found in available themes', () => {
        spyOn(console, 'warn');

        // Set up available themes (empty)
        (service as any)._availableThemes.set([]);

        // Set up current form
        const mockForm: FormMetadata = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        service.setCurrentForm(mockForm);

        // Apply non-existent theme
        service.applyTheme('non-existent-theme');

        // Verify warning was logged
        expect(console.warn).toHaveBeenCalledWith(
          'Theme non-existent-theme not found in available themes',
        );
        expect(service.currentTheme()).toBeNull();
        expect(service.isDirty()).toBe(false);
        expect(mockThemePreviewService.applyThemeCss).not.toHaveBeenCalled();
      });

      it('should create schema if it does not exist', () => {
        const mockTheme = {
          id: 'theme-1',
          name: 'Test Theme',
          description: 'A test theme',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          themeConfig: {
            desktop: {
              primaryColor: '#FF5733',
              secondaryColor: '#33FF57',
              backgroundColor: '#FFFFFF',
              textColorPrimary: '#000000',
              textColorSecondary: '#666666',
              fontFamilyHeading: 'Arial, sans-serif',
              fontFamilyBody: 'Helvetica, sans-serif',
              fieldBorderRadius: '8px',
              fieldSpacing: '12px',
              containerBackground: '#F5F5F5',
              containerOpacity: 0.9,
              containerPosition: 'center' as const,
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Set up available themes
        (service as any)._availableThemes.set([mockTheme]);

        // Set up current form without schema
        const mockForm: FormMetadata = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        service.setCurrentForm(mockForm);

        // Mock API response
        mockThemesApiService.applyTheme.and.returnValue({
          subscribe: (callback: any) => {
            callback.next({ data: { usageCount: 10 } });
          },
        });

        // Apply theme
        service.applyTheme('theme-1');

        // Verify schema was created
        const currentForm = service.currentForm();
        expect(currentForm?.schema).toBeDefined();
        expect(currentForm?.schema?.settings?.themeId).toBe('theme-1');
      });
    });

    describe('loadTheme', () => {
      it('should load theme from API and apply it', () => {
        const mockTheme = {
          id: 'theme-1',
          name: 'Test Theme',
          description: 'A test theme',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          themeConfig: {
            desktop: {
              primaryColor: '#FF5733',
              secondaryColor: '#33FF57',
              backgroundColor: '#FFFFFF',
              textColorPrimary: '#000000',
              textColorSecondary: '#666666',
              fontFamilyHeading: 'Arial, sans-serif',
              fontFamilyBody: 'Helvetica, sans-serif',
              fieldBorderRadius: '8px',
              fieldSpacing: '12px',
              containerBackground: '#F5F5F5',
              containerOpacity: 0.9,
              containerPosition: 'center' as const,
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Mock API response
        mockThemesApiService.getThemes.and.returnValue({
          subscribe: (callback: any) => {
            callback.next({ data: [mockTheme] });
          },
        });

        // Load theme
        service.loadTheme('theme-1');

        // Verify theme was loaded and applied
        expect(service.currentTheme()).toEqual(mockTheme);
        expect(service.isThemeLoading()).toBe(false);
        expect(mockThemePreviewService.applyThemeCss).toHaveBeenCalledWith(mockTheme);
        expect(mockThemesApiService.getThemes).toHaveBeenCalled();
      });

      it('should handle API error when loading theme', () => {
        spyOn(console, 'error');

        // Mock API error
        mockThemesApiService.getThemes.and.returnValue({
          subscribe: (callback: any) => {
            callback.error(new Error('API Error'));
          },
        });

        // Load theme
        service.loadTheme('theme-1');

        // Verify error handling
        expect(console.error).toHaveBeenCalledWith('Failed to load theme:', jasmine.any(Error));
        expect(service.isThemeLoading()).toBe(false);
        expect(service.currentTheme()).toBeNull();
        expect(mockThemePreviewService.applyThemeCss).not.toHaveBeenCalled();
      });

      it('should not load theme if themeId is empty', () => {
        // Load empty theme
        service.loadTheme('');

        // Verify no API call was made
        expect(mockThemesApiService.getThemes).not.toHaveBeenCalled();
        expect(service.isThemeLoading()).toBe(false);
      });
    });

    describe('clearTheme', () => {
      it('should clear theme and reset state', () => {
        const mockTheme = {
          id: 'theme-1',
          name: 'Test Theme',
          description: 'A test theme',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          themeConfig: {
            desktop: {
              primaryColor: '#FF5733',
              secondaryColor: '#33FF57',
              backgroundColor: '#FFFFFF',
              textColorPrimary: '#000000',
              textColorSecondary: '#666666',
              fontFamilyHeading: 'Arial, sans-serif',
              fontFamilyBody: 'Helvetica, sans-serif',
              fieldBorderRadius: '8px',
              fieldSpacing: '12px',
              containerBackground: '#F5F5F5',
              containerOpacity: 0.9,
              containerPosition: 'center' as const,
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Set up current theme
        (service as any)._currentTheme.set(mockTheme);

        // Set up current form with theme
        const mockForm: FormMetadata = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
          schema: {
            id: 'schema-1',
            formId: 'form-1',
            version: 1,
            fields: [],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
              themeId: 'theme-1',
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
        service.setCurrentForm(mockForm);

        // Clear theme
        service.clearTheme();

        // Verify theme was cleared
        expect(service.currentTheme()).toBeNull();
        expect(service.isDirty()).toBe(true);
        expect(mockThemePreviewService.clearThemeCss).toHaveBeenCalled();

        // Verify form schema was updated
        const currentForm = service.currentForm();
        expect(currentForm?.schema?.settings?.themeId).toBeUndefined();
      });
    });
  });
});
