import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  ElementRef,
  viewChild,
  HostListener,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SvgDrawingService } from '../../svg-drawing.service';
import { Point, LineShape, PolygonShape, Shape, ShapeStyle } from '@nodeangularfullstack/shared';

/**
 * Canvas renderer component for SVG drawing.
 * Handles rendering shapes, mouse interactions, and snap guides.
 */
@Component({
  selector: 'app-canvas-renderer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="canvas-container relative w-full h-full"
      [class.cursor-select]="drawingService.currentTool() === 'select'"
    >
      <!-- Background Image Layer (z-index: 5) -->
      @if (drawingService.backgroundImage()) {
        <img
          [src]="drawingService.backgroundImage()!"
          [style.opacity]="drawingService.imageOpacity()"
          [style.transform]="getImageTransform()"
          class="background-image"
          alt="Background for tracing"
        />
      }

      <!-- SVG Drawing Layer (z-index: 10) -->
      <svg
        #canvas
        class="absolute inset-0 w-full h-full"
        [attr.viewBox]="'0 0 ' + canvasWidth() + ' ' + canvasHeight()"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp($event)"
        (mouseleave)="onMouseLeave($event)"
        (dblclick)="onDoubleClick($event)"
      >
        <!-- Render all completed shapes -->
        @for (shape of drawingService.shapes(); track shape.id) {
          @if (shape.type === 'line') {
            <line
              [attr.x1]="asLineShape(shape).start.x"
              [attr.y1]="asLineShape(shape).start.y"
              [attr.x2]="asLineShape(shape).end.x"
              [attr.y2]="asLineShape(shape).end.y"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              stroke-linecap="round"
            />
          }
          @if (shape.type === 'polygon') {
            <polygon
              [attr.points]="getPolygonPoints(asPolygonShape(shape))"
              [attr.fill]="shape.fillColor || 'transparent'"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              stroke-linejoin="round"
            />
          }
        }

        <!-- Render in-progress polygon -->
        @if (
          drawingService.currentTool() === 'polygon' && drawingService.activeVertices().length > 0
        ) {
          <!-- Lines connecting vertices -->
          @for (vertex of drawingService.activeVertices(); track $index) {
            @if ($index > 0) {
              <line
                [attr.x1]="drawingService.activeVertices()[$index - 1].x"
                [attr.y1]="drawingService.activeVertices()[$index - 1].y"
                [attr.x2]="vertex.x"
                [attr.y2]="vertex.y"
                stroke="#666666"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            }
          }

          <!-- Preview line from last vertex to cursor -->
          @if (lastMousePos() && drawingService.activeVertices().length > 0) {
            <line
              [attr.x1]="
                drawingService.activeVertices()[drawingService.activeVertices().length - 1].x
              "
              [attr.y1]="
                drawingService.activeVertices()[drawingService.activeVertices().length - 1].y
              "
              [attr.x2]="lastMousePos()!.x"
              [attr.y2]="lastMousePos()!.y"
              stroke="#666666"
              stroke-width="2"
              stroke-dasharray="5,5"
            />
          }

          <!-- Vertex markers -->
          @for (vertex of drawingService.activeVertices(); track $index) {
            <circle
              [attr.cx]="vertex.x"
              [attr.cy]="vertex.y"
              [attr.r]="$index === 0 ? 6 : 4"
              [attr.fill]="$index === 0 ? '#ff6b6b' : '#666666'"
              stroke="white"
              stroke-width="2"
            />
          }
        }

        <!-- Render preview line during line drawing -->
        @if (previewLine()) {
          <line
            [attr.x1]="previewLine()!.start.x"
            [attr.y1]="previewLine()!.start.y"
            [attr.x2]="previewLine()!.end.x"
            [attr.y2]="previewLine()!.end.y"
            stroke="#666666"
            stroke-width="2"
            stroke-dasharray="5,5"
            stroke-linecap="round"
          />
        }

        <!-- Render snap guides -->
        @if (showSnapGuide()) {
          <line
            [attr.x1]="snapGuideLine()!.x1"
            [attr.y1]="snapGuideLine()!.y1"
            [attr.x2]="snapGuideLine()!.x2"
            [attr.y2]="snapGuideLine()!.y2"
            stroke="#ff6b6b"
            stroke-width="1"
            stroke-dasharray="10,5"
            opacity="0.6"
          />
        }

        <!-- Selection highlight -->
        @if (drawingService.selectedShapeId()) {
          <!-- Selection bounding indicator will be added here if needed -->
        }
      </svg>

      <!-- Angle indicator -->
      @if (angleIndicator()) {
        <div
          class="absolute bg-gray-800 text-white px-2 py-1 rounded text-sm pointer-events-none"
          [style.left.px]="angleIndicator()!.x + 10"
          [style.top.px]="angleIndicator()!.y - 30"
        >
          {{ angleIndicator()!.angle }}°
        </div>
      }
    </div>
  `,
  styles: [
    `
      .canvas-container {
        cursor: crosshair;
        background: #ffffff;
        border: 1px solid #d1d5db;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }

      .canvas-container.cursor-select {
        cursor: default;
      }

      .background-image {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 5;
        transform-origin: top left;
        max-width: none;
      }

      svg {
        background: transparent;
        position: relative;
        z-index: 10;
      }

      .shape-selected {
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
      }
    `,
  ],
})
export class CanvasRendererComponent implements OnInit, OnDestroy {
  readonly drawingService = inject(SvgDrawingService);
  private readonly elementRef = inject(ElementRef);

  // ViewChild for SVG element
  private readonly canvasRef = viewChild<ElementRef<SVGSVGElement>>('canvas');

  // Component state
  readonly canvasWidth = signal<number>(800);
  readonly canvasHeight = signal<number>(600);
  readonly previewLine = signal<{ start: Point; end: Point } | null>(null);
  readonly angleIndicator = signal<{ x: number; y: number; angle: number } | null>(null);
  readonly showSnapGuide = signal<boolean>(false);
  readonly snapGuideLine = signal<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  readonly lastMousePos = signal<Point | null>(null);

  // Drawing state
  private startPoint: Point | null = null;
  private currentStyle: ShapeStyle = {
    color: '#000000',
    strokeWidth: 2,
    fillColor: undefined,
  };

  constructor() {
    // Effect to handle canvas resizing
    effect(() => {
      this.updateCanvasDimensions();
    });
  }

  ngOnInit(): void {
    this.updateCanvasDimensions();
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  /**
   * Handles window resize events.
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateCanvasDimensions();
  }

  /**
   * Updates canvas dimensions based on container size.
   */
  private updateCanvasDimensions(): void {
    const container = this.elementRef.nativeElement.querySelector('.canvas-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvasWidth.set(rect.width);
      this.canvasHeight.set(rect.height);
    }
  }

  /**
   * Handles mouse down event to start drawing.
   */
  onMouseDown(event: MouseEvent): void {
    const point = this.getMousePosition(event);
    const tool = this.drawingService.currentTool();

    if (tool === 'line') {
      this.startPoint = point;
      this.drawingService.startDrawing(point);
    } else if (tool === 'polygon') {
      // Check if clicking near first vertex to close
      if (this.drawingService.isNearFirstVertex(point)) {
        this.closePolygon();
      } else {
        // Add vertex
        this.drawingService.addPolygonVertex(point);
      }
    } else if (tool === 'select') {
      // Find shape at point
      const shapeId = this.drawingService.findShapeAtPoint(point);
      this.drawingService.selectShape(shapeId);
    }
  }

  /**
   * Handles mouse move event for line preview.
   */
  onMouseMove(event: MouseEvent): void {
    const currentPoint = this.getMousePosition(event);
    this.lastMousePos.set(currentPoint);

    const tool = this.drawingService.currentTool();

    // Handle line drawing preview
    if (tool === 'line' && this.drawingService.isDrawing() && this.startPoint) {
      // Apply snap if enabled
      const snappedPoint = this.drawingService.applySnapToPoint(this.startPoint, currentPoint);

      // Update preview line
      this.previewLine.set({
        start: this.startPoint,
        end: snappedPoint,
      });

      // Calculate and display angle
      const angle = this.drawingService.calculateAngle(this.startPoint, snappedPoint);
      this.angleIndicator.set({
        x: currentPoint.x,
        y: currentPoint.y,
        angle,
      });

      // Show snap guide if applicable
      if (this.drawingService.snapEnabled() && this.drawingService.shouldSnap(angle)) {
        this.showSnapGuide.set(true);
        this.updateSnapGuideLine(this.startPoint, snappedPoint);
      } else {
        this.showSnapGuide.set(false);
      }
    }
  }

  /**
   * Handles mouse up event to finish drawing.
   */
  onMouseUp(event: MouseEvent): void {
    if (!this.drawingService.isDrawing() || !this.startPoint) {
      return;
    }

    const endPoint = this.getMousePosition(event);
    const snappedPoint = this.drawingService.applySnapToPoint(this.startPoint, endPoint);

    // Create and add the line shape
    const lineShape: LineShape = {
      id: this.drawingService.generateShapeId(),
      type: 'line',
      start: this.startPoint,
      end: snappedPoint,
      color: '#000000',
      strokeWidth: 2,
      createdAt: new Date(),
    };

    this.drawingService.finishDrawing(lineShape);

    // Reset drawing state
    this.startPoint = null;
    this.previewLine.set(null);
    this.angleIndicator.set(null);
    this.showSnapGuide.set(false);
  }

  /**
   * Handles mouse leave event to cancel drawing.
   */
  onMouseLeave(event: MouseEvent): void {
    if (this.drawingService.isDrawing()) {
      this.drawingService.cancelDrawing();
      this.startPoint = null;
      this.previewLine.set(null);
      this.angleIndicator.set(null);
      this.showSnapGuide.set(false);
    }
  }

  /**
   * Gets mouse position relative to canvas.
   */
  private getMousePosition(event: MouseEvent): Point {
    const canvas = this.canvasRef();
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const svg = canvas.nativeElement;
    const rect = svg.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Updates the snap guide line visualization.
   */
  private updateSnapGuideLine(start: Point, end: Point): void {
    const angle = this.drawingService.calculateAngle(start, end);
    const snappedAngle = this.drawingService.snapToNearest(angle);

    // Extend the guide line across the canvas
    const length = Math.max(this.canvasWidth(), this.canvasHeight());
    const radians = (snappedAngle * Math.PI) / 180;

    this.snapGuideLine.set({
      x1: start.x - length * Math.cos(radians),
      y1: start.y - length * Math.sin(radians),
      x2: start.x + length * Math.cos(radians),
      y2: start.y + length * Math.sin(radians),
    });
  }

  /**
   * Handles double-click event to close polygon.
   */
  onDoubleClick(event: MouseEvent): void {
    if (this.drawingService.currentTool() === 'polygon') {
      this.closePolygon();
    }
  }

  /**
   * Closes the active polygon.
   */
  private closePolygon(): void {
    const polygon = this.drawingService.closePolygon(this.currentStyle);
    if (polygon) {
      this.lastMousePos.set(null);
    }
  }

  /**
   * Type-safe helper to cast Shape to LineShape.
   */
  asLineShape(shape: Shape): LineShape {
    return shape as LineShape;
  }

  /**
   * Type-safe helper to cast Shape to PolygonShape.
   */
  asPolygonShape(shape: Shape): PolygonShape {
    return shape as PolygonShape;
  }

  /**
   * Converts polygon vertices to SVG points string.
   */
  getPolygonPoints(polygon: PolygonShape): string {
    return polygon.vertices.map((v) => `${v.x},${v.y}`).join(' ');
  }

  /**
   * Gets the CSS transform string for the background image.
   */
  getImageTransform(): string {
    const scale = this.drawingService.imageScale();
    const position = this.drawingService.imagePosition();
    return `translate(${position.x}px, ${position.y}px) scale(${scale})`;
  }
}
