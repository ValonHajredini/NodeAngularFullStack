/**
 * Export strategy factory for creating tool-type-specific strategies.
 * Epic 33.1: Export Core Infrastructure
 */

import { IExportStrategy } from './base.strategy';
import { FormsExportStrategy } from './forms.strategy';
import { WorkflowsExportStrategy } from './workflows.strategy';
import { ThemesExportStrategy } from './themes.strategy';

/**
 * Factory class for creating export strategies based on tool type.
 * Implements singleton pattern for strategy instance caching.
 */
export class ExportStrategyFactory {
  /** Cache for strategy instances (singleton per tool type) */
  private static strategyCache: Map<string, IExportStrategy> = new Map();

  /**
   * Create export strategy for given tool type.
   * Returns cached instance if strategy already created.
   *
   * @param toolType - Tool type ('forms', 'workflows', 'themes')
   * @returns Export strategy instance
   * @throws Error if tool type not supported
   *
   * @example
   * ```typescript
   * const strategy = ExportStrategyFactory.create('forms');
   * const steps = strategy.getSteps(toolData);
   * ```
   */
  static create(toolType: string): IExportStrategy {
    // Check cache first
    if (this.strategyCache.has(toolType)) {
      return this.strategyCache.get(toolType)!;
    }

    // Create new strategy instance based on tool type
    let strategy: IExportStrategy;

    switch (toolType) {
      case 'forms':
        strategy = new FormsExportStrategy();
        break;

      case 'workflows':
        strategy = new WorkflowsExportStrategy();
        break;

      case 'themes':
        strategy = new ThemesExportStrategy();
        break;

      default:
        throw new Error(
          `Unsupported tool type: '${toolType}'. Supported types: forms, workflows, themes`
        );
    }

    // Cache strategy instance
    this.strategyCache.set(toolType, strategy);

    return strategy;
  }

  /**
   * Get list of supported tool types.
   * @returns Array of supported tool type strings
   */
  static getSupportedTypes(): string[] {
    return ['forms', 'workflows', 'themes'];
  }

  /**
   * Check if tool type is supported.
   * @param toolType - Tool type to check
   * @returns True if tool type is supported
   */
  static isSupported(toolType: string): boolean {
    return this.getSupportedTypes().includes(toolType);
  }

  /**
   * Clear strategy cache (mainly for testing).
   * Forces creation of new strategy instances on next create() call.
   */
  static clearCache(): void {
    this.strategyCache.clear();
  }
}
