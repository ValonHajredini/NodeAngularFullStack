import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from 'primeng/message';
import { Toast } from 'primeng/toast';
import { ButtonDirective } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { SvgDrawingService } from './svg-drawing.service';
import { CanvasRendererComponent } from './components/canvas-renderer/canvas-renderer.component';
import { ToolsSidebarComponent } from './components/tools-sidebar/tools-sidebar.component';
import { ShapePropertiesComponent } from './components/shape-properties/shape-properties.component';
import { BackgroundImagePanelComponent } from './components/background-image-panel/background-image-panel.component';
import { ExportOptionsComponent } from './components/export-options/export-options.component';
import { HelpPanelComponent } from './components/help-panel/help-panel.component';
import { ShapesListComponent } from './components/shapes-list/shapes-list.component';
import { ShapeStyle, ExportOptions } from '@nodeangularfullstack/shared';

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
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    CanvasRendererComponent,
    ToolsSidebarComponent,
    ShapePropertiesComponent,
    BackgroundImagePanelComponent,
    ExportOptionsComponent,
    HelpPanelComponent,
    ShapesListComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="svg-drawing-container w-full h-full relative">
      @if (loading()) {
        <div class="flex items-center justify-center h-full">
          <p-message severity="info" text="Loading SVG Drawing..." [closable]="false"></p-message>
        </div>
      } @else if (error()) {
        <div class="flex items-center justify-center h-full">
          <p-message
            severity="error"
            [text]="error() || 'An error occurred'"
            [closable]="false"
          ></p-message>
        </div>
      } @else {
        <!-- Toast for notifications -->
        <p-toast position="top-right"></p-toast>

        <!-- Top Toolbar -->
        <div class="top-toolbar">
          <div class="toolbar-content">
            <div class="flex items-center gap-4">
              <button
                pButton
                type="button"
                label="New Drawing"
                icon="pi pi-plus"
                severity="secondary"
                [outlined]="true"
                (click)="onNewDrawing()"
              ></button>
            </div>

            <div class="text-sm text-gray-600">
              <span class="hidden md:inline">{{ svgDrawingService.shapes().length }} shapes</span>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content">
          <!-- Left Sidebar - Tools -->
          <app-tools-sidebar
            [currentTool]="svgDrawingService.currentTool"
            [canUndo]="svgDrawingService.canUndo"
            [canRedo]="svgDrawingService.canRedo"
            [strokeColor]="svgDrawingService.strokeColor()"
            [strokeWidth]="svgDrawingService.strokeWidth()"
            [fillColor]="svgDrawingService.fillColor()"
            [fillEnabled]="svgDrawingService.fillEnabled()"
            (toolSelected)="onToolSelected($event)"
            (undoClicked)="onUndo()"
            (redoClicked)="onRedo()"
            (clearAllClicked)="onClearAll()"
            (strokeColorChanged)="onStrokeColorChanged($event)"
            (strokeWidthChanged)="onStrokeWidthChanged($event)"
            (fillColorChanged)="onFillColorChanged($event)"
            (fillEnabledChanged)="onFillEnabledChanged($event)"
          ></app-tools-sidebar>

          <!-- Canvas Area -->
          <div class="canvas-area">
            <app-canvas-renderer></app-canvas-renderer>
          </div>

          <!-- Right Sidebar - Tabs -->
          <div class="right-sidebar">
            <p-tabs [value]="0">
              <p-tablist>
                <p-tab [value]="0">
                  <i class="pi pi-pencil mr-2"></i>
                  Edit
                </p-tab>
                <p-tab [value]="1">
                  <i class="pi pi-list mr-2"></i>
                  Shapes
                </p-tab>
                <p-tab [value]="2">
                  <i class="pi pi-image mr-2"></i>
                  Background
                </p-tab>
                <p-tab [value]="3">
                  <i class="pi pi-download mr-2"></i>
                  Export
                </p-tab>
                <p-tab [value]="4">
                  <i class="pi pi-question-circle mr-2"></i>
                  Help
                </p-tab>
              </p-tablist>

              <p-tabpanels>
                <p-tabpanel [value]="0">
                  <app-shape-properties
                    [selectedShape]="svgDrawingService.selectedShape()"
                    (propertiesChanged)="onPropertiesChanged($event)"
                  ></app-shape-properties>
                </p-tabpanel>

                <p-tabpanel [value]="1">
                  <app-shapes-list
                    [shapes]="svgDrawingService.shapes()"
                    [selectedShapeId]="svgDrawingService.selectedShapeId()"
                    (shapeSelect)="onShapeSelect($event)"
                    (shapeToggleVisibility)="onShapeToggleVisibility($event)"
                    (shapeDuplicate)="onShapeDuplicate($event)"
                    (shapeDelete)="onShapeDelete($event)"
                  ></app-shapes-list>
                </p-tabpanel>

                <p-tabpanel [value]="2">
                  <app-background-image-panel></app-background-image-panel>
                </p-tabpanel>

                <p-tabpanel [value]="3">
                  <app-export-options (export)="onExport($event)"></app-export-options>
                </p-tabpanel>

                <p-tabpanel [value]="4">
                  <app-help-panel></app-help-panel>
                </p-tabpanel>
              </p-tabpanels>
            </p-tabs>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .svg-drawing-container {
        height: 100vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: #f3f4f6;
      }

      .top-toolbar {
        height: 60px;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
        z-index: 10;
      }

      .toolbar-content {
        height: 100%;
        padding: 0 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .main-content {
        flex: 1;
        display: flex;
        min-height: 0;
      }

      .canvas-area {
        flex: 1;
        position: relative;
        overflow: auto;
        background: #f3f4f6;
        padding: 1rem;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        min-height: 0;
      }

      .canvas-area > app-canvas-renderer {
        width: 100%;
        max-width: 2100px;
        max-height: 900px;
        aspect-ratio: 16 / 9;
        align-self: flex-start;
      }

      .right-sidebar {
        width: 350px;
        background: white;
        border-left: 1px solid #e5e7eb;
        flex-shrink: 0;
        overflow: hidden;
      }

      :host ::ng-deep .right-sidebar .p-tabs {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      :host ::ng-deep .right-sidebar .p-tabpanels {
        flex: 1;
        overflow-y: auto;
      }

      :host ::ng-deep .right-sidebar .p-tablist {
        border-bottom: 1px solid #e5e7eb;
      }

      @media (max-width: 1024px) {
        .right-sidebar {
          width: 280px;
        }
      }

      @media (max-width: 768px) {
        .right-sidebar {
          display: none;
        }
      }
    `,
  ],
})
export class SvgDrawingComponent implements OnInit, OnDestroy {
  readonly svgDrawingService = inject(SvgDrawingService);
  private readonly messageService = inject(MessageService);

  // Component state
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

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
   * Handles shape properties changes.
   */
  onPropertiesChanged(event: { shapeId: string; updates: Partial<ShapeStyle> }): void {
    this.svgDrawingService.updateShapeProperties(event.shapeId, event.updates);
  }

  /**
   * Handles export action.
   */
  onExport(options: ExportOptions): void {
    try {
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
    } catch (error) {
      console.error('Export error:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: 'An error occurred during export',
        life: 3000,
      });
    }
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
  onShapeSelect(shapeId: string): void {
    this.svgDrawingService.selectShape(shapeId);
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
      // Cancel polygon drawing or deselect
      event.preventDefault();
      if (this.svgDrawingService.currentTool() === 'polygon') {
        this.svgDrawingService.cancelPolygon();
      }
      this.svgDrawingService.selectShape(null);
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
