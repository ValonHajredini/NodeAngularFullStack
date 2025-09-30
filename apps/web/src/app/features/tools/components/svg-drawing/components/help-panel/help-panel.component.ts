import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Accordion, AccordionPanel } from 'primeng/accordion';

/**
 * Help panel component for SVG Drawing tool.
 * Displays documentation, keyboard shortcuts, and quick start guide.
 * Embedded inline in tab view.
 */
@Component({
  selector: 'app-help-panel',
  standalone: true,
  imports: [CommonModule, Accordion, AccordionPanel],
  template: `
    <div class="help-panel p-4">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Help & Shortcuts</h3>
        <p class="text-sm text-gray-600">
          Learn how to use the SVG Drawing tool effectively with this comprehensive guide.
        </p>
      </div>

      <div class="flex flex-col gap-4">
        <p-accordion [value]="[0]" [multiple]="true">
          <!-- Quick Start -->
          <p-accordionpanel header="Quick Start Guide">
            <div class="flex flex-col gap-2 text-sm">
              <p><strong>1.</strong> Select a tool from the toolbar (Line or Polygon)</p>
              <p><strong>2.</strong> Click on the canvas to draw</p>
              <p>
                <strong>3.</strong> For lines: Click start and end points. For polygons: Click to
                add vertices, double-click to close
              </p>
              <p><strong>4.</strong> Use the selection tool to edit shapes</p>
              <p><strong>5.</strong> Export your drawing as SVG when done</p>
            </div>
          </p-accordionpanel>

          <!-- Drawing Tools -->
          <p-accordionpanel header="Drawing Tools">
            <div class="flex flex-col gap-3">
              <div>
                <p class="font-semibold mb-1">Line Tool (L)</p>
                <p class="text-sm text-color-secondary">
                  Click two points to draw a straight line. Lines snap to horizontal/vertical when
                  close to these angles.
                </p>
              </div>
              <div>
                <p class="font-semibold mb-1">Polygon Tool (P)</p>
                <p class="text-sm text-color-secondary">
                  Click to add vertices. Double-click near the first vertex or press Enter to close
                  the polygon.
                </p>
              </div>
              <div>
                <p class="font-semibold mb-1">Selection Tool (S)</p>
                <p class="text-sm text-color-secondary">
                  Click on a shape to select it. Selected shapes can be edited in the properties
                  panel.
                </p>
              </div>
            </div>
          </p-accordionpanel>

          <!-- Shape Properties -->
          <p-accordionpanel header="Shape Properties">
            <div class="flex flex-col gap-2 text-sm">
              <p>
                <strong>Color:</strong> Set the stroke color of the shape using the color picker
              </p>
              <p><strong>Stroke Width:</strong> Adjust the line thickness (1-10px)</p>
              <p><strong>Fill Color:</strong> For polygons, set an optional fill color</p>
              <p>Changes are applied immediately and can be undone with Ctrl+Z</p>
            </div>
          </p-accordionpanel>

          <!-- Keyboard Shortcuts -->
          <p-accordionpanel header="Keyboard Shortcuts">
            <div class="flex flex-col gap-2">
              <div class="shortcut-section">
                <p class="font-semibold text-sm mb-2">Tools</p>
                <div class="flex flex-col gap-1 text-sm">
                  <div class="flex justify-content-between">
                    <span>Line Tool</span>
                    <kbd class="text-xs">L</kbd>
                  </div>
                  <div class="flex justify-content-between">
                    <span>Polygon Tool</span>
                    <kbd class="text-xs">P</kbd>
                  </div>
                  <div class="flex justify-content-between">
                    <span>Selection Tool</span>
                    <kbd class="text-xs">S</kbd>
                  </div>
                </div>
              </div>

              <div class="shortcut-section">
                <p class="font-semibold text-sm mb-2">Actions</p>
                <div class="flex flex-col gap-1 text-sm">
                  <div class="flex justify-content-between">
                    <span>Delete Selected</span>
                    <kbd class="text-xs">Delete</kbd>
                  </div>
                  <div class="flex justify-content-between">
                    <span>Cancel / Deselect</span>
                    <kbd class="text-xs">Esc</kbd>
                  </div>
                  <div class="flex justify-content-between">
                    <span>Undo</span>
                    <kbd class="text-xs">Ctrl+Z</kbd>
                  </div>
                  <div class="flex justify-content-between">
                    <span>Redo</span>
                    <kbd class="text-xs">Ctrl+Y</kbd>
                  </div>
                </div>
              </div>

              <div class="shortcut-section">
                <p class="font-semibold text-sm mb-2">File Operations</p>
                <div class="flex flex-col gap-1 text-sm">
                  <div class="flex justify-content-between">
                    <span>Export to SVG</span>
                    <kbd class="text-xs">Ctrl+S</kbd>
                  </div>
                  <div class="flex justify-content-between">
                    <span>Export Options</span>
                    <kbd class="text-xs">Ctrl+O</kbd>
                  </div>
                </div>
              </div>

              <div class="shortcut-section">
                <p class="font-semibold text-sm mb-2">View</p>
                <div class="flex flex-col gap-1 text-sm">
                  <div class="flex justify-content-between">
                    <span>Toggle Grid</span>
                    <kbd class="text-xs">G</kbd>
                  </div>
                  <div class="flex justify-content-between">
                    <span>Toggle Help</span>
                    <kbd class="text-xs">H</kbd>
                  </div>
                </div>
              </div>

              <div class="shortcut-section">
                <p class="font-semibold text-sm mb-2">Selection</p>
                <div class="flex flex-col gap-1 text-sm">
                  <div class="flex justify-content-between">
                    <span>Select All</span>
                    <kbd class="text-xs">Ctrl+A</kbd>
                  </div>
                </div>
              </div>
            </div>
          </p-accordionpanel>

          <!-- Export Options -->
          <p-accordionpanel header="Export Options">
            <div class="flex flex-col gap-2 text-sm">
              <p><strong>Filename:</strong> Specify the output filename (must end in .svg)</p>
              <p><strong>Dimensions:</strong> Set canvas width and height in pixels</p>
              <p><strong>Padding:</strong> Add spacing around shapes in the exported SVG</p>
              <p>
                <strong>Optimization:</strong> Choose compression level (none, basic, aggressive)
              </p>
              <p>
                The exported SVG file can be opened in any modern web browser or vector graphics
                editor.
              </p>
            </div>
          </p-accordionpanel>

          <!-- Tips & Tricks -->
          <p-accordionpanel header="Tips & Tricks">
            <div class="flex flex-col gap-2 text-sm">
              <p>
                <strong>Snap Guides:</strong> Lines automatically snap to horizontal and vertical
                angles for precise drawing
              </p>
              <p>
                <strong>Auto-Save:</strong> Your drawing is automatically saved to your browser and
                restored when you return
              </p>
              <p>
                <strong>Undo/Redo:</strong> Every action can be undone with Ctrl+Z and redone with
                Ctrl+Y
              </p>
              <p>
                <strong>Polygon Closing:</strong> Double-click near the first vertex to
                automatically close a polygon
              </p>
              <p>
                <strong>Shape Editing:</strong> Select a shape to modify its color, stroke width, or
                fill properties
              </p>
            </div>
          </p-accordionpanel>
        </p-accordion>
      </div>
    </div>
  `,
  styles: [
    `
      .help-panel {
        overflow-y: auto;
        max-height: calc(100vh - 200px);
      }

      :host ::ng-deep .p-accordion-content {
        padding: 1rem;
      }

      kbd {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 3px;
        padding: 0.125rem 0.375rem;
        font-family: monospace;
        font-weight: 600;
        font-size: 0.75rem;
      }

      .shortcut-section {
        padding: 0.5rem 0;
        border-bottom: 1px solid #e5e7eb;
      }

      .shortcut-section:last-child {
        border-bottom: none;
      }
    `,
  ],
})
export class HelpPanelComponent {}
