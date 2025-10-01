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
import { ZoomControlsComponent } from '../zoom-controls/zoom-controls.component';
import {
  Point,
  LineShape,
  PolygonShape,
  PolylineShape,
  RectangleShape,
  CircleShape,
  EllipseShape,
  TriangleShape,
  BezierShape,
  Shape,
  ShapeStyle,
} from '@nodeangularfullstack/shared';

/**
 * Canvas renderer component for SVG drawing.
 * Handles rendering shapes, mouse interactions, and snap guides.
 */
@Component({
  selector: 'app-canvas-renderer',
  standalone: true,
  imports: [CommonModule, ZoomControlsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="canvas-container relative w-full h-full"
      [class.cursor-select]="drawingService.currentTool() === 'select'"
      [class.panning]="isPanning"
      [class.pan-mode]="canPan()"
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
        [attr.viewBox]="getViewBox()"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp($event)"
        (mouseleave)="onMouseLeave($event)"
        (dblclick)="onDoubleClick($event)"
        (wheel)="onWheel($event)"
      >
        <!-- Render all completed shapes (only visible ones) -->
        @for (shape of visibleShapes(); track shape.id) {
          @if (shape.type === 'line') {
            <g>
              <line
                [attr.x1]="asLineShape(shape).start.x"
                [attr.y1]="asLineShape(shape).start.y"
                [attr.x2]="asLineShape(shape).end.x"
                [attr.y2]="asLineShape(shape).end.y"
                [attr.stroke]="shape.color"
                [attr.stroke-width]="shape.strokeWidth"
                [attr.stroke-dasharray]="getStrokeDashArray(shape.lineStyle)"
                [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
                stroke-linecap="round"
                (click)="onShapeClick($event, shape)"
              />
              <!-- Cut marks (darts) at end point -->
              @if (asLineShape(shape).hasCutMarks) {
                @for (dart of getCutMarks(asLineShape(shape), 'end'); track $index) {
                  <line
                    [attr.x1]="dart.x1"
                    [attr.y1]="dart.y1"
                    [attr.x2]="dart.x2"
                    [attr.y2]="dart.y2"
                    [attr.stroke]="shape.color"
                    [attr.stroke-width]="shape.strokeWidth"
                    stroke-linecap="round"
                  />
                }
              }
            </g>
          }
          @if (shape.type === 'polygon') {
            <polygon
              [attr.points]="getPolygonPoints(asPolygonShape(shape))"
              [attr.fill]="shape.fillColor || 'transparent'"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              stroke-linejoin="round"
              (click)="onShapeClick($event, shape)"
            />
          }
          @if (shape.type === 'polyline') {
            <polyline
              [attr.points]="getPolylinePoints(asPolylineShape(shape))"
              [attr.fill]="'none'"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [attr.stroke-dasharray]="getStrokeDashArray(shape.lineStyle)"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              stroke-linejoin="round"
              stroke-linecap="round"
              (click)="onShapeClick($event, shape)"
            />
          }
          @if (shape.type === 'rectangle') {
            <rect
              [attr.x]="asRectangleShape(shape).topLeft.x"
              [attr.y]="asRectangleShape(shape).topLeft.y"
              [attr.width]="asRectangleShape(shape).width"
              [attr.height]="asRectangleShape(shape).height"
              [attr.fill]="shape.fillColor || 'transparent'"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              (click)="onShapeClick($event, shape)"
            />
          }
          @if (shape.type === 'circle') {
            <circle
              [attr.cx]="asCircleShape(shape).center.x"
              [attr.cy]="asCircleShape(shape).center.y"
              [attr.r]="asCircleShape(shape).radius"
              [attr.fill]="shape.fillColor || 'transparent'"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              (click)="onShapeClick($event, shape)"
            />
          }
          @if (shape.type === 'ellipse') {
            <ellipse
              [attr.cx]="asEllipseShape(shape).center.x"
              [attr.cy]="asEllipseShape(shape).center.y"
              [attr.rx]="asEllipseShape(shape).radiusX"
              [attr.ry]="asEllipseShape(shape).radiusY"
              [attr.fill]="shape.fillColor || 'transparent'"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              (click)="onShapeClick($event, shape)"
            />
          }
          @if (shape.type === 'triangle') {
            <polygon
              [attr.points]="getTrianglePoints(asTriangleShape(shape))"
              [attr.fill]="shape.fillColor || 'transparent'"
              [attr.stroke]="shape.color"
              [attr.stroke-width]="shape.strokeWidth"
              [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
              stroke-linejoin="round"
              (click)="onShapeClick($event, shape)"
            />
          }
          @if (shape.type === 'bezier') {
            <g (click)="onShapeClick($event, shape)">
              <path
                [attr.d]="getBezierPath(asBezierShape(shape))"
                [attr.fill]="'none'"
                [attr.stroke]="shape.color"
                [attr.stroke-width]="shape.strokeWidth"
                [class.shape-selected]="drawingService.selectedShapeId() === shape.id"
                stroke-linecap="round"
              />
              <!-- Show control points when selected -->
              @if (drawingService.selectedShapeId() === shape.id) {
                <!-- Control lines -->
                <line
                  [attr.x1]="asBezierShape(shape).start.x"
                  [attr.y1]="asBezierShape(shape).start.y"
                  [attr.x2]="asBezierShape(shape).controlPoint1.x"
                  [attr.y2]="asBezierShape(shape).controlPoint1.y"
                  stroke="#999"
                  stroke-width="1"
                  stroke-dasharray="3,3"
                />
                <line
                  [attr.x1]="asBezierShape(shape).end.x"
                  [attr.y1]="asBezierShape(shape).end.y"
                  [attr.x2]="asBezierShape(shape).controlPoint2.x"
                  [attr.y2]="asBezierShape(shape).controlPoint2.y"
                  stroke="#999"
                  stroke-width="1"
                  stroke-dasharray="3,3"
                />
                <!-- Control point handles -->
                <circle
                  [attr.cx]="asBezierShape(shape).controlPoint1.x"
                  [attr.cy]="asBezierShape(shape).controlPoint1.y"
                  r="5"
                  fill="#3b82f6"
                  stroke="white"
                  stroke-width="2"
                />
                <circle
                  [attr.cx]="asBezierShape(shape).controlPoint2.x"
                  [attr.cy]="asBezierShape(shape).controlPoint2.y"
                  r="5"
                  fill="#3b82f6"
                  stroke="white"
                  stroke-width="2"
                />
              }
            </g>
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

          <!-- Preview line from last vertex to cursor with angle display -->
          @if (lastMousePos() && drawingService.activeVertices().length > 0) {
            @let lastVertex =
              drawingService.activeVertices()[drawingService.activeVertices().length - 1];
            @let angle = drawingService.calculateAngle(lastVertex, lastMousePos()!);
            @let isSnapped = drawingService.shouldSnap(angle);
            @let snappedPoint =
              drawingService.snapEnabled()
                ? drawingService.applySnapToPoint(lastVertex, lastMousePos()!)
                : lastMousePos()!;

            <!-- Preview line (snapped if enabled) -->
            <line
              [attr.x1]="lastVertex.x"
              [attr.y1]="lastVertex.y"
              [attr.x2]="snappedPoint.x"
              [attr.y2]="snappedPoint.y"
              [attr.stroke]="isSnapped ? '#ef4444' : '#666666'"
              [attr.stroke-width]="isSnapped ? '3' : '2'"
              stroke-dasharray="5,5"
            />

            <!-- Angle indicator -->
            @let midX = (lastVertex.x + snappedPoint.x) / 2;
            @let midY = (lastVertex.y + snappedPoint.y) / 2;
            @let displayAngle = isSnapped ? drawingService.snapToNearest(angle) : angle;

            <circle
              [attr.cx]="midX"
              [attr.cy]="midY"
              r="25"
              [attr.fill]="isSnapped ? '#fee2e2' : '#f3f4f6'"
              [attr.stroke]="isSnapped ? '#ef4444' : '#666666'"
              stroke-width="2"
              opacity="0.9"
            />
            <text
              [attr.x]="midX"
              [attr.y]="midY + 5"
              text-anchor="middle"
              [attr.fill]="isSnapped ? '#991b1b' : '#374151'"
              font-size="14"
              font-weight="bold"
              font-family="Arial, sans-serif"
            >
              {{ displayAngle }}°
            </text>

            @if (isSnapped) {
              <g>
                <circle
                  [attr.cx]="snappedPoint.x"
                  [attr.cy]="snappedPoint.y"
                  r="8"
                  fill="#ef4444"
                  stroke="white"
                  stroke-width="2"
                  opacity="0.8"
                />
                @let directionLabel = getSnapDirectionLabel(displayAngle);
                <text
                  [attr.x]="snappedPoint.x"
                  [attr.y]="snappedPoint.y - 15"
                  text-anchor="middle"
                  fill="#991b1b"
                  font-size="12"
                  font-weight="bold"
                  font-family="Arial, sans-serif"
                >
                  {{ directionLabel }}
                </text>
              </g>
            }
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

        <!-- Render in-progress polyline -->
        @if (
          drawingService.currentTool() === 'polyline' && drawingService.activeVertices().length > 0
        ) {
          <!-- Lines connecting vertices (no closing line to first vertex) -->
          @for (vertex of drawingService.activeVertices(); track $index) {
            @if ($index > 0) {
              <line
                [attr.x1]="drawingService.activeVertices()[$index - 1].x"
                [attr.y1]="drawingService.activeVertices()[$index - 1].y"
                [attr.x2]="vertex.x"
                [attr.y2]="vertex.y"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            }
          }

          <!-- Preview line from last vertex to cursor with angle and snap indication -->
          @if (lastMousePos() && drawingService.activeVertices().length > 0) {
            @let lastVertex =
              drawingService.activeVertices()[drawingService.activeVertices().length - 1];
            @let angle = drawingService.calculateAngle(lastVertex, lastMousePos()!);
            @let isSnapped = drawingService.shouldSnap(angle);
            @let snappedPoint =
              drawingService.snapEnabled()
                ? drawingService.applySnapToPoint(lastVertex, lastMousePos()!)
                : lastMousePos()!;

            <!-- Preview line (snapped if enabled) -->
            <line
              [attr.x1]="lastVertex.x"
              [attr.y1]="lastVertex.y"
              [attr.x2]="snappedPoint.x"
              [attr.y2]="snappedPoint.y"
              [attr.stroke]="isSnapped ? '#10b981' : '#3b82f6'"
              [attr.stroke-width]="isSnapped ? '3' : '2'"
              stroke-dasharray="5,5"
            />

            <!-- Angle indicator circle and text -->
            @let midX = (lastVertex.x + snappedPoint.x) / 2;
            @let midY = (lastVertex.y + snappedPoint.y) / 2;
            @let displayAngle = isSnapped ? drawingService.snapToNearest(angle) : angle;

            <!-- Angle background circle -->
            <circle
              [attr.cx]="midX"
              [attr.cy]="midY"
              r="25"
              [attr.fill]="isSnapped ? '#d1fae5' : '#dbeafe'"
              [attr.stroke]="isSnapped ? '#10b981' : '#3b82f6'"
              stroke-width="2"
              opacity="0.9"
            />

            <!-- Angle text -->
            <text
              [attr.x]="midX"
              [attr.y]="midY + 5"
              text-anchor="middle"
              [attr.fill]="isSnapped ? '#047857' : '#1e40af'"
              font-size="14"
              font-weight="bold"
              font-family="Arial, sans-serif"
            >
              {{ displayAngle }}°
            </text>

            <!-- Snap indicator at cursor position -->
            @if (isSnapped) {
              <g>
                <!-- Green indicator circle at snapped position -->
                <circle
                  [attr.cx]="snappedPoint.x"
                  [attr.cy]="snappedPoint.y"
                  r="8"
                  fill="#10b981"
                  stroke="white"
                  stroke-width="2"
                  opacity="0.8"
                />
                <!-- Snap direction label -->
                @let directionLabel = getSnapDirectionLabel(displayAngle);
                <text
                  [attr.x]="snappedPoint.x"
                  [attr.y]="snappedPoint.y - 15"
                  text-anchor="middle"
                  fill="#047857"
                  font-size="12"
                  font-weight="bold"
                  font-family="Arial, sans-serif"
                >
                  {{ directionLabel }}
                </text>
              </g>
            }
          }

          <!-- Vertex markers -->
          @for (vertex of drawingService.activeVertices(); track $index) {
            <circle
              [attr.cx]="vertex.x"
              [attr.cy]="vertex.y"
              r="5"
              fill="#3b82f6"
              stroke="white"
              stroke-width="2"
            />
          }
        }

        <!-- Render in-progress bezier curve preview -->
        @if (drawingService.currentTool() === 'bezier' && bezierControlPoints.length > 0) {
          <g class="bezier-preview">
            <!-- Show points clicked so far -->
            @for (point of bezierControlPoints; track $index) {
              <circle
                [attr.cx]="point.x"
                [attr.cy]="point.y"
                r="5"
                fill="#3b82f6"
                stroke="white"
                stroke-width="2"
              />
            }

            <!-- Dashed lines to show next point -->
            @if (bezierControlPoints.length >= 1 && lastMousePos()) {
              <line
                [attr.x1]="bezierControlPoints[bezierControlPoints.length - 1].x"
                [attr.y1]="bezierControlPoints[bezierControlPoints.length - 1].y"
                [attr.x2]="lastMousePos()!.x"
                [attr.y2]="lastMousePos()!.y"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            }

            <!-- Preview curve when we have 3 points -->
            @if (bezierControlPoints.length === 3 && lastMousePos()) {
              <path
                [attr.d]="
                  getPreviewBezierPath(
                    bezierControlPoints[0],
                    bezierControlPoints[1],
                    bezierControlPoints[2],
                    lastMousePos()!
                  )
                "
                fill="none"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="5,5"
                stroke-linecap="round"
              />
              <!-- Control lines -->
              <line
                [attr.x1]="bezierControlPoints[0].x"
                [attr.y1]="bezierControlPoints[0].y"
                [attr.x2]="bezierControlPoints[1].x"
                [attr.y2]="bezierControlPoints[1].y"
                stroke="#999"
                stroke-width="1"
                stroke-dasharray="3,3"
              />
              <line
                [attr.x1]="lastMousePos()!.x"
                [attr.y1]="lastMousePos()!.y"
                [attr.x2]="bezierControlPoints[2].x"
                [attr.y2]="bezierControlPoints[2].y"
                stroke="#999"
                stroke-width="1"
                stroke-dasharray="3,3"
              />
            }
          </g>
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

        <!-- Render preview shape while drawing -->
        @if (previewShape()) {
          @if (previewShape()!.type === 'rectangle') {
            <rect
              [attr.x]="asRectangleShape(previewShape()!).topLeft.x"
              [attr.y]="asRectangleShape(previewShape()!).topLeft.y"
              [attr.width]="asRectangleShape(previewShape()!).width"
              [attr.height]="asRectangleShape(previewShape()!).height"
              [attr.fill]="previewShape()!.fillColor || 'transparent'"
              [attr.stroke]="previewShape()!.color"
              [attr.stroke-width]="previewShape()!.strokeWidth"
              stroke-dasharray="5,5"
              opacity="0.7"
            />
          }
          @if (previewShape()!.type === 'circle') {
            <circle
              [attr.cx]="asCircleShape(previewShape()!).center.x"
              [attr.cy]="asCircleShape(previewShape()!).center.y"
              [attr.r]="asCircleShape(previewShape()!).radius"
              [attr.fill]="previewShape()!.fillColor || 'transparent'"
              [attr.stroke]="previewShape()!.color"
              [attr.stroke-width]="previewShape()!.strokeWidth"
              stroke-dasharray="5,5"
              opacity="0.7"
            />
          }
          @if (previewShape()!.type === 'ellipse') {
            <ellipse
              [attr.cx]="asEllipseShape(previewShape()!).center.x"
              [attr.cy]="asEllipseShape(previewShape()!).center.y"
              [attr.rx]="asEllipseShape(previewShape()!).radiusX"
              [attr.ry]="asEllipseShape(previewShape()!).radiusY"
              [attr.fill]="previewShape()!.fillColor || 'transparent'"
              [attr.stroke]="previewShape()!.color"
              [attr.stroke-width]="previewShape()!.strokeWidth"
              stroke-dasharray="5,5"
              opacity="0.7"
            />
          }
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

        <!-- Resize handles for selected shape -->
        @if (drawingService.selectedShapeId() && drawingService.selectedShape()) {
          @if (getResizeHandles(drawingService.selectedShape()!); as handles) {
            @if (handles.length > 0) {
              <g class="resize-handles">
                @for (handle of handles; track handle.id) {
                  <circle
                    [attr.cx]="handle.x"
                    [attr.cy]="handle.y"
                    r="6"
                    fill="white"
                    stroke="#3b82f6"
                    stroke-width="2"
                    [attr.cursor]="handle.cursor"
                    class="resize-handle"
                    [attr.data-handle]="handle.id"
                    (mousedown)="onResizeHandleMouseDown($event, handle.id)"
                  />
                }
              </g>
            }
          }
        }

        <!-- Export Bounds Overlay -->
        @if (drawingService.showExportBounds() && drawingService.exportBounds()) {
          @let bounds = drawingService.exportBounds();
          <g class="export-bounds-overlay" opacity="0.2">
            <!-- Dashed rectangle showing export area -->
            <rect
              x="0"
              y="0"
              [attr.width]="bounds.width"
              [attr.height]="bounds.height"
              fill="none"
              stroke="#000000"
              stroke-width="2"
              stroke-dasharray="10,5"
              pointer-events="none"
            />
          </g>
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

      <!-- Floating Zoom Controls -->
      <app-zoom-controls
        [zoomLevel]="Math.round(drawingService.canvasZoom() * 100)"
        (zoomIn)="onZoomControlZoomIn()"
        (zoomOut)="onZoomControlZoomOut()"
        (resetZoom)="onZoomControlResetZoom()"
        (panDirection)="onPan($event)"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

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

      .canvas-container.panning {
        cursor: grabbing !important;
      }

      .canvas-container.panning * {
        cursor: grabbing !important;
      }

      .canvas-container.pan-mode {
        cursor: grab;
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

      /* Make all shapes appear draggable with hover effect */
      line:hover,
      polyline:hover,
      polygon:hover,
      rect:hover,
      circle:hover,
      ellipse:hover,
      path:hover {
        cursor: move;
        filter: brightness(1.15) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        transition: filter 0.15s ease;
      }

      /* Active dragging cursor */
      svg:active {
        cursor: grabbing !important;
      }

      svg:active line,
      svg:active polyline,
      svg:active polygon,
      svg:active rect,
      svg:active circle,
      svg:active ellipse,
      svg:active path {
        cursor: grabbing !important;
      }

      /* Resize handles */
      .resize-handle {
        pointer-events: all;
        transition: transform 0.1s ease;
      }

      .resize-handle:hover {
        transform: scale(1.3);
        stroke-width: 3;
      }

      .resize-handle:active {
        fill: #3b82f6;
        transform: scale(1.1);
      }

      .resize-handles {
        pointer-events: none;
      }

      .resize-handles circle {
        pointer-events: all;
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
  readonly previewShape = signal<Shape | null>(null);
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
  private isDragging = false;
  private draggedShapeId: string | null = null;
  private dragStartPos: Point | null = null;
  private isResizing = false;
  private resizeHandle: string | null = null;
  bezierControlPoints: Point[] = []; // Public for template access

  // Pan state
  isPanning = false;
  private panStartPos: Point | null = null;
  private spacebarPressed = false;

  // Expose Math for template
  readonly Math = Math;

  // Computed signal for visible shapes (filters out hidden shapes)
  readonly visibleShapes = computed(() => {
    return this.drawingService.shapes().filter((shape) => shape.visible !== false);
  });

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
   * Handles keydown events for spacebar panning.
   */
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' && !this.spacebarPressed) {
      event.preventDefault();
      this.spacebarPressed = true;
    }
  }

  /**
   * Handles keyup events for spacebar panning.
   */
  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.spacebarPressed = false;
      if (this.isPanning) {
        this.isPanning = false;
        this.panStartPos = null;
      }
    }
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
   * Handles shape click event.
   */
  onShapeClick(event: MouseEvent, shape: Shape): void {
    event.stopPropagation();
    const tool = this.drawingService.currentTool();

    if (tool === 'cut' && shape.type === 'line') {
      const clickPoint = this.getMousePosition(event);
      this.drawingService.cutLineAtPoint(shape.id, clickPoint, true);
    }
  }

  /**
   * Handles resize handle mouse down event.
   */
  onResizeHandleMouseDown(event: MouseEvent, handleId: string): void {
    event.stopPropagation();
    this.isResizing = true;
    this.resizeHandle = handleId;
    this.dragStartPos = this.getMousePosition(event);
  }

  /**
   * Gets resize handles for a shape.
   */
  getResizeHandles(shape: Shape): Array<{ id: string; x: number; y: number; cursor: string }> {
    const handles: Array<{ id: string; x: number; y: number; cursor: string }> = [];

    if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle') {
      const rect = shape as any;
      const { topLeft, width, height } = rect;

      // Corner handles
      handles.push(
        { id: 'nw', x: topLeft.x, y: topLeft.y, cursor: 'nw-resize' },
        { id: 'ne', x: topLeft.x + width, y: topLeft.y, cursor: 'ne-resize' },
        { id: 'sw', x: topLeft.x, y: topLeft.y + height, cursor: 'sw-resize' },
        { id: 'se', x: topLeft.x + width, y: topLeft.y + height, cursor: 'se-resize' },
      );
      // Edge handles
      handles.push(
        { id: 'n', x: topLeft.x + width / 2, y: topLeft.y, cursor: 'n-resize' },
        { id: 's', x: topLeft.x + width / 2, y: topLeft.y + height, cursor: 's-resize' },
        { id: 'w', x: topLeft.x, y: topLeft.y + height / 2, cursor: 'w-resize' },
        { id: 'e', x: topLeft.x + width, y: topLeft.y + height / 2, cursor: 'e-resize' },
      );
    } else if (shape.type === 'circle') {
      const circle = shape as any;
      // Handle at the right edge
      handles.push({
        id: 'e',
        x: circle.center.x + circle.radius,
        y: circle.center.y,
        cursor: 'ew-resize',
      });
    } else if (shape.type === 'ellipse') {
      const ellipse = shape as any;
      // Handle at right and bottom
      handles.push(
        {
          id: 'e',
          x: ellipse.center.x + ellipse.radiusX,
          y: ellipse.center.y,
          cursor: 'ew-resize',
        },
        {
          id: 's',
          x: ellipse.center.x,
          y: ellipse.center.y + ellipse.radiusY,
          cursor: 'ns-resize',
        },
      );
    } else if (shape.type === 'line') {
      const line = shape as LineShape;
      handles.push(
        { id: 'start', x: line.start.x, y: line.start.y, cursor: 'move' },
        { id: 'end', x: line.end.x, y: line.end.y, cursor: 'move' },
      );
    } else if (shape.type === 'star') {
      const star = shape as any;
      // Handle at outer radius
      handles.push({
        id: 'e',
        x: star.center.x + star.outerRadius,
        y: star.center.y,
        cursor: 'ew-resize',
      });
    } else if (shape.type === 'cylinder') {
      const cylinder = shape as any;
      const { topLeft, width, height } = cylinder;
      handles.push(
        { id: 'nw', x: topLeft.x, y: topLeft.y, cursor: 'nw-resize' },
        { id: 'ne', x: topLeft.x + width, y: topLeft.y, cursor: 'ne-resize' },
        { id: 'sw', x: topLeft.x, y: topLeft.y + height, cursor: 'sw-resize' },
        { id: 'se', x: topLeft.x + width, y: topLeft.y + height, cursor: 'se-resize' },
      );
    } else if (shape.type === 'cone') {
      const cone = shape as any;
      handles.push(
        { id: 'apex', x: cone.apex.x, y: cone.apex.y, cursor: 'move' },
        {
          id: 'base',
          x: cone.baseCenter.x + cone.baseWidth / 2,
          y: cone.baseCenter.y,
          cursor: 'ew-resize',
        },
      );
    } else if (shape.type === 'arrow' || shape.type === 'arc') {
      const arrowOrArc = shape as any;
      handles.push(
        { id: 'start', x: arrowOrArc.start.x, y: arrowOrArc.start.y, cursor: 'move' },
        { id: 'end', x: arrowOrArc.end.x, y: arrowOrArc.end.y, cursor: 'move' },
      );
    } else if (shape.type === 'bezier') {
      const bezier = shape as any;
      handles.push(
        { id: 'start', x: bezier.start.x, y: bezier.start.y, cursor: 'move' },
        { id: 'end', x: bezier.end.x, y: bezier.end.y, cursor: 'move' },
        { id: 'cp1', x: bezier.controlPoint1.x, y: bezier.controlPoint1.y, cursor: 'move' },
        { id: 'cp2', x: bezier.controlPoint2.x, y: bezier.controlPoint2.y, cursor: 'move' },
      );
    }
    // For polygons and triangles, return empty array (they can be moved but not resized with handles)

    return handles;
  }

  /**
   * Determines if panning is possible (spacebar or middle mouse).
   */
  canPan(): boolean {
    return this.spacebarPressed;
  }

  /**
   * Handles mouse down event to start drawing.
   */
  onMouseDown(event: MouseEvent): void {
    const point = this.getMousePosition(event);
    const tool = this.drawingService.currentTool();

    // Enable panning with spacebar + left click OR middle mouse button
    if (this.spacebarPressed || event.button === 1) {
      event.preventDefault();
      this.isPanning = true;
      this.panStartPos = { x: event.clientX, y: event.clientY };
      return;
    }

    // Don't interfere with resize handle interactions
    if (this.isResizing) {
      return;
    }

    // UNIVERSAL DRAGGING: Check if clicking on an existing shape
    // If yes, prepare for dragging regardless of current tool
    const shapeId = this.drawingService.findShapeAtPoint(point);
    if (shapeId) {
      // Prepare for potential dragging
      this.isDragging = false; // Will become true in onMouseMove if user drags
      this.draggedShapeId = shapeId;
      this.dragStartPos = point;
      this.drawingService.selectShape(shapeId);

      // For select and move tools, return early (don't start drawing)
      if (tool === 'select' || tool === 'move') {
        return;
      }

      // For other tools, still allow dragging if shape is clicked
      // But continue to check if we should start drawing instead
    } else {
      // No shape clicked - clear drag state
      this.draggedShapeId = null;
      this.dragStartPos = null;

      // Deselect if using select tool
      if (tool === 'select' || tool === 'move') {
        this.drawingService.selectShape(null);
        return;
      }
    }

    if (tool === 'line' || tool === 'rectangle' || tool === 'circle' || tool === 'ellipse') {
      this.startPoint = point;
      this.drawingService.startDrawing(point);
    } else if (tool === 'bezier') {
      // Bezier requires 4 clicks: start, control1, control2, end
      if (this.bezierControlPoints.length === 0) {
        this.bezierControlPoints.push(point); // start point
        this.drawingService.startDrawing(point);
      } else if (this.bezierControlPoints.length === 1) {
        this.bezierControlPoints.push(point); // control point 1
      } else if (this.bezierControlPoints.length === 2) {
        this.bezierControlPoints.push(point); // control point 2
      } else if (this.bezierControlPoints.length === 3) {
        // Fourth click - complete bezier
        const style = this.drawingService.currentStyle();
        const bezier: BezierShape = {
          id: this.drawingService.generateShapeId(),
          type: 'bezier',
          start: this.bezierControlPoints[0],
          controlPoint1: this.bezierControlPoints[1],
          controlPoint2: this.bezierControlPoints[2],
          end: point,
          color: style.color,
          strokeWidth: style.strokeWidth,
          createdAt: new Date(),
        };
        this.drawingService.finishDrawing(bezier);
        this.bezierControlPoints = [];
        this.drawingService.cancelDrawing();
      }
    } else if (tool === 'triangle') {
      // Triangle uses click-based drawing (3 clicks)
      const vertices = this.drawingService.activeVertices();
      if (vertices.length < 2) {
        this.drawingService.addPolygonVertex(point);
        if (vertices.length === 0) {
          this.drawingService.startDrawing(point);
        }
      } else {
        // Third click - complete triangle
        const style = this.drawingService.currentStyle();
        const triangle: TriangleShape = {
          id: this.drawingService.generateShapeId(),
          type: 'triangle',
          vertices: [vertices[0], vertices[1], point],
          color: style.color,
          strokeWidth: style.strokeWidth,
          fillColor: style.fillColor,
          createdAt: new Date(),
        };
        this.drawingService.finishDrawing(triangle);
        this.drawingService.cancelDrawing();
      }
    } else if (tool === 'polygon') {
      // Check if clicking near first vertex to close
      if (this.drawingService.isNearFirstVertex(point)) {
        this.closePolygon();
      } else {
        // Add vertex
        this.drawingService.addPolygonVertex(point);
      }
    } else if (tool === 'polyline') {
      // Add vertex to polyline
      this.drawingService.addPolylineVertex(point);
    }
  }

  /**
   * Handles mouse move event for shape preview.
   */
  onMouseMove(event: MouseEvent): void {
    const currentPoint = this.getMousePosition(event);
    this.lastMousePos.set(currentPoint);

    const tool = this.drawingService.currentTool();

    // Handle active panning
    if (this.isPanning && this.panStartPos) {
      const deltaX = event.clientX - this.panStartPos.x;
      const deltaY = event.clientY - this.panStartPos.y;
      this.drawingService.panCanvas(deltaX, deltaY);
      this.panStartPos = { x: event.clientX, y: event.clientY };
      return;
    }

    // Handle active resizing
    if (this.isResizing && this.resizeHandle && this.drawingService.selectedShapeId()) {
      this.drawingService.resizeShape(
        this.drawingService.selectedShapeId()!,
        this.resizeHandle,
        currentPoint,
      );
      return;
    }

    // UNIVERSAL DRAGGING: Activate dragging after movement threshold (any tool)
    if (!this.isDragging && this.draggedShapeId && this.dragStartPos) {
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - this.dragStartPos.x, 2) +
          Math.pow(currentPoint.y - this.dragStartPos.y, 2),
      );
      // Start dragging if moved more than 5 pixels (prevents accidental drags)
      if (distance > 5) {
        this.isDragging = true;
      }
    }

    // Handle active dragging (works with all tools)
    if (this.isDragging && this.draggedShapeId && this.dragStartPos) {
      const deltaX = currentPoint.x - this.dragStartPos.x;
      const deltaY = currentPoint.y - this.dragStartPos.y;
      this.drawingService.moveShape(this.draggedShapeId, deltaX, deltaY);
      this.dragStartPos = currentPoint;
      return;
    }

    if (!this.drawingService.isDrawing() || !this.startPoint) {
      return;
    }

    // Handle line drawing preview
    if (tool === 'line') {
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
    } else if (tool === 'rectangle') {
      // Preview rectangle
      const style = this.drawingService.currentStyle();
      const width = Math.abs(currentPoint.x - this.startPoint.x);
      const height = Math.abs(currentPoint.y - this.startPoint.y);
      const topLeft = {
        x: Math.min(this.startPoint.x, currentPoint.x),
        y: Math.min(this.startPoint.y, currentPoint.y),
      };
      this.previewShape.set({
        id: 'preview',
        type: 'rectangle',
        topLeft,
        width,
        height,
        color: style.color,
        strokeWidth: style.strokeWidth,
        fillColor: style.fillColor,
        createdAt: new Date(),
      } as RectangleShape);
    } else if (tool === 'circle') {
      // Preview circle
      const style = this.drawingService.currentStyle();
      const radius = Math.sqrt(
        Math.pow(currentPoint.x - this.startPoint.x, 2) +
          Math.pow(currentPoint.y - this.startPoint.y, 2),
      );
      this.previewShape.set({
        id: 'preview',
        type: 'circle',
        center: this.startPoint,
        radius,
        color: style.color,
        strokeWidth: style.strokeWidth,
        fillColor: style.fillColor,
        createdAt: new Date(),
      } as CircleShape);
    } else if (tool === 'ellipse') {
      // Preview ellipse
      const style = this.drawingService.currentStyle();
      const radiusX = Math.abs(currentPoint.x - this.startPoint.x);
      const radiusY = Math.abs(currentPoint.y - this.startPoint.y);
      this.previewShape.set({
        id: 'preview',
        type: 'ellipse',
        center: this.startPoint,
        radiusX,
        radiusY,
        color: style.color,
        strokeWidth: style.strokeWidth,
        fillColor: style.fillColor,
        createdAt: new Date(),
      } as EllipseShape);
    }
  }

  /**
   * Handles mouse up event to finish drawing.
   */
  onMouseUp(event: MouseEvent): void {
    // Stop panning
    if (this.isPanning) {
      this.isPanning = false;
      this.panStartPos = null;
      return;
    }

    // Stop resizing
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = null;
      this.dragStartPos = null;
      return;
    }

    // Stop dragging
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedShapeId = null;
      this.dragStartPos = null;
      return;
    }

    // Clear drag preparation state if we were preparing to drag but never actually dragged
    if (this.draggedShapeId && !this.isDragging) {
      this.draggedShapeId = null;
      this.dragStartPos = null;
      // Don't return here - allow drawing operations to continue
    }

    if (!this.drawingService.isDrawing() || !this.startPoint) {
      return;
    }

    const endPoint = this.getMousePosition(event);
    const tool = this.drawingService.currentTool();
    const style = this.drawingService.currentStyle();

    let shape: Shape | null = null;

    if (tool === 'line') {
      const snappedPoint = this.drawingService.applySnapToPoint(this.startPoint, endPoint);
      shape = {
        id: this.drawingService.generateShapeId(),
        type: 'line',
        start: this.startPoint,
        end: snappedPoint,
        color: style.color,
        strokeWidth: style.strokeWidth,
        createdAt: new Date(),
      } as LineShape;
    } else if (tool === 'rectangle') {
      const width = Math.abs(endPoint.x - this.startPoint.x);
      const height = Math.abs(endPoint.y - this.startPoint.y);
      const topLeft = {
        x: Math.min(this.startPoint.x, endPoint.x),
        y: Math.min(this.startPoint.y, endPoint.y),
      };
      shape = {
        id: this.drawingService.generateShapeId(),
        type: 'rectangle',
        topLeft,
        width,
        height,
        color: style.color,
        strokeWidth: style.strokeWidth,
        fillColor: style.fillColor,
        createdAt: new Date(),
      } as RectangleShape;
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(endPoint.x - this.startPoint.x, 2) + Math.pow(endPoint.y - this.startPoint.y, 2),
      );
      shape = {
        id: this.drawingService.generateShapeId(),
        type: 'circle',
        center: this.startPoint,
        radius,
        color: style.color,
        strokeWidth: style.strokeWidth,
        fillColor: style.fillColor,
        createdAt: new Date(),
      } as CircleShape;
    } else if (tool === 'ellipse') {
      const radiusX = Math.abs(endPoint.x - this.startPoint.x);
      const radiusY = Math.abs(endPoint.y - this.startPoint.y);
      shape = {
        id: this.drawingService.generateShapeId(),
        type: 'ellipse',
        center: this.startPoint,
        radiusX,
        radiusY,
        color: style.color,
        strokeWidth: style.strokeWidth,
        fillColor: style.fillColor,
        createdAt: new Date(),
      } as EllipseShape;
    }

    if (shape) {
      this.drawingService.finishDrawing(shape);
    }

    // Reset drawing state
    this.startPoint = null;
    this.previewLine.set(null);
    this.previewShape.set(null);
    this.angleIndicator.set(null);
    this.showSnapGuide.set(false);
  }

  /**
   * Handles mouse leave event to cancel drawing.
   */
  onMouseLeave(event: MouseEvent): void {
    // Reset panning state
    if (this.isPanning) {
      this.isPanning = false;
      this.panStartPos = null;
    }

    // Reset resizing state
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeHandle = null;
    }

    if (this.drawingService.isDrawing()) {
      this.drawingService.cancelDrawing();
      this.startPoint = null;
      this.previewLine.set(null);
      this.previewShape.set(null);
      this.angleIndicator.set(null);
      this.showSnapGuide.set(false);
    }
  }

  /**
   * Gets mouse position relative to canvas, adjusted for zoom.
   */
  private getMousePosition(event: MouseEvent | WheelEvent): Point {
    const canvas = this.canvasRef();
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const svg = canvas.nativeElement;
    const rect = svg.getBoundingClientRect();

    // Get screen coordinates
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert to canvas coordinates accounting for zoom
    const zoom = this.drawingService.canvasZoom();
    const offset = this.drawingService.canvasOffset();

    return {
      x: (screenX - offset.x) / zoom,
      y: (screenY - offset.y) / zoom,
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
   * Handles double-click event to close polygon or finish polyline.
   */
  onDoubleClick(event: MouseEvent): void {
    const tool = this.drawingService.currentTool();
    if (tool === 'polygon') {
      this.closePolygon();
    } else if (tool === 'polyline') {
      this.finishPolyline();
    }
  }

  /**
   * Closes the active polygon.
   */
  private closePolygon(): void {
    const style = this.drawingService.currentStyle();
    const polygon = this.drawingService.closePolygon(style);
    if (polygon) {
      this.lastMousePos.set(null);
    }
  }

  /**
   * Finishes the active polyline.
   */
  private finishPolyline(): void {
    const style = this.drawingService.currentStyle();
    const polyline = this.drawingService.finishPolyline(style);
    if (polyline) {
      this.lastMousePos.set(null);
    }
  }

  /**
   * Handles Enter key press to finish polyline.
   */
  @HostListener('window:keydown', ['$event'])
  onEnterKeyPress(event: KeyboardEvent): void {
    if (
      event.key === 'Enter' &&
      this.drawingService.currentTool() === 'polyline' &&
      this.drawingService.activeVertices().length >= 2
    ) {
      event.preventDefault();
      this.finishPolyline();
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
   * Type-safe helper to cast Shape to PolylineShape.
   */
  asPolylineShape(shape: Shape): PolylineShape {
    return shape as PolylineShape;
  }

  /**
   * Type-safe helper to cast Shape to RectangleShape.
   */
  asRectangleShape(shape: Shape): RectangleShape {
    return shape as RectangleShape;
  }

  /**
   * Type-safe helper to cast Shape to CircleShape.
   */
  asCircleShape(shape: Shape): CircleShape {
    return shape as CircleShape;
  }

  /**
   * Type-safe helper to cast Shape to EllipseShape.
   */
  asEllipseShape(shape: Shape): EllipseShape {
    return shape as EllipseShape;
  }

  /**
   * Type-safe helper to cast Shape to TriangleShape.
   */
  asTriangleShape(shape: Shape): TriangleShape {
    return shape as TriangleShape;
  }

  /**
   * Type-safe helper to cast Shape to BezierShape.
   */
  asBezierShape(shape: Shape): BezierShape {
    return shape as BezierShape;
  }

  /**
   * Converts polygon vertices to SVG points string.
   */
  getPolygonPoints(polygon: PolygonShape): string {
    return polygon.vertices.map((v) => `${v.x},${v.y}`).join(' ');
  }

  /**
   * Converts polyline vertices to SVG points string.
   */
  getPolylinePoints(polyline: PolylineShape): string {
    return polyline.vertices.map((v) => `${v.x},${v.y}`).join(' ');
  }

  /**
   * Converts triangle vertices to SVG points string.
   */
  getTrianglePoints(triangle: TriangleShape): string {
    return triangle.vertices.map((v) => `${v.x},${v.y}`).join(' ');
  }

  /**
   * Generates SVG path for bezier curve.
   */
  getBezierPath(bezier: BezierShape): string {
    return `M ${bezier.start.x} ${bezier.start.y} C ${bezier.controlPoint1.x} ${bezier.controlPoint1.y}, ${bezier.controlPoint2.x} ${bezier.controlPoint2.y}, ${bezier.end.x} ${bezier.end.y}`;
  }

  /**
   * Generates preview SVG path for bezier curve during drawing.
   */
  getPreviewBezierPath(start: Point, cp1: Point, cp2: Point, end: Point): string {
    return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  }

  /**
   * Gets the direction label for snap angles.
   * @param angle - Angle in degrees
   * @returns Direction label (e.g., "0° →", "90° ↑")
   */
  getSnapDirectionLabel(angle: number): string {
    const labels: Record<number, string> = {
      0: '0° →',
      90: '90° ↑',
      180: '180° ←',
      270: '270° ↓',
    };
    return labels[angle] || `${angle}°`;
  }

  /**
   * Gets the CSS transform string for the background image.
   * The background image is scaled by both its base scale and the canvas zoom.
   */
  getImageTransform(): string {
    const baseScale = this.drawingService.imageScale();
    const canvasZoom = this.drawingService.canvasZoom();
    const position = this.drawingService.imagePosition();
    const canvasOffset = this.drawingService.canvasOffset();

    // Combine base scale with canvas zoom
    const totalScale = baseScale * canvasZoom;

    // Apply canvas offset to image position
    const adjustedX = position.x * canvasZoom + canvasOffset.x;
    const adjustedY = position.y * canvasZoom + canvasOffset.y;

    return `translate(${adjustedX}px, ${adjustedY}px) scale(${totalScale})`;
  }

  /**
   * Gets the SVG viewBox adjusted for canvas zoom and offset.
   */
  getViewBox(): string {
    const zoom = this.drawingService.canvasZoom();
    const offset = this.drawingService.canvasOffset();
    const width = this.canvasWidth();
    const height = this.canvasHeight();

    // Calculate viewBox dimensions based on zoom
    const viewWidth = width / zoom;
    const viewHeight = height / zoom;
    const viewX = -offset.x / zoom;
    const viewY = -offset.y / zoom;

    return `${viewX} ${viewY} ${viewWidth} ${viewHeight}`;
  }

  /**
   * Handles mouse wheel event for zooming.
   */
  onWheel(event: WheelEvent): void {
    // Only zoom with Ctrl/Cmd key pressed
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();

    const mousePos = this.getMousePosition(event);
    const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;

    this.drawingService.zoomAtPoint(
      zoomDelta,
      mousePos.x,
      mousePos.y,
      this.canvasWidth(),
      this.canvasHeight(),
    );
  }

  /**
   * Handles zoom in from floating controls.
   */
  onZoomControlZoomIn(): void {
    this.drawingService.zoomIn();
  }

  /**
   * Handles zoom out from floating controls.
   */
  onZoomControlZoomOut(): void {
    this.drawingService.zoomOut();
  }

  /**
   * Handles reset zoom from floating controls.
   */
  onZoomControlResetZoom(): void {
    this.drawingService.resetZoom();
  }

  /**
   * Handles pan direction from floating controls.
   */
  onPan(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.drawingService.panDirection(direction, 50);
  }

  /**
   * Gets the SVG stroke-dasharray value for a line style.
   * @param lineStyle - The line style type
   * @returns SVG stroke-dasharray value or undefined for solid
   */
  getStrokeDashArray(lineStyle?: string): string | undefined {
    switch (lineStyle) {
      case 'dashed':
        return '10,5';
      case 'dotted':
        return '2,3';
      case 'solid':
      default:
        return undefined;
    }
  }

  /**
   * Calculates cut mark (dart) positions for a line.
   * Creates 2 small darts on each side of the cut point (4 total marks within 10px).
   * @param line - The line shape
   * @param position - Which end to draw marks ('start' or 'end')
   * @returns Array of dart lines
   */
  getCutMarks(
    line: LineShape,
    position: 'start' | 'end',
  ): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    const point = position === 'end' ? line.end : line.start;
    const otherPoint = position === 'end' ? line.start : line.end;

    // Calculate angle of the line
    const dx = otherPoint.x - point.x;
    const dy = otherPoint.y - point.y;
    const angle = Math.atan2(dy, dx);

    // Perpendicular angle (90 degrees)
    const perpAngle = angle + Math.PI / 2;

    // Dart parameters - keep within 10px total
    const dartLength = 5; // Length of each dart perpendicular to line
    const dartSpacing = 2; // Distance between the two darts on same side (total ~4px)

    const darts = [];

    // Create 2 darts on one side and 2 darts on the other side
    for (let side = -1; side <= 1; side += 2) {
      // side = -1 (one side) and side = 1 (other side)
      for (let i = 0; i < 2; i++) {
        // Position along the line from the cut point
        const distance = 1 + i * dartSpacing;

        // Calculate dart center position along the line
        const dartX = point.x + Math.cos(angle) * distance;
        const dartY = point.y + Math.sin(angle) * distance;

        // Calculate dart endpoints perpendicular to the line
        const x1 = dartX + Math.cos(perpAngle) * (dartLength / 2) * side;
        const y1 = dartY + Math.sin(perpAngle) * (dartLength / 2) * side;
        const x2 = dartX - Math.cos(perpAngle) * (dartLength / 2) * side;
        const y2 = dartY - Math.sin(perpAngle) * (dartLength / 2) * side;

        darts.push({ x1, y1, x2, y2 });
      }
    }

    return darts;
  }
}
