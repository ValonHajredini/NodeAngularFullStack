import { Request, Response, NextFunction } from 'express';
import { validateStepFormConfiguration } from '../../../src/validators/forms.validator';
import { FormSchema, FormFieldType } from '@nodeangularfullstack/shared';
import * as crypto from 'crypto';

describe('Step Form Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusSpy: jest.Mock;
  let jsonSpy: jest.Mock;

  beforeEach(() => {
    statusSpy = jest.fn().mockReturnThis();
    jsonSpy = jest.fn();

    mockReq = {
      body: {},
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = jest.fn();
  });

  describe('Valid Step Configurations', () => {
    it('should accept valid step configuration with 2 steps', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              {
                id: crypto.randomUUID(),
                title: 'Step 1',
                description: 'First step',
                order: 0,
              },
              {
                id: crypto.randomUUID(),
                title: 'Step 2',
                order: 1,
              },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should accept valid step configuration with 5 steps', () => {
      const steps = Array.from({ length: 5 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Step ${i + 1}`,
        order: i,
      }));

      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps,
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should accept valid step configuration with 10 steps', () => {
      const steps = Array.from({ length: 10 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Step ${i + 1}`,
        order: i,
      }));

      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps,
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Step Count', () => {
    it('should reject configuration with 0 steps', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'STEP_VALIDATION_ERROR',
            details: expect.arrayContaining([
              expect.stringContaining('Step count must be between 2 and 10'),
            ]),
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject configuration with 1 step', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              {
                id: crypto.randomUUID(),
                title: 'Step 1',
                order: 0,
              },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.stringContaining('Step count must be between 2 and 10'),
            ]),
          }),
        })
      );
    });

    it('should reject configuration with 11+ steps', () => {
      const steps = Array.from({ length: 11 }, (_, i) => ({
        id: crypto.randomUUID(),
        title: `Step ${i + 1}`,
        order: i,
      }));

      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps,
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.stringContaining('Step count must be between 2 and 10'),
            ]),
          }),
        })
      );
    });
  });

  describe('Duplicate Step IDs', () => {
    it('should reject duplicate step IDs', () => {
      const duplicateId = crypto.randomUUID();

      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              {
                id: duplicateId,
                title: 'Step 1',
                order: 0,
              },
              {
                id: duplicateId,
                title: 'Step 2',
                order: 1,
              },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.stringContaining('Duplicate step ID found'),
            ]),
          }),
        })
      );
    });
  });

  describe('Missing Required Step Fields', () => {
    it('should reject step missing ID', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              {
                id: '' as any, // Missing ID
                title: 'Step 1',
                order: 0,
              },
              {
                id: crypto.randomUUID(),
                title: 'Step 2',
                order: 1,
              },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it('should reject step missing title', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              {
                id: crypto.randomUUID(),
                title: '', // Empty title
                order: 0,
              },
              {
                id: crypto.randomUUID(),
                title: 'Step 2',
                order: 1,
              },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.stringContaining("missing required 'title' property"),
            ]),
          }),
        })
      );
    });
  });

  describe('Invalid Step Order Sequences', () => {
    it('should reject non-sequential order indices', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              {
                id: crypto.randomUUID(),
                title: 'Step 1',
                order: 0,
              },
              {
                id: crypto.randomUUID(),
                title: 'Step 2',
                order: 2, // Skips order 1
              },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.stringContaining('Step order indices must be sequential'),
            ]),
          }),
        })
      );
    });

    it('should reject duplicate order indices', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              {
                id: crypto.randomUUID(),
                title: 'Step 1',
                order: 0,
              },
              {
                id: crypto.randomUUID(),
                title: 'Step 2',
                order: 0, // Duplicate order
              },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.stringContaining('Duplicate step order index found'),
            ]),
          }),
        })
      );
    });
  });

  describe('Field Step ID References', () => {
    it('should accept valid field step ID references', () => {
      const step1Id = crypto.randomUUID();
      const step2Id = crypto.randomUUID();

      const schema: Partial<FormSchema> = {
        fields: [
          {
            id: crypto.randomUUID(),
            type: FormFieldType.TEXT,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 0,
            position: {
              rowId: 'row-1',
              columnIndex: 0,
              stepId: step1Id,
            },
          },
          {
            id: crypto.randomUUID(),
            type: FormFieldType.EMAIL,
            label: 'Email',
            fieldName: 'email',
            required: true,
            order: 1,
            position: {
              rowId: 'row-2',
              columnIndex: 0,
              stepId: step2Id,
            },
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              { id: step1Id, title: 'Step 1', order: 0 },
              { id: step2Id, title: 'Step 2', order: 1 },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should reject field referencing non-existent step ID', () => {
      const step1Id = crypto.randomUUID();
      const invalidStepId = crypto.randomUUID();

      const schema: Partial<FormSchema> = {
        fields: [
          {
            id: crypto.randomUUID(),
            type: FormFieldType.TEXT,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 0,
            position: {
              rowId: 'row-1',
              columnIndex: 0,
              stepId: invalidStepId, // Non-existent step ID
            },
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: true,
            steps: [
              { id: step1Id, title: 'Step 1', order: 0 },
              { id: crypto.randomUUID(), title: 'Step 2', order: 1 },
            ],
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.stringContaining('references non-existent step ID'),
            ]),
          }),
        })
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should skip validation when stepForm is undefined', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          // No stepForm property
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should skip validation when stepForm.enabled is false', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: true,
          },
          stepForm: {
            enabled: false,
            steps: [], // Invalid but shouldn't be checked when disabled
          },
        },
      };

      mockReq.body = { schema };

      validateStepFormConfiguration(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });
});
