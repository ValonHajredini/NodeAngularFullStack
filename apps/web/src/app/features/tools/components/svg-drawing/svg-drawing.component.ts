import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from 'primeng/message';
import { Toast } from 'primeng/toast';
import { ButtonDirective } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { SvgDrawingService } from './svg-drawing.service';
import { CanvasRendererComponent } from './components/canvas-renderer/canvas-renderer.component';
import { ToolsSidebarComponent } from './components/tools-sidebar/tools-sidebar.component';
import { BackgroundImagePanelComponent } from './components/background-image-panel/background-image-panel.component';
import { ExportOptionsComponent } from './components/export-options/export-options.component';
import { ImportTemplateComponent } from './components/import-template/import-template.component';
import { SaveProjectComponent } from './components/save-project/save-project.component';
import { LoadProjectComponent } from './components/load-project/load-project.component';
import { HelpPanelComponent } from './components/help-panel/help-panel.component';
import { ShapesListComponent } from './components/shapes-list/shapes-list.component';
import { ShapePropertiesComponent } from './components/shape-properties/shape-properties.component';
import { ShapeStyle, ExportOptions, DrawingProject } from '@nodeangularfullstack/shared';

type SidebarSection =
  | 'shapeProperties'
  | 'shapes'
  | 'backgroundImage'
  | 'exportToSvg'
  | 'importTemplate'
  | 'myProjects'
  | 'helpShortcuts';

/**
 * SVG Drawing tool component.
 * Provides a full-viewport canvas for drawing lines and polygons with comprehensive shape management.
 */
@Component({
  selector: 'app-svg-drawing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    Message,
    Toast,
    ButtonDirective,
    TooltipModule,
    CanvasRendererComponent,
    ToolsSidebarComponent,
    BackgroundImagePanelComponent,
    ExportOptionsComponent,
    ImportTemplateComponent,
    SaveProjectComponent,
    LoadProjectComponent,
    HelpPanelComponent,
    ShapesListComponent,
    ShapePropertiesComponent,
  ],
  providers: [MessageService],
  templateUrl: './svg-drawing.component.html',
  styleUrl: './svg-drawing.component.scss',
})
export class SvgDrawingComponent implements OnInit, OnDestroy {
  readonly svgDrawingService = inject(SvgDrawingService);
  private readonly messageService = inject(MessageService);

  // ViewChild references for child components
  @ViewChild(LoadProjectComponent) loadProjectComponent?: LoadProjectComponent;

  // Component state
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly openSections = signal<SidebarSection[]>([]);

