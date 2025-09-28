import fs from 'fs/promises';
import path from 'path';
import {
  ComponentGenerationRequest,
  ComponentGenerationResult,
} from '@nodeangularfullstack/shared';

/**
 * Service for generating Angular tool components and managing their integration.
 * Handles file creation, template generation, and routing updates.
 */
export class ComponentGenerationService {
  private readonly frontendPath = path.resolve(
    __dirname,
    '../../../../apps/web/src/app/features/tools/components'
  );

  /**
   * Generates a complete tool component with tests and routing integration.
   * @param request - Component generation configuration
   * @returns Generation result with file paths and status
   * @throws {Error} When file operations fail or validation errors occur
   */
  async generateComponent(
    request: ComponentGenerationRequest
  ): Promise<ComponentGenerationResult> {
    // Check if scaffolding is enabled in development mode
    if (!this.isScaffoldingEnabled()) {
      return {
        success: false,
        filesCreated: [],
        errors: ['Component scaffolding is only available in development mode'],
      };
    }

    const { toolKey, toolName, slug, description, icon } = request;
    const filesCreated: string[] = [];
    const errors: string[] = [];

    try {
      // Validate inputs
      await this.validateGenerationRequest(request);

      // Create component directory
      const componentDir = path.join(this.frontendPath, slug);
      const componentExists = await this.checkDirectoryExists(componentDir);

      if (componentExists) {
        throw new Error(`Component directory already exists: ${slug}`);
      }

      await fs.mkdir(componentDir, { recursive: true });

      // Create components subdirectory for future nested components
      const componentsSubDir = path.join(componentDir, 'components');
      await fs.mkdir(componentsSubDir, { recursive: true });

      // Generate component files
      const componentPath = await this.generateComponentFile(
        componentDir,
        toolKey,
        toolName,
        slug,
        description,
        icon
      );
      filesCreated.push(componentPath);

      // Generate test file
      const testPath = await this.generateTestFile(
        componentDir,
        toolName,
        slug
      );
      filesCreated.push(testPath);

      // Generate service file (optional)
      const servicePath = await this.generateServiceFile(
        componentDir,
        toolName,
        slug
      );
      filesCreated.push(servicePath);

      // Update routing in tool container
      const routingUpdated = await this.updateToolContainerRouting(
        toolKey,
        slug
      );

      return {
        success: true,
        filesCreated,
        componentPath,
        routingUpdated,
      };
    } catch (error) {
      // Clean up any created files on failure
      await this.cleanupFiles(filesCreated);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      // Log detailed error for debugging
      console.error('Component generation failed:', {
        toolKey,
        slug,
        error: errorMessage,
        filesCreated,
      });

      return {
        success: false,
        filesCreated: [],
        errors,
      };
    }
  }

  /**
   * Checks if component scaffolding should be active.
   * Only activates in development environment to prevent accidental generation in production.
   * @returns {boolean} True if scaffolding is enabled
   */
  isScaffoldingEnabled(): boolean {
    return (
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local'
    );
  }

  /**
   * Validates the component generation request.
   */
  private async validateGenerationRequest(
    request: ComponentGenerationRequest
  ): Promise<void> {
    const { toolKey, toolName, slug } = request;

    if (!toolKey || !toolKey.match(/^[a-z0-9-]+$/)) {
      throw new Error('Tool key must be kebab-case alphanumeric string');
    }

    if (!toolName || toolName.trim().length === 0) {
      throw new Error('Tool name is required');
    }

    if (!slug || !slug.match(/^[a-z0-9-]+$/)) {
      throw new Error('Slug must be kebab-case alphanumeric string');
    }
  }

  /**
   * Checks if a directory exists.
   */
  private async checkDirectoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Generates the main component file.
   */
  private async generateComponentFile(
    componentDir: string,
    toolKey: string,
    toolName: string,
    slug: string,
    description: string,
    icon?: string
  ): Promise<string> {
    const pascalCaseName = this.toPascalCase(slug);
    const componentFileName = `${slug}.component.ts`;
    const componentPath = path.join(componentDir, componentFileName);

    const componentTemplate = this.getComponentTemplate(
      pascalCaseName,
      toolKey,
      toolName,
      slug,
      description,
      icon
    );

    await fs.writeFile(componentPath, componentTemplate, 'utf8');
    return componentPath;
  }

