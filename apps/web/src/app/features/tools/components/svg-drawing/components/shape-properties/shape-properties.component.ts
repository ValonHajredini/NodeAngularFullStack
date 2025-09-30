import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PanelModule } from 'primeng/panel';
import { ColorPickerModule } from 'primeng/colorpicker';
import { SliderModule } from 'primeng/slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { Shape, ShapeStyle } from '@nodeangularfullstack/shared';

/**
 * Shape properties panel component for editing shape styling.
 * Displays color pickers, stroke width controls, and fill options for selected shapes.
 */
@Component({
  selector: 'app-shape-properties',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PanelModule,
    ColorPickerModule,
    SliderModule,
    InputNumberModule,
    CheckboxModule,
  ],
  templateUrl: './shape-properties.component.html',
  styleUrls: ['./shape-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShapePropertiesComponent {
  /**
   * Currently selected shape input.
   */
  readonly selectedShape = input<Shape | null>(null);

  /**
   * Event emitted when shape properties are updated.
   */
  readonly propertiesChanged = output<{ shapeId: string; updates: Partial<ShapeStyle> }>();

  // Local state for form controls
  strokeColor: string = '#000000';
  strokeWidth: number = 2;
  fillColor: string = 'transparent';
  hasFill: boolean = false;

  /**
   * Initializes form values when selected shape changes.
   */
  ngOnInit(): void {
    const shape = this.selectedShape();
    if (shape) {
      this.updateFormFromShape(shape);
    }
  }

  /**
   * Updates form values when selected shape input changes.
   */
  ngOnChanges(): void {
    const shape = this.selectedShape();
    if (shape) {
      this.updateFormFromShape(shape);
    }
  }

  /**
   * Updates form controls from shape data.
   * @param shape - Shape to load data from
   */
  private updateFormFromShape(shape: Shape): void {
    this.strokeColor = shape.color;
    this.strokeWidth = shape.strokeWidth;
    this.fillColor = shape.fillColor || 'transparent';
    this.hasFill = !!shape.fillColor && shape.fillColor !== 'transparent';
  }

  /**
   * Handles stroke color change.
   */
  onStrokeColorChange(color: string): void {
    const shape = this.selectedShape();
    if (!shape) return;

    this.propertiesChanged.emit({
      shapeId: shape.id,
      updates: { color },
    });
  }

  /**
   * Handles stroke width change.
   */
  onStrokeWidthChange(width: number): void {
    const shape = this.selectedShape();
    if (!shape) return;

    this.propertiesChanged.emit({
      shapeId: shape.id,
      updates: { strokeWidth: width },
    });
  }

  /**
   * Handles fill color change.
   */
  onFillColorChange(color: string): void {
    const shape = this.selectedShape();
    if (!shape) return;

    this.propertiesChanged.emit({
      shapeId: shape.id,
      updates: { fillColor: color },
    });
  }

  /**
   * Handles fill toggle change.
   */
  onFillToggle(enabled: boolean): void {
    const shape = this.selectedShape();
    if (!shape) return;

    this.hasFill = enabled;
    this.propertiesChanged.emit({
      shapeId: shape.id,
      updates: { fillColor: enabled ? this.fillColor : undefined },
    });
  }

  /**
   * Gets the display name for the shape type.
   * @returns Human-readable shape type
   */
  getShapeTypeName(): string {
    const shape = this.selectedShape();
    if (!shape) return '';

    return shape.type === 'line' ? 'Line' : shape.type === 'polygon' ? 'Polygon' : '';
  }
}