  ngOnInit(): void {
    this.initializeTool();
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  /**
   * Initializes the tool component.
   */
  private async initializeTool(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      await this.svgDrawingService.initialize();
    } catch (error) {
      console.error('Failed to initialize SVG Drawing:', error);
      this.error.set('Failed to initialize tool. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Toggles the visibility of the requested sidebar section.
   */
  toggleSection(section: SidebarSection): void {
    this.openSections.update((current) =>
      current.includes(section) ? current.filter((s) => s !== section) : [...current, section],
    );
  }

  /**
   * Ensures that a section remains expanded.
   */
  private openSection(section: SidebarSection): void {
    if (this.isSectionOpen(section)) {
      return;
    }

    this.openSections.update((current) => [...current, section]);
  }

  /**
   * Checks if a sidebar section is currently expanded.
   */
  isSectionOpen(section: SidebarSection): boolean {
    return this.openSections().includes(section);
  }

  /**
   * Handles tool selection from toolbar.
   */
  onToolSelected(
    tool:
      | 'line'
      | 'polygon'
      | 'polyline'
      | 'rectangle'
      | 'circle'
      | 'ellipse'
      | 'triangle'
      | 'rounded-rectangle'
      | 'arc'
      | 'bezier'
      | 'star'
      | 'arrow'
      | 'cylinder'
      | 'cone'
      | 'select'
      | 'move'
      | 'delete'
      | 'cut',
  ): void {
    this.svgDrawingService.setCurrentTool(tool);
  }

  /**
   * Handles undo action.
   */
  onUndo(): void {
    this.svgDrawingService.undo();
  }

  /**
   * Handles redo action.
   */
  onRedo(): void {
    this.svgDrawingService.redo();
  }

  /**
   * Handles clear all action.
   */
  onClearAll(): void {
    if (confirm('Are you sure you want to clear all shapes?')) {
      this.svgDrawingService.clearAll();
    }
  }

  /**
   * Handles export action.
   */
  async onExport(options: ExportOptions): Promise<void> {
    try {
      if (options.format === 'svg') {
        // Export as SVG
        const svgContent = this.svgDrawingService.exportToSVG(options);

        // Validate SVG
        if (!this.svgDrawingService.validateSVG(svgContent)) {
          this.messageService.add({
            severity: 'error',
            summary: 'Export Failed',
            detail: 'Generated SVG is invalid',
            life: 3000,
          });
          return;
        }

        // Download SVG
        this.svgDrawingService.downloadSVG(svgContent, options.filename);

        this.messageService.add({
          severity: 'success',
          summary: 'Export Successful',
          detail: `${options.filename} has been downloaded`,
          life: 3000,
        });
      } else if (options.format === 'png') {
        // Export as PNG
        const pngBlob = await this.svgDrawingService.exportToPNG(options);

        // Download PNG
        this.svgDrawingService.downloadPNG(pngBlob, options.filename);

        this.messageService.add({
          severity: 'success',
          summary: 'Export Successful',
          detail: `${options.filename} has been downloaded`,
          life: 3000,
        });
      } else if (options.format === 'json') {
        // Export as JSON template
        const jsonContent = this.svgDrawingService.exportToJSON(options.filename);

        // Download JSON
        this.svgDrawingService.downloadJSON(jsonContent, options.filename);

        this.messageService.add({
          severity: 'success',
          summary: 'Template Saved',
          detail: `${options.filename} template has been downloaded`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: `An error occurred during ${options.format.toUpperCase()} export`,
        life: 3000,
      });
    }
  }

  /**
   * Handles template import from JSON file.
   */
  onImport(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        this.svgDrawingService.importFromJSON(jsonContent);

        this.messageService.add({
          severity: 'success',
          summary: 'Template Loaded',
          detail: 'Drawing template imported successfully',
          life: 3000,
        });
      } catch (error) {
        console.error('Import error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Import Failed',
          detail: error instanceof Error ? error.message : 'Failed to import template',
          life: 3000,
        });
      }
    };
    reader.onerror = () => {
      this.messageService.add({
        severity: 'error',
        summary: 'Import Failed',
        detail: 'Failed to read file',
        life: 3000,
      });
    };
    reader.readAsText(file);
  }

  /**
   * Handles saving project to server.
   */
  onSaveProject(data: { name: string; description?: string }): void {
    this.svgDrawingService.saveProjectToServer(data.name, data.description).subscribe({
      next: (project) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Project Saved',
          detail: `"${project.name}" has been saved to the server`,
          life: 3000,
        });

        // Refresh projects list if component is available
        this.loadProjectComponent?.onRefresh();
      },
      error: (error) => {
        console.error('Save project error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: error.error?.message || 'Failed to save project to server',
          life: 3000,
        });
      },
    });
  }

  /**
   * Handles loading projects list from server.
   */
  onLoadProjects(): void {
    this.loadProjectComponent?.setLoading(true);

    this.svgDrawingService.getMyProjects(false).subscribe({
      next: (projects) => {
        this.loadProjectComponent?.setProjects(projects);
        this.loadProjectComponent?.setLoading(false);
      },
      error: (error) => {
        console.error('Load projects error:', error);
        this.loadProjectComponent?.setLoading(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: error.error?.message || 'Failed to load projects from server',
          life: 3000,
        });
      },
    });
  }

  /**
   * Handles loading a specific project from server.
   */
  onLoadProject(project: DrawingProject): void {
    this.svgDrawingService.loadProjectFromServer(project.id).subscribe({
      next: (loadedProject) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Project Loaded',
          detail: `"${loadedProject.name}" has been loaded`,
          life: 3000,
        });

        this.loadProjectComponent?.resetLoadingState();
      },
      error: (error) => {
        console.error('Load project error:', error);
        this.loadProjectComponent?.resetLoadingState();
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: error.error?.message || 'Failed to load project from server',
          life: 3000,
        });
      },
    });
  }

  /**
   * Handles deleting a project from server.
   */
  onDeleteProject(project: DrawingProject): void {
    this.svgDrawingService.deleteProject(project.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Project Deleted',
          detail: `"${project.name}" has been deleted`,
          life: 3000,
        });

        // Refresh projects list
        this.loadProjectComponent?.onRefresh();
      },
      error: (error) => {
        console.error('Delete project error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: error.error?.message || 'Failed to delete project from server',
          life: 3000,
        });
      },
    });
  }

  /**
   * Handles new drawing action.
   */
  onNewDrawing(): void {
    if (this.svgDrawingService.shapes().length === 0) {
      return;
    }

    if (confirm('Are you sure you want to start a new drawing? All unsaved work will be lost.')) {
      this.svgDrawingService.newDrawing();
      this.messageService.add({
        severity: 'info',
        summary: 'New Drawing',
        detail: 'Started a new drawing',
        life: 3000,
      });
    }
  }

  /**
   * Handles stroke color change.
   */
  onStrokeColorChanged(color: string): void {
    this.svgDrawingService.setStrokeColor(color);
  }

  /**
   * Handles stroke width change.
   */
  onStrokeWidthChanged(width: number): void {
    this.svgDrawingService.setStrokeWidth(width);
  }

  /**
   * Handles fill color change.
   */
  onFillColorChanged(color: string): void {
    this.svgDrawingService.setFillColor(color);
  }

  /**
   * Handles fill enabled toggle.
   */
  onFillEnabledChanged(enabled: boolean): void {
    this.svgDrawingService.setFillEnabled(enabled);
  }

  /**
   * Handles shape selection from shapes list.
   */
  onShapeSelect(event: { shapeId: string; multiSelect: boolean }): void {
    this.svgDrawingService.toggleShapeSelection(event.shapeId, event.multiSelect);
    if (!event.multiSelect || this.svgDrawingService.selectedShapeIds().length === 1) {
      this.openSection('shapeProperties');
    }
  }

  /**
   * Handles select all from shapes list.
   */
  onSelectAll(): void {
    const selectedIds = this.svgDrawingService.selectedShapeIds();
    const allIds = this.svgDrawingService
      .shapes()
      .filter((s) => s.visible !== false)
      .map((s) => s.id);

    if (selectedIds.length === allIds.length) {
      // Deselect all
      this.svgDrawingService.clearSelection();
    } else {
      // Select all
      this.svgDrawingService.selectAllShapes();
    }
  }

  /**
   * Handles merge shapes from shapes list.
   */
  onMergeShapes(): void {
    const selectedIds = this.svgDrawingService.selectedShapeIds();
    if (selectedIds.length < 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Selection',
        detail: 'Please select at least 2 shapes to merge',
        life: 3000,
      });
      return;
    }

    // Show info about merge limitations
    const userChoice = confirm(
      'Merge shapes into one?\n\n' +
        'Note: Shapes will be connected by their closest endpoints.\n' +
        'For best results, select shapes that touch at their endpoints.\n\n' +
        'Click OK to merge as polyline (open) or Cancel to abort.',
    );

    if (!userChoice) {
      return;
    }

    const mergedShape = this.svgDrawingService.mergeSelectedShapes(false);

    if (mergedShape) {
      this.messageService.add({
        severity: 'success',
        summary: 'Shapes Merged',
        detail: `${selectedIds.length} shapes merged into one polyline`,
        life: 3000,
      });
      this.openSection('shapeProperties');
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Merge Failed',
        detail: 'Could not merge selected shapes',
        life: 3000,
      });
    }
  }

  /**
   * Handles group shapes from shapes list.
   */
  onGroupShapes(): void {
    const selectedIds = this.svgDrawingService.selectedShapeIds();
    if (selectedIds.length < 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Selection',
        detail: 'Please select at least 2 shapes to group',
        life: 3000,
      });
      return;
    }

    const groupId = this.svgDrawingService.groupSelectedShapes();

    if (groupId) {
      this.messageService.add({
        severity: 'success',
        summary: 'Shapes Grouped',
        detail: `${selectedIds.length} shapes grouped together. Move one to move all!`,
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Group Failed',
        detail: 'Could not group selected shapes',
        life: 3000,
      });
    }
  }

  /**
   * Handles ungroup shapes from shapes list.
   */
  onUngroupShapes(): void {
    const selectedIds = this.svgDrawingService.selectedShapeIds();
    if (selectedIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Selection',
        detail: 'Please select grouped shapes to ungroup',
        life: 3000,
      });
      return;
    }

    this.svgDrawingService.ungroupSelectedShapes();
    this.messageService.add({
      severity: 'success',
      summary: 'Shapes Ungrouped',
      detail: 'Shapes have been ungrouped',
      life: 3000,
    });
  }

  /**
   * Handles removing a shape from its group.
   */
  onRemoveFromGroup(shapeId: string): void {
    this.svgDrawingService.removeShapeFromGroup(shapeId);
    this.messageService.add({
      severity: 'info',
      summary: 'Shape Removed',
      detail: 'Shape has been removed from the group',
      life: 2000,
    });
  }

  /**
   * Handles shape visibility toggle from shapes list.
   */
  onShapeToggleVisibility(shapeId: string): void {
    this.svgDrawingService.toggleShapeVisibility(shapeId);
  }

  /**
   * Handles shape duplication from shapes list.
   */
  onShapeDuplicate(shapeId: string): void {
    this.svgDrawingService.duplicateShape(shapeId);
    this.messageService.add({
      severity: 'success',
      summary: 'Shape Duplicated',
      detail: 'Shape has been duplicated',
      life: 2000,
    });
  }

  /**
   * Handles shape deletion from shapes list.
   */
  onShapeDelete(shapeId: string): void {
    const shape = this.svgDrawingService.shapes().find((s) => s.id === shapeId);
    if (!shape) return;

    if (confirm('Are you sure you want to delete this shape?')) {
      this.svgDrawingService.removeShape(shapeId);
      this.messageService.add({
        severity: 'info',
        summary: 'Shape Deleted',
        detail: 'Shape has been removed',
        life: 2000,
      });
    }
  }

  /**
   * Gets the currently selected shape.
   * @returns Selected shape or null
   */
  getSelectedShape() {
    const selectedId = this.svgDrawingService.selectedShapeId();
    if (!selectedId) return null;
    return this.svgDrawingService.shapes().find((s) => s.id === selectedId) || null;
  }

  /**
   * Handles shape properties changes from the edit panel.
   */
  onShapePropertiesChanged(event: { shapeId: string; updates: Partial<ShapeStyle> }): void {
    this.svgDrawingService.updateShapeProperties(event.shapeId, event.updates);
  }

  /**
   * Handles keyboard shortcuts.
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Prevent shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Arrow keys for panning (with optional Shift for faster panning)
    // Only pan if no Ctrl/Cmd/Alt modifiers are pressed
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      const panAmount = event.shiftKey ? 100 : 50;
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.svgDrawingService.panDirection('up', panAmount);
        return;
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.svgDrawingService.panDirection('down', panAmount);
        return;
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.svgDrawingService.panDirection('left', panAmount);
        return;
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.svgDrawingService.panDirection('right', panAmount);
        return;
      }
    }

    // Tool selection shortcuts
    if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      this.svgDrawingService.setCurrentTool('line');
    } else if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      this.svgDrawingService.setCurrentTool('polygon');
    } else if (event.key === 's' || event.key === 'S') {
      if (!event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        this.svgDrawingService.setCurrentTool('select');
      }
    } else if (event.key === 'g' || event.key === 'G') {
      event.preventDefault();
      this.svgDrawingService.toggleGrid();
    } else if (event.key === 'Escape') {
      // Cancel line, polygon drawing, or deselect
      event.preventDefault();
      if (
        this.svgDrawingService.currentTool() === 'line' &&
        this.svgDrawingService.lineStartPoint()
      ) {
        // Cancel line drawing in progress
        this.svgDrawingService.setLineStartPoint(null);
        this.svgDrawingService.cancelDrawing();
      } else if (this.svgDrawingService.currentTool() === 'polygon') {
        this.svgDrawingService.cancelPolygon();
      } else {
        this.svgDrawingService.selectShape(null);
      }
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      // Delete selected shape
      if (
        this.svgDrawingService.selectedShapeId() &&
        this.svgDrawingService.currentTool() !== 'polygon'
      ) {
        event.preventDefault();
        this.svgDrawingService.deleteSelectedShape();
      }
    } else if (event.ctrlKey || event.metaKey) {
      // File operations - keyboard shortcuts still work but open the tab instead
      if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        // Note: Ctrl+S now handled by export button in tab
      } else if (event.key === 'o' || event.key === 'O') {
        event.preventDefault();
        // Note: Ctrl+O now opens export tab
      } else if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        this.svgDrawingService.selectAllShapes();
      } else if (event.key === 'z' || event.key === 'Z') {
        // Undo/Redo shortcuts
        event.preventDefault();
        if (event.shiftKey) {
          // Ctrl+Shift+Z = Redo
          this.svgDrawingService.redo();
        } else {
          // Ctrl+Z = Undo
          this.svgDrawingService.undo();
        }
      } else if (event.key === 'y' || event.key === 'Y') {
        // Ctrl+Y = Redo
        event.preventDefault();
        this.svgDrawingService.redo();
      } else if (event.key === 'm' || event.key === 'M') {
        // Ctrl+M = Merge selected shapes
        event.preventDefault();
        this.onMergeShapes();
      } else if (event.key === 'g' || event.key === 'G') {
        // Ctrl+G = Group selected shapes
        event.preventDefault();
        this.onGroupShapes();
      } else if (event.key === 'u' || event.key === 'U') {
        // Ctrl+U = Ungroup selected shapes
        event.preventDefault();
        this.onUngroupShapes();
      } else if (event.key === '+' || event.key === '=') {
        // Ctrl++ = Zoom In
        event.preventDefault();
        this.svgDrawingService.zoomIn();
      } else if (event.key === '-' || event.key === '_') {
        // Ctrl+- = Zoom Out
        event.preventDefault();
        this.svgDrawingService.zoomOut();
      } else if (event.key === '0') {
        // Ctrl+0 = Reset Zoom
        event.preventDefault();
        this.svgDrawingService.resetZoom();
      }
    }
  }
}
