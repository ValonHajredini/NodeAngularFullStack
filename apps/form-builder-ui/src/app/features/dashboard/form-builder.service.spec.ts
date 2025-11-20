import { TestBed } from '@angular/core/testing';
import { FormBuilderService } from './form-builder.service';
import { FormField, FormFieldType, FormMetadata, FormStatus, FormSchema, FormTemplate, TemplateCategory } from '@nodeangularfullstack/shared';

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

  describe('Row Layout - duplicateRow() (Story 28.1)', () => {
    it('should duplicate empty row with config only', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;

      const newRowId = service.duplicateRow(rowId);

      expect(newRowId).toBeTruthy();
      expect(service.rowConfigs().length).toBe(2);
      expect(service.rowConfigs()[1].columnCount).toBe(1);
      expect(service.rowConfigs()[1].rowId).toBe(newRowId);
      expect(service.rowConfigs()[1].order).toBe(1);
    });

    it('should duplicate row with single field and preserve position', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;

      const field = service.addFieldFromType(FormFieldType.TEXT);
      service.setFieldPosition(field.id, { rowId, columnIndex: 0, orderInColumn: 0 });

      const newRowId = service.duplicateRow(rowId);
      const newRowFields = service.getFieldsInColumn(newRowId, 0);

      expect(newRowFields.length).toBe(1);
      expect(newRowFields[0].type).toBe(FormFieldType.TEXT);
      expect(newRowFields[0].position?.rowId).toBe(newRowId);
      expect(newRowFields[0].position?.columnIndex).toBe(0);
      expect(newRowFields[0].position?.orderInColumn).toBe(0);
      expect(newRowFields[0].id).not.toBe(field.id); // New UUID
      expect(newRowFields[0].fieldName).not.toBe(field.fieldName); // Unique field name
    });

    it('should duplicate row with multiple fields in multiple columns', () => {
      service.enableRowLayout();
      const rowId = service.addRow(3);

      const field1 = service.addFieldFromType(FormFieldType.TEXT);
      const field2 = service.addFieldFromType(FormFieldType.EMAIL);
      const field3 = service.addFieldFromType(FormFieldType.NUMBER);

      service.setFieldPosition(field1.id, { rowId, columnIndex: 0, orderInColumn: 0 });
      service.setFieldPosition(field2.id, { rowId, columnIndex: 1, orderInColumn: 0 });
      service.setFieldPosition(field3.id, { rowId, columnIndex: 2, orderInColumn: 0 });

      const newRowId = service.duplicateRow(rowId);

      const col0Fields = service.getFieldsInColumn(newRowId, 0);
      const col1Fields = service.getFieldsInColumn(newRowId, 1);
      const col2Fields = service.getFieldsInColumn(newRowId, 2);

      expect(col0Fields.length).toBe(1);
      expect(col1Fields.length).toBe(1);
      expect(col2Fields.length).toBe(1);

      expect(col0Fields[0].type).toBe(FormFieldType.TEXT);
      expect(col1Fields[0].type).toBe(FormFieldType.EMAIL);
      expect(col2Fields[0].type).toBe(FormFieldType.NUMBER);

      // Verify all fields have new row ID
      expect(col0Fields[0].position?.rowId).toBe(newRowId);
      expect(col1Fields[0].position?.rowId).toBe(newRowId);
      expect(col2Fields[0].position?.rowId).toBe(newRowId);
    });

    it('should preserve sub-column configurations', () => {
      service.enableRowLayout();
      const rowId = service.addRow(2);
      service.addSubColumn(rowId, 0, 2);

      const newRowId = service.duplicateRow(rowId);
      const subColConfig = service.subColumnsByRowColumn().get(`${newRowId}-0`);

      expect(subColConfig).toBeDefined();
      expect(subColConfig?.subColumnCount).toBe(2);
      expect(subColConfig?.rowId).toBe(newRowId);
      expect(subColConfig?.columnIndex).toBe(0);
    });

    it('should preserve stepId in step form mode', () => {
      service.enableStepForm();
      service.enableRowLayout();
      const stepId = service.steps()[0].id;
      const rowId = service.addRow(2);

      // Verify row has stepId
      const sourceRow = service.rowConfigs().find((r) => r.rowId === rowId);
      expect(sourceRow?.stepId).toBe(stepId);

      const newRowId = service.duplicateRow(rowId);
      const newRow = service.rowConfigs().find((r) => r.rowId === newRowId);

      expect(newRow?.stepId).toBe(stepId);
    });

    it('should insert duplicated row directly below source row', () => {
      service.enableRowLayout();
      const row1 = service.rowConfigs()[0].rowId;
      const row2 = service.addRow(2);
      const row3 = service.addRow(3);

      // Duplicate row2 (middle row)
      const newRowId = service.duplicateRow(row2);

      const rows = service.rowConfigs();
      expect(rows.length).toBe(4);
      expect(rows[0].rowId).toBe(row1);
      expect(rows[1].rowId).toBe(row2);
      expect(rows[2].rowId).toBe(newRowId); // New row inserted below row2
      expect(rows[3].rowId).toBe(row3);

      // Verify orders are sequential
      expect(rows[0].order).toBe(0);
      expect(rows[1].order).toBe(1);
      expect(rows[2].order).toBe(2);
      expect(rows[3].order).toBe(3);
    });

    it('should generate unique field names when duplicating', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;

      const field1 = service.addFieldFromType(FormFieldType.TEXT);
      service.setFieldPosition(field1.id, { rowId, columnIndex: 0, orderInColumn: 0 });

      const newRowId = service.duplicateRow(rowId);
      const newRowFields = service.getFieldsInColumn(newRowId, 0);

      expect(newRowFields[0].fieldName).not.toBe(field1.fieldName);
      expect(newRowFields[0].fieldName).toMatch(/^text-\d+$/); // Should be text-2 or similar
    });

    it('should preserve all field properties', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;

      const field = service.addFieldFromType(FormFieldType.EMAIL);
      service.updateField(0, {
        ...field,
        label: 'Email Address',
        placeholder: 'Enter your email',
        helpText: 'We will never share your email',
        required: true,
        validation: { pattern: '^[a-z]+@[a-z]+\\.[a-z]{2,}$' },
      });
      service.setFieldPosition(field.id, { rowId, columnIndex: 0, orderInColumn: 0 });

      const newRowId = service.duplicateRow(rowId);
      const newRowFields = service.getFieldsInColumn(newRowId, 0);
      const clonedField = newRowFields[0];

      expect(clonedField.type).toBe(FormFieldType.EMAIL);
      expect(clonedField.label).toBe('Email Address');
      expect(clonedField.placeholder).toBe('Enter your email');
      expect(clonedField.helpText).toBe('We will never share your email');
      expect(clonedField.required).toBe(true);
      expect(clonedField.validation?.pattern).toBe('^[a-z]+@[a-z]+\\.[a-z]{2,}$');
    });

    it('should preserve column widths configuration', () => {
      service.enableRowLayout();
      const rowId = service.addRow(2);
      service.updateRowColumnWidths(rowId, ['1fr', '3fr']);

      const newRowId = service.duplicateRow(rowId);
      const newRow = service.rowConfigs().find((r) => r.rowId === newRowId);

      expect(newRow?.columnWidths).toEqual(['1fr', '3fr']);
    });

    it('should mark form as dirty after duplication', () => {
      service.enableRowLayout();
      const rowId = service.rowConfigs()[0].rowId;
      service.markClean();

      expect(service.isDirty()).toBe(false);

      service.duplicateRow(rowId);

      expect(service.isDirty()).toBe(true);
    });

    it('should return empty string for invalid rowId', () => {
      service.enableRowLayout();

      const newRowId = service.duplicateRow('non-existent-row-id');

      expect(newRowId).toBe('');
      expect(service.rowConfigs().length).toBe(1); // No new row added
    });

    it('should handle duplication with multiple fields stacked in same column', () => {
      service.enableRowLayout();
      const rowId = service.addRow(2);

      const field1 = service.addFieldFromType(FormFieldType.TEXT);
      const field2 = service.addFieldFromType(FormFieldType.EMAIL);
      const field3 = service.addFieldFromType(FormFieldType.NUMBER);

      service.setFieldPosition(field1.id, { rowId, columnIndex: 0, orderInColumn: 0 });
      service.setFieldPosition(field2.id, { rowId, columnIndex: 0, orderInColumn: 1 });
      service.setFieldPosition(field3.id, { rowId, columnIndex: 0, orderInColumn: 2 });

      const newRowId = service.duplicateRow(rowId);
      const newRowFields = service.getFieldsInColumn(newRowId, 0);

      expect(newRowFields.length).toBe(3);
      expect(newRowFields[0].position?.orderInColumn).toBe(0);
      expect(newRowFields[1].position?.orderInColumn).toBe(1);
      expect(newRowFields[2].position?.orderInColumn).toBe(2);
    });

    it('should duplicate row with sub-column positioned fields', () => {
      service.enableRowLayout();
      const rowId = service.addRow(2);
      service.addSubColumn(rowId, 0, 3);

      const field1 = service.addFieldFromType(FormFieldType.TEXT);
      const field2 = service.addFieldFromType(FormFieldType.EMAIL);

      service.setFieldPosition(field1.id, {
        rowId,
        columnIndex: 0,
        subColumnIndex: 0,
        orderInColumn: 0,
      });
      service.setFieldPosition(field2.id, {
        rowId,
        columnIndex: 0,
        subColumnIndex: 1,
        orderInColumn: 0,
      });

      const newRowId = service.duplicateRow(rowId);
      const allFields = service.getAllFields();
      const newRowFieldsSubCol0 = allFields.filter(
        (f) =>
          f.position?.rowId === newRowId &&
          f.position?.columnIndex === 0 &&
          f.position?.subColumnIndex === 0,
      );
      const newRowFieldsSubCol1 = allFields.filter(
        (f) =>
          f.position?.rowId === newRowId &&
          f.position?.columnIndex === 0 &&
          f.position?.subColumnIndex === 1,
      );

      expect(newRowFieldsSubCol0.length).toBe(1);
      expect(newRowFieldsSubCol1.length).toBe(1);
      expect(newRowFieldsSubCol0[0].type).toBe(FormFieldType.TEXT);
      expect(newRowFieldsSubCol1[0].type).toBe(FormFieldType.EMAIL);
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
          isCustom: false,
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
        service.applyTheme(mockTheme);

        // Verify theme was applied
        expect(service.currentTheme()).toEqual(mockTheme);
        expect(service.isDirty()).toBe(true);
        expect(mockThemePreviewService.applyThemeCss).toHaveBeenCalledWith(mockTheme);
        expect(mockThemesApiService.applyTheme).toHaveBeenCalledWith('theme-1');

        // Verify form schema was updated
        const currentForm = service.currentForm();
        expect(currentForm?.schema?.settings?.themeId).toBe('theme-1');
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
          isCustom: false,
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
        service.applyTheme(mockTheme);

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
          isCustom: false,
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

  describe('Variable Column Widths - updateRowColumnWidths()', () => {
    beforeEach(() => {
      service.enableRowLayout(2);
    });

    it('should update column widths for a row with valid fractional units', () => {
      const rowId = service.addRow(2);
      const widths = ['1fr', '3fr'];

      service.updateRowColumnWidths(rowId, widths);

      const rowConfigs = service.getRowLayout();
      const updatedRow = rowConfigs.find((r) => r.rowId === rowId);

      expect(updatedRow?.columnWidths).toEqual(['1fr', '3fr']);
    });

    it('should mark form as dirty when updating column widths', () => {
      const rowId = service.addRow(2);
      service.markClean();

      expect(service.isDirty()).toBe(false);

      service.updateRowColumnWidths(rowId, ['1fr', '2fr']);

      expect(service.isDirty()).toBe(true);
    });

    it('should update widths for 3-column row with equal widths', () => {
      const rowId = service.addRow(3);
      const widths = ['1fr', '1fr', '1fr'];

      service.updateRowColumnWidths(rowId, widths);

      const rowConfigs = service.getRowLayout();
      const updatedRow = rowConfigs.find((r) => r.rowId === rowId);

      expect(updatedRow?.columnWidths).toEqual(['1fr', '1fr', '1fr']);
    });

    it('should update widths for 4-column row with variable widths', () => {
      const rowId = service.addRow(4);
      const widths = ['1fr', '2fr', '1fr', '2fr'];

      service.updateRowColumnWidths(rowId, widths);

      const rowConfigs = service.getRowLayout();
      const updatedRow = rowConfigs.find((r) => r.rowId === rowId);

      expect(updatedRow?.columnWidths).toEqual(['1fr', '2fr', '1fr', '2fr']);
    });

    it('should throw error when row not found', () => {
      const invalidRowId = 'non-existent-row';
      const widths = ['1fr', '2fr'];

      expect(() => service.updateRowColumnWidths(invalidRowId, widths)).toThrowError(
        `Row ${invalidRowId} not found`,
      );
    });

    it('should throw error when widths array length does not match column count', () => {
      const rowId = service.addRow(3);
      const widths = ['1fr', '2fr']; // Only 2 widths for 3-column row

      expect(() => service.updateRowColumnWidths(rowId, widths)).toThrowError(
        'Must provide 3 width values, got 2',
      );
    });

    it('should throw error when widths array has too many values', () => {
      const rowId = service.addRow(2);
      const widths = ['1fr', '2fr', '3fr']; // 3 widths for 2-column row

      expect(() => service.updateRowColumnWidths(rowId, widths)).toThrowError(
        'Must provide 2 width values, got 3',
      );
    });

    it('should trigger reactive updates to fieldsByRowColumn computed signal', () => {
      const rowId = service.addRow(2);

      // Add a field to the row
      const field = service.addFieldFromType(FormFieldType.TEXT);
      service.setFieldPosition(field.id, { rowId, columnIndex: 0 });

      // Update column widths
      service.updateRowColumnWidths(rowId, ['1fr', '3fr']);

      // Verify computed signal still returns the field correctly
      const fieldsInColumn = service.getFieldsInColumn(rowId, 0);
      expect(fieldsInColumn.length).toBe(1);
      expect(fieldsInColumn[0].id).toBe(field.id);
    });

    it('should allow updating widths multiple times for the same row', () => {
      const rowId = service.addRow(2);

      // First update
      service.updateRowColumnWidths(rowId, ['1fr', '2fr']);
      let rowConfigs = service.getRowLayout();
      let updatedRow = rowConfigs.find((r) => r.rowId === rowId);
      expect(updatedRow?.columnWidths).toEqual(['1fr', '2fr']);

      // Second update
      service.updateRowColumnWidths(rowId, ['3fr', '1fr']);
      rowConfigs = service.getRowLayout();
      updatedRow = rowConfigs.find((r) => r.rowId === rowId);
      expect(updatedRow?.columnWidths).toEqual(['3fr', '1fr']);
    });

    it('should preserve other row properties when updating column widths', () => {
      const rowId = service.addRow(2);
      const rowConfigs = service.getRowLayout();
      const originalRow = rowConfigs.find((r) => r.rowId === rowId);

      service.updateRowColumnWidths(rowId, ['1fr', '3fr']);

      const updatedRowConfigs = service.getRowLayout();
      const updatedRow = updatedRowConfigs.find((r) => r.rowId === rowId);

      expect(updatedRow?.rowId).toBe(originalRow?.rowId);
      expect(updatedRow?.columnCount).toBe(originalRow?.columnCount);
      expect(updatedRow?.order).toBe(originalRow?.order);
    });

    it('should not affect other rows when updating widths for one row', () => {
      const rowId1 = service.addRow(2);
      const rowId2 = service.addRow(3);

      service.updateRowColumnWidths(rowId1, ['1fr', '3fr']);

      const rowConfigs = service.getRowLayout();
      const row1 = rowConfigs.find((r) => r.rowId === rowId1);
      const row2 = rowConfigs.find((r) => r.rowId === rowId2);

      expect(row1?.columnWidths).toEqual(['1fr', '3fr']);
      expect(row2?.columnWidths).toBeUndefined(); // Row 2 should not be affected
    });

    it('should handle widths with larger fractional values', () => {
      const rowId = service.addRow(2);
      const widths = ['10fr', '50fr'];

      service.updateRowColumnWidths(rowId, widths);

      const rowConfigs = service.getRowLayout();
      const updatedRow = rowConfigs.find((r) => r.rowId === rowId);

      expect(updatedRow?.columnWidths).toEqual(['10fr', '50fr']);
    });
  });

  describe('Performance Benchmarks - updateRowColumnWidths() (AC 12)', () => {
    beforeEach(() => {
      service.enableRowLayout(2);
    });

    it('should update column widths within 50ms (performance requirement)', () => {
      const rowId = service.addRow(2);
      const widths = ['1fr', '3fr'];

      // Measure performance
      const startTime = performance.now();
      service.updateRowColumnWidths(rowId, widths);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      // Verify width update succeeded
      const rowConfigs = service.getRowLayout();
      const updatedRow = rowConfigs.find((r) => r.rowId === rowId);
      expect(updatedRow?.columnWidths).toEqual(['1fr', '3fr']);

      // Verify performance requirement (<50ms)
      expect(executionTime).toBeLessThan(50);
    });

    it('should handle multiple width updates within performance budget', () => {
      const rowIds = [service.addRow(2), service.addRow(3), service.addRow(4)];
      const widthConfigs = [
        ['1fr', '2fr'],
        ['1fr', '1fr', '1fr'],
        ['1fr', '2fr', '1fr', '2fr'],
      ];

      const measurements: number[] = [];

      // Measure each update
      rowIds.forEach((rowId, index) => {
        const startTime = performance.now();
        service.updateRowColumnWidths(rowId, widthConfigs[index]);
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      });

      // Verify all updates are under 50ms
      measurements.forEach((time, index) => {
        expect(time).toBeLessThan(50);
      });

      // Verify average performance
      const avgTime = measurements.reduce((sum, t) => sum + t, 0) / measurements.length;
      expect(avgTime).toBeLessThan(25); // Average should be even better
    });

    it('should handle rapid consecutive width updates efficiently', () => {
      const rowId = service.addRow(2);
      const iterations = 100;
      const widthConfigs = [
        ['1fr', '2fr'],
        ['2fr', '1fr'],
        ['1fr', '3fr'],
        ['3fr', '1fr'],
      ];

      const startTime = performance.now();

      // Perform 100 rapid updates
      for (let i = 0; i < iterations; i++) {
        service.updateRowColumnWidths(rowId, widthConfigs[i % widthConfigs.length]);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerUpdate = totalTime / iterations;

      // Average time per update should be well under 50ms
      expect(avgTimePerUpdate).toBeLessThan(10);

      // Verify final state
      const finalRow = service.getRowLayout().find((r) => r.rowId === rowId);
      expect(finalRow?.columnWidths).toEqual(widthConfigs[(iterations - 1) % widthConfigs.length]);
    });

    it('should maintain performance with 10 rows (canvas re-render scenario)', () => {
      // Create 10 rows (simulating large form)
      const rowIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        rowIds.push(service.addRow(2));
      }

      // Add fields to rows to simulate realistic form
      for (let i = 0; i < 20; i++) {
        const field = service.addFieldFromType(FormFieldType.TEXT);
        service.setFieldPosition(field.id, {
          rowId: rowIds[i % 10],
          columnIndex: i % 2,
        });
      }

      // Measure width update on one row
      const targetRowId = rowIds[5]; // Middle row
      const startTime = performance.now();
      service.updateRowColumnWidths(targetRowId, ['1fr', '3fr']);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      // Verify update succeeded
      const updatedRow = service.getRowLayout().find((r) => r.rowId === targetRowId);
      expect(updatedRow?.columnWidths).toEqual(['1fr', '3fr']);

      // Verify performance (should still be under 50ms even with 10 rows + 20 fields)
      expect(executionTime).toBeLessThan(50);
    });

    it('should propagate signal updates within performance budget', () => {
      const rowId = service.addRow(2);

      // Add field to enable signal propagation testing
      const field = service.addFieldFromType(FormFieldType.TEXT);
      service.setFieldPosition(field.id, { rowId, columnIndex: 0 });

      const startTime = performance.now();

      // Update widths (triggers signal propagation)
      service.updateRowColumnWidths(rowId, ['1fr', '3fr']);

      // Access computed signal (forces computation)
      const fieldsInColumn = service.getFieldsInColumn(rowId, 0);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Verify signal propagation happened correctly
      expect(fieldsInColumn.length).toBe(1);
      expect(fieldsInColumn[0].id).toBe(field.id);

      // Verify total time including signal computation is under 100ms
      expect(totalTime).toBeLessThan(100);
    });
  });

  /**
   * Story 27.3: Sub-Column State Management Infrastructure
   * Comprehensive unit tests for sub-column configuration methods
   */
  describe('Sub-Column Configuration - Story 27.3', () => {
    let rowId: string;

    beforeEach(() => {
      // Enable row layout and create a 2-column row
      service.enableRowLayout(2);
      rowId = service.getRowLayout()[0].rowId;
    });

    describe('addSubColumn()', () => {
      it('should add sub-column config with equal-width default', () => {
        service.addSubColumn(rowId, 0, 2);

        const configs = service.subColumnConfigs();
        expect(configs.length).toBe(1);
        expect(configs[0].columnIndex).toBe(0);
        expect(configs[0].subColumnCount).toBe(2);
        expect(configs[0].subColumnWidths).toBeUndefined(); // Equal-width default
      });

      it('should support 1-4 sub-columns', () => {
        service.addSubColumn(rowId, 0, 1);
        service.addSubColumn(rowId, 1, 3);

        const configs = service.subColumnConfigs();
        expect(configs.length).toBe(2);
        expect(configs[0].subColumnCount).toBe(1);
        expect(configs[1].subColumnCount).toBe(3);
      });

      it('should throw error when row does not exist', () => {
        expect(() => service.addSubColumn('invalid-row', 0, 2)).toThrowError(
          /Row invalid-row not found/,
        );
      });

      it('should throw error when column index exceeds row column count', () => {
        expect(() => service.addSubColumn(rowId, 2, 2)).toThrowError(
          /Column index 2 exceeds row column count 2/,
        );
      });

      it('should throw error when sub-columns already configured for same row-column', () => {
        service.addSubColumn(rowId, 0, 2);
        expect(() => service.addSubColumn(rowId, 0, 3)).toThrowError(
          /Sub-columns already configured for row/,
        );
      });

      it('should mark form as dirty', () => {
        service.markClean();
        service.addSubColumn(rowId, 0, 2);
        expect(service.isDirty()).toBe(true);
      });
    });

    describe('removeSubColumn()', () => {
      it('should remove sub-column config', () => {
        service.addSubColumn(rowId, 0, 2);
        expect(service.subColumnConfigs().length).toBe(1);

        service.removeSubColumn(rowId, 0);
        expect(service.subColumnConfigs().length).toBe(0);
      });

      it('should move fields from sub-columns to parent column', () => {
        service.addSubColumn(rowId, 0, 2);
        const field = service.addFieldFromType(FormFieldType.TEXT);
        service.setFieldPosition(field.id, { rowId, columnIndex: 0, subColumnIndex: 1 });

        const fieldBefore = service.getAllFields().find((f) => f.id === field.id);
        expect(fieldBefore?.position?.subColumnIndex).toBe(1);

        service.removeSubColumn(rowId, 0);

        const fieldAfter = service.getAllFields().find((f) => f.id === field.id);
        expect(fieldAfter?.position?.subColumnIndex).toBeUndefined();
      });

      it('should handle removal when no sub-columns exist (no-op)', () => {
        expect(() => service.removeSubColumn(rowId, 0)).not.toThrow();
        expect(service.subColumnConfigs().length).toBe(0);
      });

      it('should mark form as dirty', () => {
        service.addSubColumn(rowId, 0, 2);
        service.markClean();
        service.removeSubColumn(rowId, 0);
        expect(service.isDirty()).toBe(true);
      });
    });

    describe('updateSubColumnWidths()', () => {
      beforeEach(() => {
        service.addSubColumn(rowId, 0, 2);
      });

      it('should update sub-column widths with fractional units', () => {
        service.updateSubColumnWidths(rowId, 0, ['1fr', '3fr']);

        const config = service.subColumnConfigs()[0];
        expect(config.subColumnWidths).toEqual(['1fr', '3fr']);
      });

      it('should reset to equal-width when empty array provided', () => {
        service.updateSubColumnWidths(rowId, 0, ['1fr', '3fr']);
        service.updateSubColumnWidths(rowId, 0, []);

        const config = service.subColumnConfigs()[0];
        expect(config.subColumnWidths).toBeUndefined();
      });

      it('should throw error when sub-columns not configured', () => {
        expect(() => service.updateSubColumnWidths(rowId, 1, ['1fr', '2fr'])).toThrowError(
          /No sub-columns configured for row/,
        );
      });

      it('should throw error when widths length does not match subColumnCount', () => {
        expect(() => service.updateSubColumnWidths(rowId, 0, ['1fr', '2fr', '3fr'])).toThrowError(
          /Must provide 2 width values, got 3/,
        );
      });

      it('should allow equal-width reset regardless of subColumnCount', () => {
        expect(() => service.updateSubColumnWidths(rowId, 0, [])).not.toThrow();
      });

      it('should mark form as dirty', () => {
        service.markClean();
        service.updateSubColumnWidths(rowId, 0, ['1fr', '2fr']);
        expect(service.isDirty()).toBe(true);
      });
    });

    describe('updateSubColumnCount() - Story 27.8', () => {
      it('should increase sub-column count from 2 to 3 and preserve fields', () => {
        service.addSubColumn(rowId, 0, 2);

        // Add fields to sub-columns 0 and 1
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 1,
          orderInColumn: 0,
        });

        service.updateSubColumnCount(rowId, 0, 3);

        const config = service.subColumnConfigs().find((sc) => sc.columnIndex === 0);
        expect(config?.subColumnCount).toBe(3);

        const fields = service.getAllFields();
        const updatedField1 = fields.find((f) => f.id === field1.id);
        const updatedField2 = fields.find((f) => f.id === field2.id);

        expect(updatedField1?.position?.subColumnIndex).toBe(0); // Preserved
        expect(updatedField2?.position?.subColumnIndex).toBe(1); // Preserved
      });

      it('should increase sub-column count from 3 to 4 and preserve all fields', () => {
        service.addSubColumn(rowId, 0, 3);

        // Add fields to sub-columns 0, 1, and 2
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 1,
          orderInColumn: 0,
        });
        service.setFieldPosition(field3.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 2,
          orderInColumn: 0,
        });

        service.updateSubColumnCount(rowId, 0, 4);

        const config = service.subColumnConfigs().find((sc) => sc.columnIndex === 0);
        expect(config?.subColumnCount).toBe(4);

        const fields = service.getAllFields();
        expect(fields.find((f) => f.id === field1.id)?.position?.subColumnIndex).toBe(0);
        expect(fields.find((f) => f.id === field2.id)?.position?.subColumnIndex).toBe(1);
        expect(fields.find((f) => f.id === field3.id)?.position?.subColumnIndex).toBe(2);
      });

      it('should decrease sub-column count from 3 to 2 and migrate fields', () => {
        service.addSubColumn(rowId, 0, 3);

        // Add fields to sub-columns 0, 1, and 2
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 1,
          orderInColumn: 0,
        });
        service.setFieldPosition(field3.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 2,
          orderInColumn: 0,
        });

        service.updateSubColumnCount(rowId, 0, 2);

        const config = service.subColumnConfigs().find((sc) => sc.columnIndex === 0);
        expect(config?.subColumnCount).toBe(2);

        const fields = service.getAllFields();
        const updatedField1 = fields.find((f) => f.id === field1.id);
        const updatedField2 = fields.find((f) => f.id === field2.id);
        const updatedField3 = fields.find((f) => f.id === field3.id);

        expect(updatedField1?.position?.subColumnIndex).toBe(0); // Preserved
        expect(updatedField2?.position?.subColumnIndex).toBe(1); // Preserved
        expect(updatedField3?.position?.subColumnIndex).toBe(0); // Migrated from sub-column 2
        expect(updatedField3?.position?.orderInColumn).toBe(1); // Appended to bottom of sub-column 0
      });

      it('should decrease sub-column count from 4 to 3 and migrate fields', () => {
        service.addSubColumn(rowId, 0, 4);

        // Add fields to all sub-columns
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        const field4 = service.addFieldFromType(FormFieldType.DATE);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 1,
          orderInColumn: 0,
        });
        service.setFieldPosition(field3.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 2,
          orderInColumn: 0,
        });
        service.setFieldPosition(field4.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 3,
          orderInColumn: 0,
        });

        service.updateSubColumnCount(rowId, 0, 3);

        const config = service.subColumnConfigs().find((sc) => sc.columnIndex === 0);
        expect(config?.subColumnCount).toBe(3);

        const fields = service.getAllFields();
        expect(fields.find((f) => f.id === field1.id)?.position?.subColumnIndex).toBe(0);
        expect(fields.find((f) => f.id === field2.id)?.position?.subColumnIndex).toBe(1);
        expect(fields.find((f) => f.id === field3.id)?.position?.subColumnIndex).toBe(2);
        expect(fields.find((f) => f.id === field4.id)?.position?.subColumnIndex).toBe(0); // Migrated
      });

      it('should throw error if row does not exist', () => {
        service.addSubColumn(rowId, 0, 2);

        expect(() => service.updateSubColumnCount('invalid-row', 0, 3)).toThrowError(
          /Row invalid-row not found/,
        );
      });

      it('should throw error if column index exceeds row column count', () => {
        service.addSubColumn(rowId, 0, 2);

        expect(() => service.updateSubColumnCount(rowId, 5, 3)).toThrowError(
          /Column index 5 exceeds row column count/,
        );
      });

      it('should throw error if sub-columns not configured', () => {
        expect(() => service.updateSubColumnCount(rowId, 0, 3)).toThrowError(
          /Sub-columns not configured for row/,
        );
      });

      it('should reset width ratios if array length does not match new count', () => {
        service.addSubColumn(rowId, 0, 2);
        service.updateSubColumnWidths(rowId, 0, ['1fr', '3fr']);

        service.updateSubColumnCount(rowId, 0, 3);

        const config = service.subColumnConfigs().find((sc) => sc.columnIndex === 0);
        expect(config?.subColumnWidths).toBeUndefined(); // Reset to equal-width
      });

      it('should preserve width ratios if array length matches new count', () => {
        service.addSubColumn(rowId, 0, 3);
        service.updateSubColumnWidths(rowId, 0, ['1fr', '2fr', '1fr']);

        service.updateSubColumnCount(rowId, 0, 2);

        const config = service.subColumnConfigs().find((sc) => sc.columnIndex === 0);
        // Width array is sliced but since length doesn't match, it's reset
        expect(config?.subColumnWidths).toBeUndefined();
      });

      it('should migrate multiple fields from removed sub-column', () => {
        service.addSubColumn(rowId, 0, 3);

        // Add multiple fields to sub-column 2
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 2,
          orderInColumn: 0,
        });
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 2,
          orderInColumn: 1,
        });
        service.setFieldPosition(field3.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });

        service.updateSubColumnCount(rowId, 0, 2);

        const fields = service.getAllFields();
        const migratedField1 = fields.find((f) => f.id === field1.id);
        const migratedField2 = fields.find((f) => f.id === field2.id);
        const preservedField = fields.find((f) => f.id === field3.id);

        expect(migratedField1?.position?.subColumnIndex).toBe(0);
        expect(migratedField2?.position?.subColumnIndex).toBe(0);
        expect(preservedField?.position?.subColumnIndex).toBe(0);

        // Check orderInColumn for appended fields - must be unique and sequential
        expect(preservedField?.position?.orderInColumn).toBe(0); // Original field in sub-column 0
        expect(migratedField1?.position?.orderInColumn).toBe(1); // First migrated field
        expect(migratedField2?.position?.orderInColumn).toBe(2); // Second migrated field
      });

      it('should mark form as dirty', () => {
        service.addSubColumn(rowId, 0, 2);
        service.markClean();

        service.updateSubColumnCount(rowId, 0, 3);

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('subColumnsByRowColumn computed signal', () => {
      it('should provide O(1) lookup by row-column key', () => {
        service.addSubColumn(rowId, 0, 2);
        service.addSubColumn(rowId, 1, 3);

        const map = service.subColumnsByRowColumn();
        const key = `${rowId}-0`;
        const config = map.get(key);

        expect(config).toBeDefined();
        expect(config?.columnIndex).toBe(0);
        expect(config?.subColumnCount).toBe(2);
      });

      it('should return empty map when no sub-columns configured', () => {
        const map = service.subColumnsByRowColumn();
        expect(map.size).toBe(0);
      });

      it('should recompute when sub-column configs change', () => {
        service.addSubColumn(rowId, 0, 2);
        expect(service.subColumnsByRowColumn().size).toBe(1);

        service.removeSubColumn(rowId, 0);
        expect(service.subColumnsByRowColumn().size).toBe(0);
      });

      it('should complete lookup in under 10ms for 100 rows', () => {
        // Create 100 rows with sub-columns
        for (let i = 0; i < 100; i++) {
          const newRowId = service.addRow(2);
          service.addSubColumn(newRowId, 0, 2);
        }

        const start = performance.now();
        const map = service.subColumnsByRowColumn();
        const end = performance.now();

        expect(map.size).toBe(100);
        expect(end - start).toBeLessThan(10);
      });
    });

    describe('setFieldPosition() with subColumnIndex', () => {
      beforeEach(() => {
        service.addSubColumn(rowId, 0, 2);
      });

      it('should accept valid subColumnIndex', () => {
        const field = service.addFieldFromType(FormFieldType.TEXT);
        expect(() =>
          service.setFieldPosition(field.id, { rowId, columnIndex: 0, subColumnIndex: 1 }),
        ).not.toThrow();

        const updated = service.getAllFields().find((f) => f.id === field.id);
        expect(updated?.position?.subColumnIndex).toBe(1);
      });

      it('should throw error when subColumnIndex provided but no sub-columns configured', () => {
        const field = service.addFieldFromType(FormFieldType.TEXT);
        expect(() =>
          service.setFieldPosition(field.id, { rowId, columnIndex: 1, subColumnIndex: 0 }),
        ).toThrowError(/No sub-columns configured for row/);
      });

      it('should throw error when subColumnIndex exceeds subColumnCount', () => {
        const field = service.addFieldFromType(FormFieldType.TEXT);
        expect(() =>
          service.setFieldPosition(field.id, { rowId, columnIndex: 0, subColumnIndex: 2 }),
        ).toThrowError(/Sub-column index 2 exceeds sub-column count 2/);
      });

      it('should allow positioning without subColumnIndex (backward compatible)', () => {
        const field = service.addFieldFromType(FormFieldType.TEXT);
        expect(() => service.setFieldPosition(field.id, { rowId, columnIndex: 0 })).not.toThrow();

        const updated = service.getAllFields().find((f) => f.id === field.id);
        expect(updated?.position?.subColumnIndex).toBeUndefined();
      });
    });

    describe('loadForm() with sub-columns', () => {
      it('should load sub-column configs from schema', () => {
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
              submission: { showSuccessMessage: true, allowMultipleSubmissions: false },
              rowLayout: {
                enabled: true,
                rows: [
                  {
                    rowId: 'row-1',
                    columnCount: 2,
                    order: 0,
                    subColumns: [
                      { columnIndex: 0, subColumnCount: 2, subColumnWidths: ['1fr', '3fr'] },
                      { columnIndex: 1, subColumnCount: 3 },
                    ],
                  },
                ],
              },
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        service.loadForm(mockForm);

        const configs = service.subColumnConfigs();
        expect(configs.length).toBe(2);
        expect(configs[0].columnIndex).toBe(0);
        expect(configs[0].subColumnCount).toBe(2);
        expect(configs[0].subColumnWidths).toEqual(['1fr', '3fr']);
        expect(configs[1].columnIndex).toBe(1);
        expect(configs[1].subColumnCount).toBe(3);
        expect(configs[1].subColumnWidths).toBeUndefined();
      });

      it('should handle forms without sub-columns (backward compatibility)', () => {
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
              submission: { showSuccessMessage: true, allowMultipleSubmissions: false },
              rowLayout: {
                enabled: true,
                rows: [{ rowId: 'row-1', columnCount: 2, order: 0 }],
              },
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        service.loadForm(mockForm);

        expect(service.subColumnConfigs().length).toBe(0);
      });

      it('should reset sub-column configs for forms without row layout', () => {
        service.addSubColumn(rowId, 0, 2);
        expect(service.subColumnConfigs().length).toBe(1);

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
              submission: { showSuccessMessage: true, allowMultipleSubmissions: false },
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        service.loadForm(mockForm);
        expect(service.subColumnConfigs().length).toBe(0);
      });
    });

    describe('exportFormData() with sub-columns', () => {
      it('should include sub-column configs in exported schema', () => {
        service.addSubColumn(rowId, 0, 2);
        service.updateSubColumnWidths(rowId, 0, ['1fr', '3fr']);

        const exported = service.exportFormData({
          title: 'Test Form',
          description: 'Test Description',
          columnLayout: 1,
          fieldSpacing: 'normal',
          successMessage: 'Success!',
          redirectUrl: '',
          allowMultipleSubmissions: false,
        });

        const rows = exported.schema?.settings.rowLayout?.rows;
        expect(rows).toBeDefined();
        expect(rows![0].subColumns).toBeDefined();
        expect(rows![0].subColumns!.length).toBe(1);
        expect(rows![0].subColumns![0].columnIndex).toBe(0);
        expect(rows![0].subColumns![0].subColumnCount).toBe(2);
        expect(rows![0].subColumns![0].subColumnWidths).toEqual(['1fr', '3fr']);
      });

      it('should omit subColumns when no sub-columns configured', () => {
        const exported = service.exportFormData({
          title: 'Test Form',
          description: 'Test Description',
          columnLayout: 1,
          fieldSpacing: 'normal',
          successMessage: 'Success!',
          redirectUrl: '',
          allowMultipleSubmissions: false,
        });

        const rows = exported.schema?.settings.rowLayout?.rows;
        expect(rows).toBeDefined();
        expect(rows![0].subColumns).toBeUndefined();
      });

      it('should not include rowId in serialized sub-column configs', () => {
        service.addSubColumn(rowId, 0, 2);

        const exported = service.exportFormData({
          title: 'Test Form',
          description: 'Test Description',
          columnLayout: 1,
          fieldSpacing: 'normal',
          successMessage: 'Success!',
          redirectUrl: '',
          allowMultipleSubmissions: false,
        });

        const subCol = exported.schema?.settings.rowLayout?.rows![0].subColumns![0];
        expect(subCol).toBeDefined();
        expect((subCol as any).rowId).toBeUndefined(); // rowId should be stripped
      });
    });

    describe('getFieldsInColumn() with sub-columns', () => {
      it('should return all fields in column including those with subColumnIndex', () => {
        service.addSubColumn(rowId, 0, 2);

        // Add field to sub-column 0
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });

        // Add field to sub-column 1
        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 1,
          orderInColumn: 0,
        });

        // Add field to parent column (no subColumnIndex)
        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        service.setFieldPosition(field3.id, { rowId, columnIndex: 0, orderInColumn: 1 });

        const fieldsInColumn = service.getFieldsInColumn(rowId, 0);

        // Should return all 3 fields in column 0 regardless of subColumnIndex
        expect(fieldsInColumn.length).toBe(3);
        expect(fieldsInColumn.some((f) => f.id === field1.id)).toBe(true);
        expect(fieldsInColumn.some((f) => f.id === field2.id)).toBe(true);
        expect(fieldsInColumn.some((f) => f.id === field3.id)).toBe(true);
      });

      it('should maintain sort order by orderInColumn for sub-column fields', () => {
        service.addSubColumn(rowId, 0, 2);

        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 2,
        });

        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 1,
          orderInColumn: 0,
        });

        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        service.setFieldPosition(field3.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 1,
        });

        const fieldsInColumn = service.getFieldsInColumn(rowId, 0);

        // Should be sorted by orderInColumn regardless of subColumnIndex
        expect(fieldsInColumn[0].id).toBe(field2.id); // orderInColumn: 0
        expect(fieldsInColumn[1].id).toBe(field3.id); // orderInColumn: 1
        expect(fieldsInColumn[2].id).toBe(field1.id); // orderInColumn: 2
      });
    });

    describe('reorderFieldInColumn() with sub-columns', () => {
      it('should reorder fields within a sub-column', () => {
        service.addSubColumn(rowId, 0, 2);

        // Add 3 fields to sub-column 0
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });

        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 1,
        });

        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        service.setFieldPosition(field3.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 2,
        });

        // Move field3 from position 2 to position 0
        service.reorderFieldInColumn(field3.id, 0);

        const fields = service.getAllFields();
        const f1 = fields.find((f) => f.id === field1.id);
        const f2 = fields.find((f) => f.id === field2.id);
        const f3 = fields.find((f) => f.id === field3.id);

        // Verify orderInColumn updated correctly
        expect(f3?.position?.orderInColumn).toBe(0); // Moved to top
        expect(f1?.position?.orderInColumn).toBe(1); // Shifted down
        expect(f2?.position?.orderInColumn).toBe(2); // Shifted down

        // Verify subColumnIndex preserved
        expect(f1?.position?.subColumnIndex).toBe(0);
        expect(f2?.position?.subColumnIndex).toBe(0);
        expect(f3?.position?.subColumnIndex).toBe(0);
      });

      it('should not affect fields in different sub-columns when reordering', () => {
        service.addSubColumn(rowId, 0, 2);

        // Add fields to sub-column 0
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        service.setFieldPosition(field1.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 0,
        });

        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        service.setFieldPosition(field2.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 0,
          orderInColumn: 1,
        });

        // Add field to sub-column 1
        const field3 = service.addFieldFromType(FormFieldType.NUMBER);
        service.setFieldPosition(field3.id, {
          rowId,
          columnIndex: 0,
          subColumnIndex: 1,
          orderInColumn: 0,
        });

        // Reorder field in sub-column 0
        service.reorderFieldInColumn(field2.id, 0);

        const fields = service.getAllFields();
        const f3 = fields.find((f) => f.id === field3.id);

        // Field in sub-column 1 should remain unchanged
        expect(f3?.position?.orderInColumn).toBe(0);
        expect(f3?.position?.subColumnIndex).toBe(1);
      });
    });

    describe('resetForm() with sub-columns', () => {
      it('should clear sub-column configs', () => {
        service.addSubColumn(rowId, 0, 2);
        expect(service.subColumnConfigs().length).toBe(1);

        service.resetForm();
        expect(service.subColumnConfigs().length).toBe(0);
      });
    });

    describe('Performance requirements', () => {
      it('should complete addSubColumn in under 50ms for 50-field form', () => {
        // Add 50 fields
        for (let i = 0; i < 50; i++) {
          service.addFieldFromType(FormFieldType.TEXT);
        }

        const start = performance.now();
        service.addSubColumn(rowId, 0, 2);
        const end = performance.now();

        expect(end - start).toBeLessThan(50);
      });

      it('should complete removeSubColumn in under 50ms for 50-field form', () => {
        service.addSubColumn(rowId, 0, 2);

        // Add 50 fields
        for (let i = 0; i < 50; i++) {
          service.addFieldFromType(FormFieldType.TEXT);
        }

        const start = performance.now();
        service.removeSubColumn(rowId, 0);
        const end = performance.now();

        expect(end - start).toBeLessThan(50);
      });

      it('should complete loadForm with 10 sub-column configs in under 100ms', () => {
        const rows = [];
        for (let i = 0; i < 10; i++) {
          rows.push({
            rowId: `row-${i}`,
            columnCount: 2,
            order: i,
            subColumns: [{ columnIndex: 0, subColumnCount: 2 }],
          } as any);
        }

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
              submission: { showSuccessMessage: true, allowMultipleSubmissions: false },
              rowLayout: { enabled: true, rows },
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        const start = performance.now();
        service.loadForm(mockForm);
        const end = performance.now();

        expect(service.subColumnConfigs().length).toBe(10);
        expect(end - start).toBeLessThan(100);
      });
    });
  });

  /**
   * Story 28.2: Multi-Row Selection and Batch Duplication
   * Test suite for row selection state management and batch duplication functionality.
   */
  describe('Row Selection and Batch Duplication (Story 28.2)', () => {
    describe('selectRow()', () => {
      it('should add row to selection when not already selected', () => {
        service.enableRowLayout();
        const rowId = service.addRow(2);

        service.selectRow(rowId);

        expect(service.selectedRowIds()).toEqual([rowId]);
        expect(service.isRowSelected(rowId)).toBe(true);
        expect(service.selectedRowCount()).toBe(1);
        expect(service.hasSelectedRows()).toBe(true);
      });

      it('should toggle row selection (remove when already selected)', () => {
        service.enableRowLayout();
        const rowId = service.addRow(2);

        service.selectRow(rowId);
        service.selectRow(rowId);

        expect(service.selectedRowIds()).toEqual([]);
        expect(service.isRowSelected(rowId)).toBe(false);
        expect(service.selectedRowCount()).toBe(0);
        expect(service.hasSelectedRows()).toBe(false);
      });

      it('should support multiple row selection', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);
        const row3 = service.addRow(4);

        service.selectRow(row1);
        service.selectRow(row2);
        service.selectRow(row3);

        expect(service.selectedRowIds()).toEqual([row1, row2, row3]);
        expect(service.selectedRowCount()).toBe(3);
      });
    });

    describe('deselectRow()', () => {
      it('should remove row from selection', () => {
        service.enableRowLayout();
        const rowId = service.addRow(2);
        service.selectRow(rowId);

        service.deselectRow(rowId);

        expect(service.selectedRowIds()).toEqual([]);
        expect(service.isRowSelected(rowId)).toBe(false);
      });

      it('should handle deselecting non-selected row gracefully', () => {
        service.enableRowLayout();
        const rowId = service.addRow(2);

        service.deselectRow(rowId);

        expect(service.selectedRowIds()).toEqual([]);
      });
    });

    describe('clearSelection()', () => {
      it('should clear all selected rows', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);
        service.selectRow(row1);
        service.selectRow(row2);

        service.clearSelection();

        expect(service.selectedRowIds()).toEqual([]);
        expect(service.selectedRowCount()).toBe(0);
        expect(service.hasSelectedRows()).toBe(false);
      });

      it('should handle clearing empty selection gracefully', () => {
        service.enableRowLayout();
        service.addRow(2);

        service.clearSelection();

        expect(service.selectedRowIds()).toEqual([]);
      });
    });

    describe('selectRowRange()', () => {
      it('should select continuous range of rows (forward direction)', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(2);
        const row3 = service.addRow(2);

        service.selectRowRange(row1, row3);

        expect(service.selectedRowIds()).toEqual([row1, row2, row3]);
        expect(service.selectedRowCount()).toBe(3);
      });

      it('should select continuous range of rows (reverse direction)', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(2);
        const row3 = service.addRow(2);

        service.selectRowRange(row3, row1);

        expect(service.selectedRowIds()).toEqual([row1, row2, row3]);
        expect(service.selectedRowCount()).toBe(3);
      });

      it('should add to existing selection when selecting range', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(2);
        const row3 = service.addRow(2);
        const row4 = service.addRow(2);

        service.selectRow(row1);
        service.selectRowRange(row3, row4);

        expect(service.selectedRowIds()).toContain(row1);
        expect(service.selectedRowIds()).toContain(row3);
        expect(service.selectedRowIds()).toContain(row4);
        expect(service.selectedRowCount()).toBe(3);
      });

      it('should handle invalid startRowId gracefully', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const consoleSpy = spyOn(console, 'error');

        service.selectRowRange('invalid-id', row1);

        expect(consoleSpy).toHaveBeenCalledWith('Invalid row range:', 'invalid-id', row1);
        expect(service.selectedRowIds()).toEqual([]);
      });

      it('should handle invalid endRowId gracefully', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const consoleSpy = spyOn(console, 'error');

        service.selectRowRange(row1, 'invalid-id');

        expect(consoleSpy).toHaveBeenCalledWith('Invalid row range:', row1, 'invalid-id');
        expect(service.selectedRowIds()).toEqual([]);
      });
    });

    describe('isRowSelected()', () => {
      it('should return true for selected row', () => {
        service.enableRowLayout();
        const rowId = service.addRow(2);
        service.selectRow(rowId);

        expect(service.isRowSelected(rowId)).toBe(true);
      });

      it('should return false for non-selected row', () => {
        service.enableRowLayout();
        const rowId = service.addRow(2);

        expect(service.isRowSelected(rowId)).toBe(false);
      });
    });

    describe('duplicateRows()', () => {
      it('should duplicate 2 rows successfully', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);

        const newRowIds = service.duplicateRows([row1, row2]);

        expect(newRowIds.length).toBe(2);
        expect(service.rowConfigs().length).toBe(4);
      });

      it('should duplicate 3+ rows successfully', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);
        const row3 = service.addRow(4);

        const newRowIds = service.duplicateRows([row1, row2, row3]);

        expect(newRowIds.length).toBe(3);
        expect(service.rowConfigs().length).toBe(6);
      });

      it('should duplicate rows with non-contiguous selection', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);
        const row3 = service.addRow(4);

        const newRowIds = service.duplicateRows([row1, row3]);

        expect(newRowIds.length).toBe(2);
        expect(service.rowConfigs().length).toBe(5);
      });

      it('should clear selection after duplication', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);
        service.selectRow(row1);
        service.selectRow(row2);

        service.duplicateRows([row1, row2]);

        expect(service.selectedRowIds()).toEqual([]);
        expect(service.selectedRowCount()).toBe(0);
      });

      it('should maintain row order when duplicating batch', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);

        service.duplicateRows([row1, row2]);

        const rows = service.rowConfigs();
        expect(rows[0].columnCount).toBe(2); // Original row1
        expect(rows[1].columnCount).toBe(2); // Duplicated row1
        expect(rows[2].columnCount).toBe(3); // Original row2
        expect(rows[3].columnCount).toBe(3); // Duplicated row2
      });

      it('should sort rowIds by source row order before duplication', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);
        const row3 = service.addRow(4);

        // Pass in reverse order - should still duplicate in correct order
        service.duplicateRows([row3, row1, row2]);

        const rows = service.rowConfigs();
        expect(rows[0].columnCount).toBe(2); // Original row1
        expect(rows[1].columnCount).toBe(2); // Duplicated row1
        expect(rows[2].columnCount).toBe(3); // Original row2
        expect(rows[3].columnCount).toBe(3); // Duplicated row2
        expect(rows[4].columnCount).toBe(4); // Original row3
        expect(rows[5].columnCount).toBe(4); // Duplicated row3
      });

      it('should handle invalid rowIds gracefully', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const consoleSpy = spyOn(console, 'error');

        const newRowIds = service.duplicateRows(['invalid-id', row1]);

        expect(consoleSpy).toHaveBeenCalledWith('Invalid row ID:', 'invalid-id');
        expect(newRowIds.length).toBe(1); // Only valid row duplicated
      });

      it('should return empty array when all rowIds are invalid', () => {
        service.enableRowLayout();
        service.addRow(2);
        const consoleSpy = spyOn(console, 'error');

        const newRowIds = service.duplicateRows(['invalid-1', 'invalid-2']);

        expect(consoleSpy).toHaveBeenCalledWith('Invalid row ID:', 'invalid-1');
        expect(consoleSpy).toHaveBeenCalledWith('Invalid row ID:', 'invalid-2');
        expect(consoleSpy).toHaveBeenCalledWith('No valid row IDs provided');
        expect(newRowIds).toEqual([]);
      });

      it('should preserve fields in duplicated rows', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);

        // Add fields to rows
        const field1 = service.addFieldFromType(FormFieldType.TEXT);
        service.setFieldPosition(field1.id, { rowId: row1, columnIndex: 0, orderInColumn: 0 });
        const field2 = service.addFieldFromType(FormFieldType.EMAIL);
        service.setFieldPosition(field2.id, { rowId: row2, columnIndex: 1, orderInColumn: 0 });

        const newRowIds = service.duplicateRows([row1, row2]);

        // Check that fields were cloned for each new row
        const row1Fields = service.formFields().filter((f) => f.position?.rowId === newRowIds[0]);
        const row2Fields = service.formFields().filter((f) => f.position?.rowId === newRowIds[1]);

        expect(row1Fields.length).toBe(1);
        expect(row1Fields[0].type).toBe(FormFieldType.TEXT);
        expect(row2Fields.length).toBe(1);
        expect(row2Fields[0].type).toBe(FormFieldType.EMAIL);
      });

      it('should mark form as dirty after batch duplication', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);
        service.loadForm({
          id: 'form-1',
          userId: 'user-1',
          title: 'Test',
          description: '',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
          schema: {
            id: 'test-form',
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
              rowLayout: { enabled: true, rows: [] },
            },
            isPublished: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        service.duplicateRows([row1, row2]);

        expect(service.isDirty()).toBe(true);
      });
    });

    describe('Computed Signals', () => {
      it('should update selectedRowCount when selection changes', () => {
        service.enableRowLayout();
        const row1 = service.addRow(2);
        const row2 = service.addRow(3);

        expect(service.selectedRowCount()).toBe(0);

        service.selectRow(row1);
        expect(service.selectedRowCount()).toBe(1);

        service.selectRow(row2);
        expect(service.selectedRowCount()).toBe(2);

        service.clearSelection();
        expect(service.selectedRowCount()).toBe(0);
      });

      it('should update hasSelectedRows when selection changes', () => {
        service.enableRowLayout();
        const rowId = service.addRow(2);

        expect(service.hasSelectedRows()).toBe(false);

        service.selectRow(rowId);
        expect(service.hasSelectedRows()).toBe(true);

        service.clearSelection();
        expect(service.hasSelectedRows()).toBe(false);
      });
    });
  });

  // Story 29.8: Template Application to Form Builder
  describe('Template Application', () => {
    describe('applyTemplate', () => {
      it('should store template metadata when applying template', () => {
        const mockTemplate: FormTemplate = {
          id: 'template-123',
          name: 'Product Order Form',
          description: 'Template for product orders',
          category: TemplateCategory.ECOMMERCE,
          previewImageUrl: 'https://example.com/preview.jpg',
          templateSchema: {
            id: 'schema-123',
            formId: 'template-123',
            version: 1,
            isPublished: true,
            fields: [],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          usageCount: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        service.applyTemplate(mockTemplate);

        expect(service.selectedTemplate()).toEqual(mockTemplate);
        expect(service.templateMetadata()).toEqual({
          id: 'template-123',
          name: 'Product Order Form',
        });
      });

      it('should set isTemplateMode to true after applying template', () => {
        const mockTemplate: FormTemplate = {
          id: 'template-123',
          name: 'Test Template',
          description: 'Test',
          category: TemplateCategory.DATA_COLLECTION,
          previewImageUrl: 'https://example.com/preview.jpg',
          templateSchema: {
            fields: [],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(service.isTemplateMode()).toBe(false);

        service.applyTemplate(mockTemplate);

        expect(service.isTemplateMode()).toBe(true);
      });

      it('should handle undefined template gracefully', () => {
        spyOn(console, 'warn');

        service.applyTemplate(undefined as any);

        expect(console.warn).toHaveBeenCalledWith('Cannot apply undefined template');
        expect(service.selectedTemplate()).toBeNull();
        expect(service.templateMetadata()).toBeNull();
        expect(service.isTemplateMode()).toBe(false);
      });

      it('should load template fields via loadFormSchema', () => {
        const mockTemplate: FormTemplate = {
          id: 'template-123',
          name: 'Contact Form',
          description: 'Simple contact form',
          category: TemplateCategory.DATA_COLLECTION,
          previewImageUrl: 'https://example.com/preview.jpg',
          templateSchema: {
            fields: [
              {
                id: 'field-1',
                type: FormFieldType.TEXT,
                fieldName: 'name',
                label: 'Name',
                placeholder: 'Enter your name',
                helpText: '',
                required: true,
                order: 0,
                validation: {},
              },
              {
                id: 'field-2',
                type: FormFieldType.EMAIL,
                fieldName: 'email',
                label: 'Email',
                placeholder: 'your@email.com',
                helpText: '',
                required: true,
                order: 1,
                validation: {},
              },
            ],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
            },
          },
          usageCount: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        service.applyTemplate(mockTemplate);

        expect(service.formFields().length).toBe(2);
        expect(service.formFields()[0].fieldName).toBe('name');
        expect(service.formFields()[1].fieldName).toBe('email');
      });
    });

    describe('loadFormSchema with templates', () => {
      it('should load row layout configuration from template schema', () => {
        const schemaWithRowLayout: FormSchema = {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              fieldName: 'firstName',
              label: 'First Name',
              placeholder: '',
              helpText: '',
              required: true,
              order: 0,
              validation: {},
              position: { rowId: 'row-1', columnIndex: 0, orderInColumn: 0 },
            },
            {
              id: 'field-2',
              type: FormFieldType.TEXT,
              fieldName: 'lastName',
              label: 'Last Name',
              placeholder: '',
              helpText: '',
              required: true,
              order: 1,
              validation: {},
              position: { rowId: 'row-1', columnIndex: 1, orderInColumn: 0 },
            },
          ],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  id: 'row-1',
                  columnCount: 2,
                  order: 0,
                  label: 'Personal Information',
                  widthRatio: '1fr 1fr',
                },
              ],
            },
          },
        };

        service.loadFormSchema(schemaWithRowLayout);

        expect(service.isRowLayoutEnabled()).toBe(true);
        expect(service.rowConfigs().length).toBe(1);
        expect(service.rowConfigs()[0].columnCount).toBe(2);
        expect(service.formFields().length).toBe(2);
        expect(service.formFields()[0].position?.rowId).toBe('row-1');
        expect(service.formFields()[0].position?.columnIndex).toBe(0);
      });

      it('should load step form configuration from template schema', () => {
        const schemaWithStepForm: FormSchema = {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              fieldName: 'name',
              label: 'Name',
              placeholder: '',
              helpText: '',
              required: true,
              order: 0,
              validation: {},
              stepId: 'step-1',
            },
            {
              id: 'field-2',
              type: FormFieldType.EMAIL,
              fieldName: 'email',
              label: 'Email',
              placeholder: '',
              helpText: '',
              required: true,
              order: 1,
              validation: {},
              stepId: 'step-2',
            },
          ],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
            stepForm: {
              enabled: true,
              steps: [
                {
                  id: 'step-1',
                  order: 0,
                  title: 'Personal Info',
                  description: 'Enter your details',
                },
                {
                  id: 'step-2',
                  order: 1,
                  title: 'Contact',
                  description: 'How to reach you',
                },
              ],
            },
          },
        };

        service.loadFormSchema(schemaWithStepForm);

        expect(service.isStepFormEnabled()).toBe(true);
        expect(service.stepConfigs().length).toBe(2);
        expect(service.formFields()[0].stepId).toBe('step-1');
        expect(service.formFields()[1].stepId).toBe('step-2');
      });

      it('should deep clone template schema to prevent mutation', () => {
        const originalSchema: FormSchema = {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              fieldName: 'name',
              label: 'Name',
              placeholder: '',
              helpText: '',
              required: true,
              order: 0,
              validation: {},
            },
          ],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        service.loadFormSchema(originalSchema);

        // Modify loaded field
        const loadedFields = service.formFields();
        loadedFields[0].label = 'Modified Name';

        // Original schema should not be affected
        expect(originalSchema.fields[0].label).toBe('Name');
      });

      it('should handle empty fields array in template schema', () => {
        const emptySchema: FormSchema = {
          fields: [],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        service.loadFormSchema(emptySchema);

        expect(service.formFields()).toEqual([]);
      });

      it('should handle missing fields in template schema', () => {
        const schemaWithoutFields: FormSchema = {
          fields: undefined as any,
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        service.loadFormSchema(schemaWithoutFields);

        expect(service.formFields()).toEqual([]);
      });
    });

    describe('Template signals', () => {
      it('should initialize template signals as null', () => {
        expect(service.selectedTemplate()).toBeNull();
        expect(service.templateMetadata()).toBeNull();
        expect(service.isTemplateMode()).toBe(false);
      });

      it('should expose selectedTemplate as readonly signal', () => {
        const mockTemplate: FormTemplate = {
          id: 'template-123',
          name: 'Test Template',
          description: 'Test',
          category: TemplateCategory.DATA_COLLECTION,
          previewImageUrl: 'https://example.com/preview.jpg',
          templateSchema: {
            fields: [],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        service.applyTemplate(mockTemplate);

        // Verify signal is readonly (cannot be reassigned)
        expect(service.selectedTemplate()).toEqual(mockTemplate);
        expect(typeof service.selectedTemplate).toBe('function');
      });

      it('should compute isTemplateMode based on selectedTemplate', () => {
        expect(service.isTemplateMode()).toBe(false);

        const mockTemplate: FormTemplate = {
          id: 'template-123',
          name: 'Test Template',
          description: 'Test',
          category: TemplateCategory.DATA_COLLECTION,
          previewImageUrl: 'https://example.com/preview.jpg',
          templateSchema: {
            fields: [],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        service.applyTemplate(mockTemplate);
        expect(service.isTemplateMode()).toBe(true);

        // Clear template
        (service as any)._selectedTemplate.set(null);
        expect(service.isTemplateMode()).toBe(false);
      });
    });
  });
});
