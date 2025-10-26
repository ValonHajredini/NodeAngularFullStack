/**
 * Unit tests for BaseExportStrategy
 * Epic 33.1: Export Core Infrastructure
 */

import {
  BaseExportStrategy,
  IExportStep,
  ExportContext,
} from '../../../../src/services/export-strategies/base.strategy';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';

// Concrete implementation for testing
class TestExportStrategy extends BaseExportStrategy {
  getSteps(): IExportStep[] {
    return [];
  }

  validateToolData(): void {
    // Test implementation
  }

  generatePackageMetadata(): Record<string, unknown> {
    return { test: 'metadata' };
  }
}

describe('BaseExportStrategy', () => {
  let strategy: TestExportStrategy;

  beforeEach(() => {
    strategy = new TestExportStrategy();
  });

  describe('validateRequiredMetadata', () => {
    it('should throw error if manifest_json is missing', () => {
      const toolData: Partial<ToolRegistryRecord> = {
        id: 'test-id',
        tool_id: 'test-tool',
        name: 'Test Tool',
        version: '1.0.0',
        route: '/test',
        api_base: '/api/test',
        status: 'active' as any,
        is_exported: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(() => {
        strategy['validateRequiredMetadata'](toolData as ToolRegistryRecord, [
          'field1',
        ]);
      }).toThrow('Tool manifest is missing');
    });

    it('should throw error if required field is missing', () => {
      const toolData: Partial<ToolRegistryRecord> = {
        id: 'test-id',
        tool_id: 'test-tool',
        name: 'Test Tool',
        version: '1.0.0',
        route: '/test',
        api_base: '/api/test',
        status: 'active' as any,
        is_exported: false,
        created_at: new Date(),
        updated_at: new Date(),
        manifest_json: {
          routes: { primary: '/test' },
          endpoints: { base: '/api/test', paths: [] },
          config: {},
        },
      };

      expect(() => {
        strategy['validateRequiredMetadata'](toolData as ToolRegistryRecord, [
          'requiredField',
        ]);
      }).toThrow('Required metadata field missing: requiredField');
    });

    it('should not throw if all required fields exist', () => {
      const toolData: Partial<ToolRegistryRecord> = {
        id: 'test-id',
        tool_id: 'test-tool',
        name: 'Test Tool',
        version: '1.0.0',
        route: '/test',
        api_base: '/api/test',
        status: 'active' as any,
        is_exported: false,
        created_at: new Date(),
        updated_at: new Date(),
        manifest_json: {
          routes: { primary: '/test' },
          endpoints: { base: '/api/test', paths: [] },
          config: { field1: 'value1', field2: 'value2' },
        },
      };

      expect(() => {
        strategy['validateRequiredMetadata'](toolData as ToolRegistryRecord, [
          'field1',
          'field2',
        ]);
      }).not.toThrow();
    });
  });

  describe('getToolConfig', () => {
    it('should return empty object if manifest_json is missing', () => {
      const toolData: Partial<ToolRegistryRecord> = {
        id: 'test-id',
        tool_id: 'test-tool',
        name: 'Test Tool',
        version: '1.0.0',
        route: '/test',
        api_base: '/api/test',
        status: 'active' as any,
        is_exported: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const config = strategy['getToolConfig'](toolData as ToolRegistryRecord);
      expect(config).toEqual({});
    });

    it('should return config object from manifest_json', () => {
      const toolData: Partial<ToolRegistryRecord> = {
        id: 'test-id',
        tool_id: 'test-tool',
        name: 'Test Tool',
        version: '1.0.0',
        route: '/test',
        api_base: '/api/test',
        status: 'active' as any,
        is_exported: false,
        created_at: new Date(),
        updated_at: new Date(),
        manifest_json: {
          routes: { primary: '/test' },
          endpoints: { base: '/api/test', paths: [] },
          config: { key1: 'value1', key2: 'value2' },
        },
      };

      const config = strategy['getToolConfig'](toolData as ToolRegistryRecord);
      expect(config).toEqual({ key1: 'value1', key2: 'value2' });
    });
  });

  describe('executeWithErrorHandling', () => {
    it('should execute step successfully', async () => {
      const mockStep: IExportStep = {
        name: 'test-step',
        description: 'Test step',
        estimatedDurationMs: 1000,
        retryable: true,
        priority: 1,
        execute: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      const context: ExportContext = {
        jobId: 'job-123',
        toolId: 'tool-456',
        userId: 'user-789',
        workingDir: '/tmp/test',
        metadata: {},
        toolData: {} as ToolRegistryRecord,
      };

      await expect(
        strategy['executeWithErrorHandling'](mockStep, context)
      ).resolves.toBeUndefined();
      expect(mockStep.execute).toHaveBeenCalledWith(context);
    });

    it('should throw formatted error when step fails', async () => {
      const mockStep: IExportStep = {
        name: 'test-step',
        description: 'Test step',
        estimatedDurationMs: 1000,
        retryable: true,
        priority: 1,
        execute: jest
          .fn()
          .mockRejectedValue(new Error('Step execution failed')),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      const context: ExportContext = {
        jobId: 'job-123',
        toolId: 'tool-456',
        userId: 'user-789',
        workingDir: '/tmp/test',
        metadata: {},
        toolData: {} as ToolRegistryRecord,
      };

      await expect(
        strategy['executeWithErrorHandling'](mockStep, context)
      ).rejects.toThrow('Step test-step failed: Step execution failed');
    });

    it('should handle non-Error thrown values', async () => {
      const mockStep: IExportStep = {
        name: 'test-step',
        description: 'Test step',
        estimatedDurationMs: 1000,
        retryable: true,
        priority: 1,
        execute: jest.fn().mockRejectedValue('String error'),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      const context: ExportContext = {
        jobId: 'job-123',
        toolId: 'tool-456',
        userId: 'user-789',
        workingDir: '/tmp/test',
        metadata: {},
        toolData: {} as ToolRegistryRecord,
      };

      await expect(
        strategy['executeWithErrorHandling'](mockStep, context)
      ).rejects.toThrow('Step test-step failed: String error');
    });
  });
});