  /**
   * Generates the test file for the component.
   */
  private async generateTestFile(
    componentDir: string,
    toolName: string,
    slug: string
  ): Promise<string> {
    const pascalCaseName = this.toPascalCase(slug);
    const testFileName = `${slug}.component.spec.ts`;
    const testPath = path.join(componentDir, testFileName);

    const testTemplate = this.getTestTemplate(pascalCaseName, toolName, slug);

    await fs.writeFile(testPath, testTemplate, 'utf8');
    return testPath;
  }

  /**
   * Generates the service file for the tool.
   */
  private async generateServiceFile(
    componentDir: string,
    toolName: string,
    slug: string
  ): Promise<string> {
    const pascalCaseName = this.toPascalCase(slug);
    const serviceFileName = `${slug}.service.ts`;
    const servicePath = path.join(componentDir, serviceFileName);

    const serviceTemplate = this.getServiceTemplate(pascalCaseName, toolName);

    await fs.writeFile(servicePath, serviceTemplate, 'utf8');
    return servicePath;
  }

  /**
   * Updates the tool container component to include the new tool routing.
   */
  private async updateToolContainerRouting(
    toolKey: string,
    slug: string
  ): Promise<boolean> {
    try {
      const containerPath = path.join(
        this.frontendPath,
        'tool-container/tool-container.component.ts'
      );

      const content = await fs.readFile(containerPath, 'utf8');

      // Check if import already exists
      const pascalCaseName = this.toPascalCase(slug);
      const importStatement = `import { ${pascalCaseName}Component } from '../${slug}/${slug}.component';`;

      if (content.includes(importStatement)) {
        return true; // Already updated
      }

      // Add import after existing tool imports
      const importRegex = /(import { ShortLinkComponent } from [^;]+;)/;
      const updatedImports = content.replace(
        importRegex,
        `$1\n${importStatement}`
      );

      // Add to imports array
      const importsArrayRegex = /(imports: \[\s*[^}]+)(ShortLinkComponent,)/;
      const updatedImportsArray = updatedImports.replace(
        importsArrayRegex,
        `$1$2\n    ${pascalCaseName}Component,`
      );

      // Add to switch statement
      const switchRegex = /(@case \('short-link'\) \{[^}]+\})/;
      const newCase = `\n            @case ('${toolKey}') {\n              <app-${slug} />\n            }`;
      const updatedSwitch = updatedImportsArray.replace(
        switchRegex,
        `$1${newCase}`
      );

      await fs.writeFile(containerPath, updatedSwitch, 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to update tool container routing:', error);
      return false;
    }
  }

