import { TestBed } from '@angular/core/testing';
import { FormBuilderService } from './form-builder.service';
import {
  FormField,
  FormFieldType,
  FormMetadata,
  FormStatus,
} from '@nodeangularfullstack/shared';

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
});
