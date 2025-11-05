import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { Shape, ShapeType } from '@nodeangularfullstack/shared';

/**
 * Interface for display items (individual shapes or groups).
 */
interface DisplayItem {
  id: string; // Shape ID or Group ID
  type: 'shape' | 'group';
  shape?: Shape; // For individual shapes
  groupId?: string; // For groups
  shapes?: Shape[]; // For groups - array of shapes in the group
  visible?: boolean; // For groups - all shapes visible
  isParentGroup?: boolean; // For groups - indicates if this group contains subgroups
  childGroupIds?: string[]; // For parent groups - array of child group IDs
}

/**
 * Shapes list panel component for managing all shapes on the canvas.
 * Displays a list of all shapes with action menus for each shape.
 */
@Component({
  selector: 'app-shapes-list',
  standalone: true,
  imports: [CommonModule, ButtonDirective, Menu, Dialog, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shapes-list-container">
      <div class="shapes-header">
        <div class="header-content">
          <h3 class="text-lg font-semibold">Items ({{ displayItems().length }})</h3>
          <div class="header-actions">
            @if (canGroup()) {
              <button
                pButton
                label="Group"
                icon="pi pi-link"
                size="small"
                severity="info"
                (click)="onGroupShapes()"
                class="action-btn"
              ></button>
            }
            @if (canUngroup()) {
              <button
                pButton
                label="Ungroup"
                icon="pi pi-link"
                size="small"
                severity="secondary"
                (click)="onUngroupShapes()"
                class="action-btn"
              ></button>
            }
            @if (selectedShapeIds().length > 1) {
              <button
                pButton
                label="Merge"
                icon="pi pi-sitemap"
                size="small"
                severity="success"
                (click)="onMergeShapes()"
                class="action-btn"
              ></button>
            }
          </div>
        </div>
        @if (shapes().length > 1) {
          <button
            pButton
            [label]="selectedShapeIds().length === shapes().length ? 'Deselect All' : 'Select All'"
            [text]="true"
            size="small"
            (click)="onSelectAll()"
            class="select-all-btn"
          ></button>
        }
      </div>

      @if (shapes().length === 0) {
        <div class="empty-state">
          <i class="pi pi-shapes text-4xl text-gray-400 mb-3"></i>
          <p class="text-gray-500 text-center">No shapes yet. Start drawing!</p>
        </div>
      } @else {
        <div class="shapes-items">
          @for (item of displayItems(); track item.id; let idx = $index) {
            @if (item.type === 'group') {
              <!-- Group item -->
              <div
                class="shape-item group-item"
                [class.selected]="isGroupSelected(item.groupId!)"
                [class.hidden]="item.visible === false"
                (click)="onGroupClick(item.groupId!, $event)"
              >
                <input
                  type="checkbox"
                  [checked]="isGroupSelected(item.groupId!)"
                  (click)="onGroupCheckboxClick($event, item.groupId!)"
                  class="shape-checkbox"
                />
                <!-- Icon: Different for parent groups vs regular groups -->
                @if (item.isParentGroup) {
                  <i class="pi pi-sitemap text-sm text-purple-600" pTooltip="Parent Group"></i>
                } @else {
                  <i class="pi pi-objects-column text-sm text-blue-600"></i>
                }
                <span class="shape-name flex-1">{{ getGroupName(item.shapes!, idx) }}</span>
                <!-- Count: Show subgroups if parent group -->
                @if (item.isParentGroup && item.childGroupIds && item.childGroupIds.length > 0) {
                  <span class="group-count text-purple-600"
                    >({{ item.childGroupIds.length }} groups,
                    {{ item.shapes!.length }} shapes)</span
                  >
                } @else {
                  <span class="group-count">({{ item.shapes!.length }})</span>
                }
                @if (item.visible === false) {
                  <i class="pi pi-eye-slash text-gray-400" style="font-size: 0.7rem;"></i>
                }
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-down"
                  [text]="true"
                  [rounded]="true"
                  size="small"
                  class="compact-menu-btn"
                  pTooltip="View Group Details"
                  (click)="openGroupDetails($event, item)"
                ></button>
                <button
                  #menuButton
                  pButton
                  type="button"
                  icon="pi pi-ellipsis-v"
                  [text]="true"
                  [rounded]="true"
                  size="small"
                  class="compact-menu-btn"
                  (click)="onMenuClick($event, item, shapeMenu, menuButton)"
                ></button>
                <p-menu
                  #shapeMenu
                  [model]="getGroupMenuItems(item)"
                  [popup]="true"
                  appendTo="body"
                ></p-menu>
              </div>
            } @else {
              <!-- Individual shape item -->
              <div
                class="shape-item"
                [class.selected]="isSelected(item.shape!.id)"
                [class.hidden]="item.shape!.visible === false"
                (click)="onShapeClick(item.shape!.id, $event)"
              >
                <input
                  type="checkbox"
                  [checked]="isSelected(item.shape!.id)"
                  (click)="onCheckboxClick($event, item.shape!.id)"
                  class="shape-checkbox"
                />
                <i
                  [class]="getShapeIcon(item.shape!.type) + ' text-sm'"
                  [style.color]="item.shape!.color"
                ></i>
                <span class="shape-name flex-1">{{ getShapeName(item.shape!, idx) }}</span>
                @if (item.shape!.visible === false) {
                  <i class="pi pi-eye-slash text-gray-400" style="font-size: 0.7rem;"></i>
                }
                <button
                  #menuButton
                  pButton
                  type="button"
                  icon="pi pi-ellipsis-v"
                  [text]="true"
                  [rounded]="true"
                  size="small"
                  class="compact-menu-btn"
                  (click)="onMenuClick($event, item, shapeMenu, menuButton)"
                ></button>
                <p-menu
                  #shapeMenu
                  [model]="getShapeMenuItems(item.shape!)"
                  [popup]="true"
                  appendTo="body"
                ></p-menu>
              </div>
            }
          }
        </div>
      }
    </div>

    <!-- Group Details Modal -->
    <p-dialog
      [(visible)]="groupDetailsVisible"
      [header]="getGroupDialogTitle()"
      [modal]="true"
      [style]="{ width: '600px' }"
      [draggable]="false"
      [resizable]="false"
    >
      @if (selectedGroupItem()) {
        <div class="group-details">
          <div class="group-details-header">
            <span class="text-sm text-gray-600"
              >{{ selectedGroupItem()!.shapes!.length }} shapes in this group</span
            >
          </div>

          <div class="group-shapes-list">
            @for (shape of selectedGroupItem()!.shapes!; track shape.id; let idx = $index) {
              <div class="group-shape-item" [class.hidden]="shape.visible === false">
                <i [class]="getShapeIcon(shape.type) + ' text-sm'" [style.color]="shape.color"></i>
                <span class="shape-name flex-1">{{ getShapeNameInGroup(shape, idx) }}</span>
                @if (shape.visible === false) {
                  <i class="pi pi-eye-slash text-gray-400" style="font-size: 0.7rem;"></i>
                }
                <div class="group-shape-actions">
                  <button
                    pButton
                    icon="pi pi-eye"
                    [class]="shape.visible === false ? 'pi-eye' : 'pi-eye-slash'"
                    [pTooltip]="shape.visible === false ? 'Show' : 'Hide'"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    (click)="onToggleShapeVisibilityInGroup(shape.id)"
                  ></button>
                  <button
                    pButton
                    icon="pi pi-pencil"
                    pTooltip="Select & Edit"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    (click)="onSelectShapeInGroup(shape.id)"
                  ></button>
                  <button
                    pButton
                    icon="pi pi-minus-circle"
                    pTooltip="Remove from Group"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    severity="danger"
                    (click)="onRemoveShapeFromGroup(shape.id)"
                  ></button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <button
          pButton
          label="Close"
          icon="pi pi-times"
          (click)="closeGroupDetails()"
          [text]="true"
        ></button>
        <button
          pButton
          label="Ungroup All"
          icon="pi pi-link"
          (click)="onUngroupFromModal()"
          severity="secondary"
        ></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .shapes-list-container {
        padding: 0;
        height: 100%;
        overflow-y: auto;
      }

      .shapes-header {
        margin-bottom: 0.75rem;
      }

      .shapes-header .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .shapes-header h3 {
        color: #1f2937;
        margin: 0;
        font-size: 1rem;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      .action-btn {
        font-size: 0.75rem;
      }

      .select-all-btn {
        font-size: 0.75rem;
        color: #6366f1;
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
        gap: 0.25rem;
      }

      .shape-item {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.5rem;
        border-radius: 0.375rem;
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
        font-size: 0.75rem;
        font-weight: 500;
        color: #374151;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.2;
      }

      .shape-item.selected .shape-name {
        color: #1e40af;
      }

      .shape-item button {
        opacity: 1;
      }

      .group-item {
        border-left: 3px solid #3b82f6;
      }

      .group-count {
        font-size: 0.7rem;
        color: #6b7280;
        margin-left: 0.25rem;
      }

      .shape-checkbox {
        width: 1rem;
        height: 1rem;
        cursor: pointer;
        accent-color: #3b82f6;
        flex-shrink: 0;
      }

      .compact-menu-btn {
        min-width: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
        padding: 0.25rem;
      }

      .compact-menu-btn .pi {
        font-size: 0.75rem;
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

      /* Group details modal styles */
      .group-details {
        padding: 0.5rem 0;
      }

      .group-details-header {
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .group-shapes-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 400px;
        overflow-y: auto;
      }

      .group-shape-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 0.375rem;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        transition: all 0.15s ease;
      }

      .group-shape-item:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
      }

      .group-shape-item.hidden {
        opacity: 0.5;
      }

      .group-shape-item .shape-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }

      .group-shape-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-left: auto;
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
   * Array of currently selected shape IDs.
   */
  readonly selectedShapeIds = input<string[]>([]);

  /**
   * Event emitted when a shape is selected/toggled.
   */
  readonly shapeSelect = output<{ shapeId: string; multiSelect: boolean }>();

  /**
   * Event emitted when all shapes should be selected.
   */
  readonly selectAll = output<void>();

  /**
   * Event emitted when merge is requested.
   */
  readonly mergeShapes = output<void>();

  /**
   * Event emitted when group is requested.
   */
  readonly groupShapes = output<void>();

  /**
   * Event emitted when ungroup is requested.
   */
  readonly ungroupShapes = output<void>();

  /**
   * Event emitted when a shape should be removed from its group.
   */
  readonly removeFromGroup = output<string>();

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
   * Signal to control group details modal visibility.
   */
  readonly groupDetailsVisible = signal<boolean>(false);

  /**
   * Signal to store the currently selected group for viewing details.
   */
  readonly selectedGroupItem = signal<DisplayItem | null>(null);

  /**
   * Computed signal that organizes shapes into display items.
   * Groups are shown as single items, nested groups shown with parent groups.
   * Only top-level items (no parentGroupId) are shown at root level.
   */
  readonly displayItems = computed<DisplayItem[]>(() => {
    const allShapes = this.shapes();
    const processedShapes = new Set<string>();
    const items: DisplayItem[] = [];

    // First pass: collect all groups (both parent and child groups)
    const groupMap = new Map<string, Shape[]>();
    const parentGroupMap = new Map<string, Set<string>>(); // parentGroupId -> Set of child groupIds

    allShapes.forEach((shape) => {
      if (shape.groupId) {
        // Add shape to its group
        if (!groupMap.has(shape.groupId)) {
          groupMap.set(shape.groupId, []);
        }
        groupMap.get(shape.groupId)!.push(shape);
        processedShapes.add(shape.id);

        // Track parent-child group relationships
        if (shape.parentGroupId) {
          if (!parentGroupMap.has(shape.parentGroupId)) {
            parentGroupMap.set(shape.parentGroupId, new Set());
          }
          parentGroupMap.get(shape.parentGroupId)!.add(shape.groupId);
        }
      }
    });

    // Second pass: Add only top-level groups (groups without parent groups)
    groupMap.forEach((shapes, groupId) => {
      // Check if any shape in this group has a parentGroupId
      const hasParent = shapes.some((s) => s.parentGroupId);

      if (!hasParent) {
        // This is a top-level group - add it to items
        const isParentGroup = parentGroupMap.has(groupId);
        const childGroups = isParentGroup ? Array.from(parentGroupMap.get(groupId)!) : [];

        items.push({
          id: groupId,
          type: 'group',
          groupId,
          shapes,
          visible: shapes.every((s) => s.visible !== false),
          isParentGroup, // NEW: flag to indicate if this group contains subgroups
          childGroupIds: childGroups, // NEW: IDs of child groups
        });
      }
    });

    // Add ungrouped shapes (no groupId at all)
    allShapes.forEach((shape) => {
      if (!processedShapes.has(shape.id)) {
        items.push({
          id: shape.id,
          type: 'shape',
          shape,
          visible: shape.visible !== false,
        });
      }
    });

    return items;
  });

  /**
   * Computed signal to check if selected shapes can be grouped.
   * Now supports mixed selections (ungrouped shapes + groups) and nested groups.
   */
  readonly canGroup = computed(() => {
    const selected = this.selectedShapeIds();
    if (selected.length < 2) return false;

    const shapes = this.shapes().filter((s) => selected.includes(s.id));

    // Get unique groupIds and parentGroupIds
    const groupIds = new Set(shapes.map((s) => s.groupId).filter((id) => id !== undefined));
    const parentGroupIds = new Set(
      shapes.map((s) => s.parentGroupId).filter((id) => id !== undefined),
    );

    // Can always group if:
    // 1. Multiple groups are selected (creates parent group)
    // 2. Mix of grouped and ungrouped shapes
    // 3. Shapes from different parent groups
    // 4. All ungrouped shapes

    // Cannot group if all shapes are already in the same group AND same parent group
    const allSameGroup =
      groupIds.size === 1 && shapes.length === shapes.filter((s) => s.groupId).length;
    const allSameParentGroup = parentGroupIds.size <= 1;

    return !(
      allSameGroup &&
      allSameParentGroup &&
      shapes.every((s) => s.groupId === shapes[0].groupId)
    );
  });

  /**
   * Computed signal to check if selected shapes can be ungrouped.
   * Returns true if selected shapes have any grouping (groupId or parentGroupId).
   */
  readonly canUngroup = computed(() => {
    const selected = this.selectedShapeIds();
    if (selected.length === 0) return false;

    const shapes = this.shapes().filter((s) => selected.includes(s.id));

    // Can ungroup if any selected shape has a groupId or parentGroupId
    return shapes.some((s) => s.groupId || s.parentGroupId);
  });

  /**
   * Checks if a shape is currently selected.
   */
  isSelected(shapeId: string): boolean {
    return this.selectedShapeIds().includes(shapeId);
  }

  /**
   * Checks if a shape is part of a group.
   */
  isGrouped(shape: Shape): boolean {
    return shape.groupId !== undefined;
  }

  /**
   * Checks if a group is selected (all shapes in the group are selected).
   */
  isGroupSelected(groupId: string): boolean {
    const groupShapes = this.shapes().filter((s) => s.groupId === groupId);
    const selectedIds = this.selectedShapeIds();
    return groupShapes.length > 0 && groupShapes.every((s) => selectedIds.includes(s.id));
  }

  /**
   * Handles shape item click to select it.
   */
  onShapeClick(shapeId: string, event?: MouseEvent): void {
    const multiSelect = event?.ctrlKey || event?.metaKey || false;
    this.shapeSelect.emit({ shapeId, multiSelect });
  }

  /**
   * Handles group item click to select all shapes in the group.
   */
  onGroupClick(groupId: string, event?: MouseEvent): void {
    event?.stopPropagation();
    const groupShapes = this.shapes().filter((s) => s.groupId === groupId);
    if (groupShapes.length > 0) {
      // Select the first shape in the group, which will trigger group selection in the service
      this.shapeSelect.emit({ shapeId: groupShapes[0].id, multiSelect: false });
    }
  }

  /**
   * Handles checkbox click for multi-select.
   */
  onCheckboxClick(event: Event, shapeId: string): void {
    event.stopPropagation();
    this.shapeSelect.emit({ shapeId, multiSelect: true });
  }

  /**
   * Handles group checkbox click to select all shapes in the group.
   */
  onGroupCheckboxClick(event: Event, groupId: string): void {
    event.stopPropagation();
    const groupShapes = this.shapes().filter((s) => s.groupId === groupId);
    if (groupShapes.length > 0) {
      // Select the first shape in the group with multi-select
      this.shapeSelect.emit({ shapeId: groupShapes[0].id, multiSelect: true });
    }
  }

  /**
   * Handles select all button click.
   */
  onSelectAll(): void {
    this.selectAll.emit();
  }

  /**
   * Handles merge shapes button click.
   */
  onMergeShapes(): void {
    this.mergeShapes.emit();
  }

  /**
   * Handles group shapes button click.
   */
  onGroupShapes(): void {
    this.groupShapes.emit();
  }

  /**
   * Handles ungroup shapes button click.
   */
  onUngroupShapes(): void {
    this.ungroupShapes.emit();
  }

  /**
   * Handles menu button click and toggles menu.
   */
  onMenuClick(event: MouseEvent, item: DisplayItem | Shape, menu: any, button: any): void {
    event.stopPropagation();
    // Use the button element as the target for better positioning
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
      'svg-symbol': 'SVG Symbol',
    };
    return `${typeNames[shape.type]} ${index + 1}`;
  }

  /**
   * Gets the display name for a group.
   */
  getGroupName(shapes: Shape[], index: number): string {
    if (shapes.length === 0) return `Group ${index + 1}`;

    // Get unique shape types in the group
    const types = [...new Set(shapes.map((s) => s.type))];
    if (types.length === 1) {
      return `Group of ${shapes.length} ${types[0]}s`;
    }
    return `Group ${index + 1}`;
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
      'svg-symbol': 'pi pi-image',
    };
    return iconMap[shapeType] || 'pi pi-circle';
  }

  /**
   * Gets the menu items for a shape.
   */
  getShapeMenuItems(shape: Shape): MenuItem[] {
    return [
      {
        label: 'Select',
        icon: 'pi pi-check',
        command: () => {
          this.shapeSelect.emit({ shapeId: shape.id, multiSelect: false });
        },
      },
      {
        separator: true,
      },
      {
        label: shape.visible === false ? 'Show' : 'Hide',
        icon: shape.visible === false ? 'pi pi-eye' : 'pi pi-eye-slash',
        command: () => {
          this.shapeToggleVisibility.emit(shape.id);
        },
      },
      {
        label: 'Duplicate',
        icon: 'pi pi-copy',
        command: () => {
          this.shapeDuplicate.emit(shape.id);
        },
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        styleClass: 'text-red-500',
        command: () => {
          this.shapeDelete.emit(shape.id);
        },
      },
    ];
  }

  /**
   * Gets the menu items for a group.
   */
  getGroupMenuItems(item: DisplayItem): MenuItem[] {
    const allVisible = item.shapes?.every((s) => s.visible !== false) ?? true;

    return [
      {
        label: 'Select Group',
        icon: 'pi pi-check',
        command: () => {
          if (item.groupId && item.shapes && item.shapes.length > 0) {
            this.shapeSelect.emit({ shapeId: item.shapes[0].id, multiSelect: false });
          }
        },
      },
      {
        separator: true,
      },
      {
        label: 'Ungroup',
        icon: 'pi pi-link',
        command: () => {
          // Select all shapes in the group first, then ungroup
          if (item.shapes && item.shapes.length > 0) {
            this.shapeSelect.emit({ shapeId: item.shapes[0].id, multiSelect: false });
            this.ungroupShapes.emit();
          }
        },
      },
      {
        separator: true,
      },
      {
        label: allVisible ? 'Hide All' : 'Show All',
        icon: allVisible ? 'pi pi-eye-slash' : 'pi pi-eye',
        command: () => {
          // Toggle visibility for all shapes in the group
          item.shapes?.forEach((shape) => {
            this.shapeToggleVisibility.emit(shape.id);
          });
        },
      },
      {
        label: 'Delete Group',
        icon: 'pi pi-trash',
        styleClass: 'text-red-500',
        command: () => {
          // Delete all shapes in the group
          item.shapes?.forEach((shape) => {
            this.shapeDelete.emit(shape.id);
          });
        },
      },
    ];
  }

  /**
   * Opens the group details modal.
   */
  openGroupDetails(event: MouseEvent, item: DisplayItem): void {
    event.stopPropagation();
    this.selectedGroupItem.set(item);
    this.groupDetailsVisible.set(true);
  }

  /**
   * Closes the group details modal.
   */
  closeGroupDetails(): void {
    this.groupDetailsVisible.set(false);
    this.selectedGroupItem.set(null);
  }

  /**
   * Gets the title for the group details dialog.
   */
  getGroupDialogTitle(): string {
    const item = this.selectedGroupItem();
    if (!item?.shapes) return 'Group Details';
    return `Group Details - ${item.shapes.length} Shapes`;
  }

  /**
   * Gets the display name for a shape within the group modal.
   */
  getShapeNameInGroup(shape: Shape, index: number): string {
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
      'svg-symbol': 'SVG Symbol',
    };
    return `${typeNames[shape.type]}`;
  }

  /**
   * Toggles shape visibility from within the group modal.
   */
  onToggleShapeVisibilityInGroup(shapeId: string): void {
    this.shapeToggleVisibility.emit(shapeId);
  }

  /**
   * Selects and closes modal to edit a shape from the group.
   */
  onSelectShapeInGroup(shapeId: string): void {
    this.shapeSelect.emit({ shapeId, multiSelect: false });
    this.closeGroupDetails();
  }

  /**
   * Removes a single shape from the group.
   */
  onRemoveShapeFromGroup(shapeId: string): void {
    this.removeFromGroup.emit(shapeId);
  }

  /**
   * Ungroups all shapes from the modal.
   */
  onUngroupFromModal(): void {
    const item = this.selectedGroupItem();
    if (item?.shapes && item.shapes.length > 0) {
      this.shapeSelect.emit({ shapeId: item.shapes[0].id, multiSelect: false });
      this.ungroupShapes.emit();
      this.closeGroupDetails();
    }
  }
}