  /**
   * Cleans up files that were created during a failed generation.
   */
  private async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Converts kebab-case to PascalCase.
   */
  private toPascalCase(kebabCase: string): string {
    return kebabCase
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Gets the component template content.
   */
  private getComponentTemplate(
    pascalCaseName: string,
    toolKey: string,
    toolName: string,
    slug: string,
    description: string,
    icon?: string
  ): string {
    return `import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ${pascalCaseName}Service } from './${slug}.service';

/**
 * ${toolName} tool component.
 * ${description}
 */
@Component({
  selector: 'app-${slug}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    MessageModule,
  ],
  template: \`
    <div class="tool-container p-4">
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex items-center gap-3 p-4">
            ${icon ? `<i class="${icon} text-2xl text-primary"></i>` : '<i class="pi pi-wrench text-2xl text-primary"></i>'}
            <div>
              <h2 class="text-xl font-bold text-gray-900 m-0">${toolName}</h2>
              <p class="text-gray-600 text-sm m-0">${description}</p>
            </div>
          </div>
        </ng-template>

        <div class="tool-content">
          @if (loading()) {
            <p-message severity="info" text="Loading ${toolName}..." [closable]="false"></p-message>
          } @else if (error()) {
            <p-message
              severity="error"
              [text]="error() || 'An error occurred'"
              [closable]="false"
            ></p-message>
          } @else {
            <div class="text-center py-8">
              <i class="pi pi-cog text-4xl text-gray-400 mb-4"></i>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Tool Implementation</h3>
              <p class="text-gray-600 mb-4">
                The ${toolName} tool is ready for implementation.
              </p>
              <p class="text-sm text-gray-500">
                Tool Key: ${toolKey} | Component: ${pascalCaseName}Component
              </p>

              <div class="mt-6">
                <p-button
                  label="Get Started"
                  icon="pi pi-play"
                  (click)="onGetStarted()"
                  [disabled]="loading()"
                ></p-button>
              </div>
            </div>
          }
        </div>
      </p-card>
    </div>
  \`,
  styles: [
    \`
      .tool-container {
        max-width: 800px;
        margin: 0 auto;
      }

      :host ::ng-deep .p-card-header {
        padding: 0;
      }

      :host ::ng-deep .p-card-body {
        padding: 1.5rem;
      }
    \`,
  ],
})
export class ${pascalCaseName}Component implements OnInit {
  private readonly ${this.toCamelCase(slug)}Service = inject(${pascalCaseName}Service);

  // Component state
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeTool();
  }

  /**
   * Initializes the tool component.
   */
  private async initializeTool(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Initialize tool-specific functionality here
      await this.${this.toCamelCase(slug)}Service.initialize();

    } catch (error) {
      console.error('Failed to initialize ${toolName}:', error);
      this.error.set('Failed to initialize tool. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handles the get started action.
   */
  onGetStarted(): void {
    // Implement tool-specific get started logic here
    console.log('${toolName} tool started');
  }
}
`;
  }

  /**
   * Gets the test template content.
   */
  private getTestTemplate(
    pascalCaseName: string,
    toolName: string,
    slug: string
  ): string {
    return `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${pascalCaseName}Component } from './${slug}.component';
import { ${pascalCaseName}Service } from './${slug}.service';

describe('${pascalCaseName}Component', () => {
  let component: ${pascalCaseName}Component;
  let fixture: ComponentFixture<${pascalCaseName}Component>;
  let mockService: jasmine.SpyObj<${pascalCaseName}Service>;

  beforeEach(async () => {
    // Create spy object for service
    mockService = jasmine.createSpyObj('${pascalCaseName}Service', ['initialize']);
    mockService.initialize.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [${pascalCaseName}Component],
      providers: [
        { provide: ${pascalCaseName}Service, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(${pascalCaseName}Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name in template', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('${toolName}');
  });

  it('should initialize service on ngOnInit', async () => {
    await component.ngOnInit();
    expect(mockService.initialize).toHaveBeenCalled();
  });

  it('should handle initialization errors', async () => {
    mockService.initialize.and.returnValue(Promise.reject(new Error('Test error')));

    await component.ngOnInit();

    expect(component.error()).toBe('Failed to initialize tool. Please try again later.');
    expect(component.loading()).toBe(false);
  });

  it('should handle get started action', () => {
    spyOn(console, 'log');

    component.onGetStarted();

    expect(console.log).toHaveBeenCalledWith('${toolName} tool started');
  });
});
`;
  }

  /**
   * Gets the service template content.
   */
  private getServiceTemplate(pascalCaseName: string, toolName: string): string {
    return `import { Injectable } from '@angular/core';

/**
 * Service for ${toolName} tool functionality.
 * Handles business logic and data operations for the ${toolName} tool.
 */
@Injectable({
  providedIn: 'root'
})
export class ${pascalCaseName}Service {

  /**
   * Initializes the ${toolName} service.
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // Implement initialization logic here
    console.log('${pascalCaseName}Service initialized');
  }

  /**
   * Example method for tool-specific functionality.
   * Replace this with actual tool implementation.
   */
  async performToolAction(): Promise<any> {
    // Implement tool-specific business logic here
    return { success: true, message: '${toolName} action completed' };
  }
}
`;
  }

  /**
   * Converts kebab-case to camelCase.
   */
  private toCamelCase(kebabCase: string): string {
    return kebabCase.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

// Export singleton instance
export const componentGenerationService = new ComponentGenerationService();
