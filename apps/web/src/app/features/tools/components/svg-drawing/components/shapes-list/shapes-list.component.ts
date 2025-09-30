import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Shape, ShapeType } from '@nodeangularfullstack/shared';

/**
 * Shapes list panel component for managing all shapes on the canvas.
 * Displays a list of all shapes with action menus for each shape.
 */
@Component({
  selector: 'app-shapes-list',
  standalone: true,
  imports: [CommonModule, ButtonDirective, Menu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shapes-list-container">
      <div class="shapes-header">
        <h3 class="text-lg font-semibold mb-3">Shapes ({{ shapes().length }})</h3>
      </div>

      @if (shapes().length === 0) {
        <div class="empty-state">
          <i class="pi pi-shapes text-4xl text-gray-400 mb-3"></i>
          <p class="text-gray-500 text-center">No shapes yet. Start drawing!</p>
        </div>
      } @else {
        <div class="shapes-items">
          @for (shape of shapes(); track shape.id; let idx = $index) {
            <div
              class="shape-item"
              [class.selected]="isSelected(shape.id)"
              [class.hidden]="shape.visible === false"
              (click)="onShapeClick(shape.id)"
            >
              <i [class]="getShapeIcon(shape.type) + ' text-lg'" [style.color]="shape.color"></i>
              <span class="shape-name flex-1">{{ getShapeName(shape, idx) }}</span>
              @if (shape.visible === false) {
                <i class="pi pi-eye-slash text-gray-400 text-sm mr-2"></i>
              }
              <button
                #menuButton
                pButton
                type="button"
                icon="pi pi-ellipsis-v"
                [text]="true"
                [rounded]="true"
                size="small"
                (click)="onMenuClick($event, shape, shapeMenu)"
              ></button>
              <p-menu #shapeMenu [model]="getMenuItems(shape)" [popup]="true"></p-menu>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .shapes-list-container {
        padding: 1rem;
        height: 100%;
        overflow-y: auto;
      }

      .shapes-header h3 {
        color: #1f2937;
        margin: 0;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        text-align: center;
      }

      .shapes-items {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .shape-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .shape-item:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .shape-item.selected {
        background: #eff6ff;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }

      .shape-item.hidden {
        opacity: 0.5;
      }

      .shape-item.hidden:not(.selected) {
        background: #fafafa;
      }

      .shape-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .shape-item.selected .shape-name {
        color: #1e40af;
      }

      .shape-item button {
        opacity: 0;
        transition: opacity 0.15s ease;
      }

      .shape-item:hover button,
      .shape-item.selected button {
        opacity: 1;
      }

      /* Scrollbar styling */
      .shapes-list-container::-webkit-scrollbar {
        width: 6px;
      }

      .shapes-list-container::-webkit-scrollbar-track {
        background: #f1f5f9;
      }

      .shapes-list-container::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }

      .shapes-list-container::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `,
  ],
})
export class ShapesListComponent {
  /**
   * Array of shapes to display.
   */
  readonly shapes = input.required<Shape[]>();

  /**
   * ID of the currently selected shape.
   */
  readonly selectedShapeId = input<string | null>(null);

  /**
   * Event emitted when a shape is selected.
   */
  readonly shapeSelect = output<string>();

  /**
   * Event emitted when a shape visibility is toggled.
   */
  readonly shapeToggleVisibility = output<string>();

  /**
   * Event emitted when a shape should be duplicated.
   */
  readonly shapeDuplicate = output<string>();

  /**
   * Event emitted when a shape should be deleted.
   */
  readonly shapeDelete = output<string>();

  /**
   * Currently active menu reference for proper popup positioning.
   */
  private activeMenuComponent: any = null;

  /**
   * Checks if a shape is currently selected.
   */
  isSelected(shapeId: string): boolean {
    return this.selectedShapeId() === shapeId;
  }

  /**
   * Handles shape item click to select it.
   */
  onShapeClick(shapeId: string): void {
    this.shapeSelect.emit(shapeId);
  }

  /**
   * Handles menu button click and toggles menu.
   */
  onMenuClick(event: MouseEvent, shape: Shape, menu: any): void {
    event.stopPropagation();
    menu.toggle(event);
  }

  /**
   * Gets the display name for a shape.
   */
  getShapeName(shape: Shape, index: number): string {
    const typeNames: Record<ShapeType, string> = {
      line: 'Line',
      polygon: 'Polygon',
      polyline: 'Polyline',
      rectangle: 'Rectangle',
      circle: 'Circle',
      ellipse: 'Ellipse',
      triangle: 'Triangle',
      'rounded-rectangle': 'Rounded Rectangle',
      arc: 'Arc',
      bezier: 'Bezier Curve',
      star: 'Star',
      arrow: 'Arrow',
      cylinder: 'Cylinder',
      cone: 'Cone',
    };
    return `${typeNames[shape.type]} ${index + 1}`;
  }

  /**
   * Gets the PrimeNG icon class for a shape type.
   */
  getShapeIcon(shapeType: ShapeType): string {
    const iconMap: Record<ShapeType, string> = {
      line: 'pi pi-minus',
      polygon: 'pi pi-stop',
      polyline: 'pi pi-chart-bar',
      rectangle: 'pi pi-stop',
      circle: 'pi pi-circle',
      ellipse: 'pi pi-circle',
      triangle: 'pi pi-caret-up',
      'rounded-rectangle': 'pi pi-stop',
      arc: 'pi pi-replay',
      bezier: 'pi pi-chart-line',
      star: 'pi pi-star',
      arrow: 'pi pi-arrow-right',
      cylinder: 'pi pi-box',
      cone: 'pi pi-filter',
    };
    return iconMap[shapeType] || 'pi pi-circle';
  }

  /**
   * Gets the menu items for a shape.
   */
  getMenuItems(shape: Shape): MenuItem[] {
    return [
      {
        label: 'Select',
        icon: 'pi pi-check',
        command: () => this.shapeSelect.emit(shape.id),
      },
      {
        separator: true,
      },
      {
        label: shape.visible === false ? 'Show' : 'Hide',
        icon: shape.visible === false ? 'pi pi-eye' : 'pi pi-eye-slash',
        command: () => this.shapeToggleVisibility.emit(shape.id),
      },
      {
        label: 'Duplicate',
        icon: 'pi pi-copy',
        command: () => this.shapeDuplicate.emit(shape.id),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        styleClass: 'text-red-500',
        command: () => this.shapeDelete.emit(shape.id),
      },
    ];
  }
}
