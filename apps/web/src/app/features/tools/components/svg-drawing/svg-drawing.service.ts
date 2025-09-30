import { Injectable, signal, computed, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  Shape,
  LineShape,
  PolygonShape,
  PolylineShape,
  Point,
  DrawingState,
  Command,
  ShapeStyle,
  ExportOptions,
  BoundingBox,
  OptimizationLevel,
  StoredDrawing,
  DrawingSettings,
  DrawingStyleSettings,
} from '@nodeangularfullstack/shared';

/**
 * Service for SVG Drawing tool functionality.
 * Handles drawing state management, shape operations, and snap guide calculations.
 */
@Injectable({
  providedIn: 'root',
})
export class SvgDrawingService {
  // Reactive state signals
  private readonly _shapes = signal<Shape[]>([]);
  private readonly _selectedShapeId = signal<string | null>(null);
  private readonly _currentTool = signal<
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
    | 'cut'
  >('line');
  private readonly _isDrawing = signal<boolean>(false);
  private readonly _activeVertices = signal<Point[]>([]);
  private readonly _snapEnabled = signal<boolean>(true);
  private readonly _snapThreshold = signal<number>(5);
  private readonly _commandHistory = signal<Command[]>([]);
  private readonly _redoStack = signal<Command[]>([]);
  private readonly _gridVisible = signal<boolean>(false);

  // Style state signals
  private readonly _strokeColor = signal<string>('#000000');
  private readonly _strokeWidth = signal<number>(2);
  private readonly _fillColor = signal<string>('#cccccc');
  private readonly _fillEnabled = signal<boolean>(false);

  // Background image state
  private readonly _backgroundImage = signal<string | null>(null);
  private readonly _imageOpacity = signal<number>(0.5);
  private readonly _imageScale = signal<number>(1);
  private readonly _imagePosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  private readonly _imageLocked = signal<boolean>(false);

  // Canvas zoom state
  private readonly _canvasZoom = signal<number>(1);
  private readonly _canvasOffset = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // localStorage persistence
  private readonly savePending$ = new Subject<DrawingState>();
  private readonly STORAGE_KEY = 'svg-drawing-state';
  private readonly STORAGE_VERSION = '1.0';

  // Public readonly signals
  readonly shapes = this._shapes.asReadonly();
  readonly selectedShapeId = this._selectedShapeId.asReadonly();
  readonly currentTool = this._currentTool.asReadonly();
  readonly isDrawing = this._isDrawing.asReadonly();
  readonly activeVertices = this._activeVertices.asReadonly();
  readonly snapEnabled = this._snapEnabled.asReadonly();
  readonly snapThreshold = this._snapThreshold.asReadonly();
  readonly gridVisible = this._gridVisible.asReadonly();

  // Style public signals
  readonly strokeColor = this._strokeColor.asReadonly();
  readonly strokeWidth = this._strokeWidth.asReadonly();
  readonly fillColor = this._fillColor.asReadonly();
  readonly fillEnabled = this._fillEnabled.asReadonly();

  // Background image public signals
  readonly backgroundImage = this._backgroundImage.asReadonly();
  readonly imageOpacity = this._imageOpacity.asReadonly();
  readonly imageScale = this._imageScale.asReadonly();
  readonly imagePosition = this._imagePosition.asReadonly();
  readonly imageLocked = this._imageLocked.asReadonly();

  // Canvas zoom public signals
  readonly canvasZoom = this._canvasZoom.asReadonly();
  readonly canvasOffset = this._canvasOffset.asReadonly();

  // Computed signals
  readonly selectedShape = computed(() => {
    const id = this._selectedShapeId();
    return this._shapes().find((shape) => shape.id === id) || null;
  });

  readonly canUndo = computed(() => this._commandHistory().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);

  readonly currentStyle = computed<ShapeStyle>(() => ({
    color: this._strokeColor(),
    strokeWidth: this._strokeWidth(),
    fillColor: this._fillEnabled() ? this._fillColor() : undefined,
  }));

  readonly drawingState = computed<DrawingState>(() => ({
    shapes: this._shapes(),
    selectedShapeId: this._selectedShapeId(),
    currentTool: this._currentTool(),
    isDrawing: this._isDrawing(),
    activeVertices: this._activeVertices(),
    snapEnabled: this._snapEnabled(),
    snapThreshold: this._snapThreshold(),
  }));

  constructor() {
    // Setup debounced localStorage persistence
    this.savePending$.pipe(debounceTime(1000)).subscribe((state) => {
      this.saveToLocalStorage(state);
    });

    // Auto-save on state changes
    effect(() => {
      const state = this.drawingState();
      this.savePending$.next(state);
    });
  }

  /**
   * Initializes the SVG Drawing service.
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // Try to load from localStorage
    const stored = this.loadFromLocalStorage();

    if (stored) {
      this._shapes.set(stored.shapes);
      this._snapEnabled.set(stored.settings.snapEnabled);
      this._snapThreshold.set(stored.settings.snapThreshold);
      this._gridVisible.set(stored.settings.gridVisible);

      // Restore style settings if available
      if (stored.settings.style) {
        this._strokeColor.set(stored.settings.style.strokeColor);
        this._strokeWidth.set(stored.settings.style.strokeWidth);
        this._fillColor.set(stored.settings.style.fillColor);
        this._fillEnabled.set(stored.settings.style.fillEnabled);
      }

      // Restore background image settings if available
      if (stored.backgroundImage) {
        this._backgroundImage.set(stored.backgroundImage.data || null);
        this._imageOpacity.set(stored.backgroundImage.opacity ?? 0.5);
        this._imageScale.set(stored.backgroundImage.scale ?? 1);
        this._imagePosition.set(stored.backgroundImage.position ?? { x: 0, y: 0 });
        this._imageLocked.set(stored.backgroundImage.locked ?? false);
      }

      // Restore canvas zoom settings if available
      if (stored.canvasZoom !== undefined) {
        this._canvasZoom.set(stored.canvasZoom);
      }
      if (stored.canvasOffset) {
        this._canvasOffset.set(stored.canvasOffset);
      }

      console.log('SvgDrawingService initialized with stored data');
    } else {
      // Reset state on initialization
      this._shapes.set([]);
      this._selectedShapeId.set(null);
      this._currentTool.set('line');
      this._isDrawing.set(false);
      this._snapEnabled.set(true);
      this._snapThreshold.set(5);
      this._gridVisible.set(false);
      this._backgroundImage.set(null);
      this._imageOpacity.set(0.5);
      this._imageScale.set(1);
      this._imagePosition.set({ x: 0, y: 0 });
      this._imageLocked.set(false);
      this._canvasZoom.set(1);
      this._canvasOffset.set({ x: 0, y: 0 });
      console.log('SvgDrawingService initialized with defaults');
    }
  }

  /**
   * Starts a new drawing operation.
   * @param point - Starting point for the shape
   */
  startDrawing(point: Point): void {
    this._isDrawing.set(true);
  }

  /**
   * Updates the current drawing operation.
   * @param point - Current point for preview
   */
  updateDrawing(point: Point): void {
    // Shape preview will be handled by the canvas renderer
  }

  /**
   * Finishes the current drawing operation and adds the shape.
   * @param shape - The completed shape to add
   */
  finishDrawing(shape: Shape): void {
    this._shapes.update((shapes) => [...shapes, shape]);
    this._isDrawing.set(false);
    // Auto-select the newly created shape for immediate editing
    this._selectedShapeId.set(shape.id);
  }

  /**
   * Cancels the current drawing operation.
   */
  cancelDrawing(): void {
    this._isDrawing.set(false);
  }

  /**
   * Adds a shape to the canvas.
   * @param shape - Shape to add
   */
  addShape(shape: Shape): void {
    this._shapes.update((shapes) => [...shapes, shape]);
  }

  /**
   * Removes a shape from the canvas.
   * @param shapeId - ID of the shape to remove
   */
  removeShape(shapeId: string): void {
    this._shapes.update((shapes) => shapes.filter((s) => s.id !== shapeId));
    if (this._selectedShapeId() === shapeId) {
      this._selectedShapeId.set(null);
    }
  }

  /**
   * Selects a shape by ID.
   * @param shapeId - ID of the shape to select
   */
  selectShape(shapeId: string | null): void {
    this._selectedShapeId.set(shapeId);
  }

  /**
   * Sets the current drawing tool.
   * @param tool - Tool to activate
   */
  setCurrentTool(
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
    this._currentTool.set(tool);
    this._isDrawing.set(false);
    this._activeVertices.set([]);
  }

  /**
   * Toggles snap guide functionality.
   * @param enabled - Whether snap guides should be enabled
   */
  setSnapEnabled(enabled: boolean): void {
    this._snapEnabled.set(enabled);
  }

  /**
   * Sets the snap threshold in degrees.
   * @param threshold - Snap threshold (1-10 degrees)
   */
  setSnapThreshold(threshold: number): void {
    if (threshold >= 1 && threshold <= 10) {
      this._snapThreshold.set(threshold);
    }
  }

  /**
   * Calculates the angle between two points in degrees.
   * @param start - Starting point
   * @param end - Ending point
   * @returns Angle in degrees (0-360)
   */
  calculateAngle(start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    // Normalize to 0-360
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }

  /**
   * Checks if an angle should snap to horizontal/vertical.
   * @param angle - Angle in degrees
   * @returns Whether the angle should snap
   */
  shouldSnap(angle: number): boolean {
    const threshold = this._snapThreshold();
    const snapAngles = [0, 90, 180, 270];
    return snapAngles.some((snapAngle) => Math.abs(angle - snapAngle) <= threshold);
  }

  /**
   * Snaps an angle to the nearest horizontal/vertical.
   * @param angle - Angle in degrees
   * @returns Snapped angle
   */
  snapToNearest(angle: number): number {
    const snapAngles = [0, 90, 180, 270];
    return snapAngles.reduce((prev, curr) =>
      Math.abs(curr - angle) < Math.abs(prev - angle) ? curr : prev,
    );
  }

  /**
   * Applies snap adjustment to a point based on angle.
   * @param start - Starting point
   * @param end - Ending point
   * @returns Snapped ending point
   */
  applySnapToPoint(start: Point, end: Point): Point {
    if (!this._snapEnabled()) {
      return end;
    }

    const angle = this.calculateAngle(start, end);
    if (!this.shouldSnap(angle)) {
      return end;
    }

    const snappedAngle = this.snapToNearest(angle);
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

    // Convert back to cartesian coordinates
    const radians = (snappedAngle * Math.PI) / 180;
    return {
      x: start.x + distance * Math.cos(radians),
      y: start.y + distance * Math.sin(radians),
    };
  }

  /**
   * Clears all shapes from the canvas.
   */
  clearAll(): void {
    this._shapes.set([]);
    this._selectedShapeId.set(null);
    this._isDrawing.set(false);
  }

  /**
   * Generates a unique ID for shapes.
   * @returns UUID v4 string
   */
  generateShapeId(): string {
    return crypto.randomUUID();
  }

  // ===== Polygon Drawing Methods =====

  /**
   * Adds a vertex to the active polygon drawing.
   * @param point - Vertex point to add
   */
  addPolygonVertex(point: Point): void {
    this._activeVertices.update((vertices) => [...vertices, point]);
    if (!this._isDrawing()) {
      this._isDrawing.set(true);
    }
  }

  /**
   * Closes the active polygon and creates a shape.
   * @param style - Style properties for the polygon
   * @returns The created polygon shape or null if invalid
   */
  closePolygon(style: ShapeStyle): PolygonShape | null {
    const vertices = this._activeVertices();
    if (vertices.length < 3) {
      return null;
    }

    const polygon: PolygonShape = {
      id: this.generateShapeId(),
      type: 'polygon',
      vertices: [...vertices],
      color: style.color,
      strokeWidth: style.strokeWidth,
      fillColor: style.fillColor,
      createdAt: new Date(),
    };

    this.executeCommand(new AddShapeCommand(this, polygon));
    this._activeVertices.set([]);
    this._isDrawing.set(false);
    // Auto-select the newly created polygon for immediate editing
    this._selectedShapeId.set(polygon.id);

    return polygon;
  }

  /**
   * Cancels the active polygon drawing.
   */
  cancelPolygon(): void {
    this._activeVertices.set([]);
    this._isDrawing.set(false);
  }

  /**
   * Checks if a point is near the first vertex of the active polygon.
   * @param point - Point to check
   * @param tolerance - Distance tolerance in pixels (default 10)
   * @returns True if point is near first vertex
   */
  isNearFirstVertex(point: Point, tolerance: number = 10): boolean {
    const vertices = this._activeVertices();
    if (vertices.length === 0) return false;

    const first = vertices[0];
    const distance = Math.sqrt(Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2));
    return distance <= tolerance;
  }

  // ===== Polyline Drawing Methods =====

  /**
   * Adds a vertex to the active polyline drawing.
   * @param point - Vertex point to add
   */
  addPolylineVertex(point: Point): void {
    this._activeVertices.update((vertices) => [...vertices, point]);
    if (!this._isDrawing()) {
      this._isDrawing.set(true);
    }
  }

  /**
   * Finishes the active polyline and creates a shape (without closing the path).
   * @param style - Style properties for the polyline
   * @returns The created polyline shape or null if invalid
   */
  finishPolyline(style: ShapeStyle): PolylineShape | null {
    const vertices = this._activeVertices();
    if (vertices.length < 2) {
      return null;
    }

    const polyline: PolylineShape = {
      id: this.generateShapeId(),
      type: 'polyline',
      vertices: [...vertices],
      color: style.color,
      strokeWidth: style.strokeWidth,
      fillColor: style.fillColor,
      lineStyle: style.lineStyle,
      createdAt: new Date(),
    };

    this.executeCommand(new AddShapeCommand(this, polyline));
    this._activeVertices.set([]);
    this._isDrawing.set(false);
    // Auto-select the newly created polyline for immediate editing
    this._selectedShapeId.set(polyline.id);

    return polyline;
  }

  /**
   * Cancels the active polyline drawing.
   */
  cancelPolyline(): void {
    this._activeVertices.set([]);
    this._isDrawing.set(false);
  }

  // ===== Shape Selection Methods =====

  /**
   * Finds a shape at the given point.
   * @param point - Point to check
   * @returns Shape ID if found, null otherwise
   */
  findShapeAtPoint(point: Point): string | null {
    const shapes = this._shapes();
    // Check shapes in reverse order (top to bottom)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.type === 'polygon') {
        if (this.isPointInPolygon(point, (shape as PolygonShape).vertices)) {
          return shape.id;
        }
      } else if (shape.type === 'polyline') {
        // Check if point is near any line segment of the polyline
        const polyline = shape as PolylineShape;
        for (let j = 0; j < polyline.vertices.length - 1; j++) {
          const lineShape: LineShape = {
            ...shape,
            type: 'line',
            start: polyline.vertices[j],
            end: polyline.vertices[j + 1],
          } as LineShape;
          if (this.isPointOnLine(point, lineShape, 5)) {
            return shape.id;
          }
        }
      } else if (shape.type === 'line') {
        if (this.isPointOnLine(point, shape as LineShape, 5)) {
          return shape.id;
        }
      } else if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle') {
        const rect = shape as any;
        if (
          point.x >= rect.topLeft.x &&
          point.x <= rect.topLeft.x + rect.width &&
          point.y >= rect.topLeft.y &&
          point.y <= rect.topLeft.y + rect.height
        ) {
          return shape.id;
        }
      } else if (shape.type === 'circle') {
        const circle = shape as any;
        const distance = Math.sqrt(
          Math.pow(point.x - circle.center.x, 2) + Math.pow(point.y - circle.center.y, 2),
        );
        if (distance <= circle.radius) {
          return shape.id;
        }
      } else if (shape.type === 'ellipse') {
        const ellipse = shape as any;
        // Check if point is inside ellipse using ellipse equation
        const dx = (point.x - ellipse.center.x) / ellipse.radiusX;
        const dy = (point.y - ellipse.center.y) / ellipse.radiusY;
        if (dx * dx + dy * dy <= 1) {
          return shape.id;
        }
      } else if (shape.type === 'triangle') {
        const triangle = shape as any;
        if (this.isPointInPolygon(point, triangle.vertices)) {
          return shape.id;
        }
      } else if (shape.type === 'arc' || shape.type === 'arrow') {
        // Treat arc and arrow as lines for click detection
        const lineShape = shape as any;
        if (
          this.isPointOnLine(
            point,
            { ...shape, start: lineShape.start, end: lineShape.end } as LineShape,
            10,
          )
        ) {
          return shape.id;
        }
      } else if (shape.type === 'bezier') {
        // Approximate bezier as line for simple click detection
        const bezier = shape as any;
        if (
          this.isPointOnLine(
            point,
            { ...shape, start: bezier.start, end: bezier.end } as LineShape,
            10,
          )
        ) {
          return shape.id;
        }
      } else if (shape.type === 'star') {
        const star = shape as any;
        const distance = Math.sqrt(
          Math.pow(point.x - star.center.x, 2) + Math.pow(point.y - star.center.y, 2),
        );
        // Approximate as circle with outer radius
        if (distance <= star.outerRadius) {
          return shape.id;
        }
      } else if (shape.type === 'cylinder') {
        const cylinder = shape as any;
        if (
          point.x >= cylinder.topLeft.x &&
          point.x <= cylinder.topLeft.x + cylinder.width &&
          point.y >= cylinder.topLeft.y &&
          point.y <= cylinder.topLeft.y + cylinder.height
        ) {
          return shape.id;
        }
      } else if (shape.type === 'cone') {
        const cone = shape as any;
        // Approximate cone as triangle for click detection
        const width = cone.baseWidth;
        const height = Math.abs(cone.baseCenter.y - cone.apex.y);
        const vertices = [
          cone.apex,
          { x: cone.baseCenter.x - width / 2, y: cone.baseCenter.y },
          { x: cone.baseCenter.x + width / 2, y: cone.baseCenter.y },
        ];
        if (this.isPointInPolygon(point, vertices)) {
          return shape.id;
        }
      }
    }
    return null;
  }

  /**
   * Checks if a point is inside a polygon using ray casting algorithm.
   * @param point - Point to check
   * @param vertices - Polygon vertices
   * @returns True if point is inside polygon
   */
  private isPointInPolygon(point: Point, vertices: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x,
        yi = vertices[i].y;
      const xj = vertices[j].x,
        yj = vertices[j].y;

      const intersect =
        yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Checks if a point is on a line within tolerance.
   * @param point - Point to check
   * @param line - Line shape
   * @param tolerance - Distance tolerance in pixels
   * @returns True if point is on line
   */
  private isPointOnLine(point: Point, line: LineShape, tolerance: number): boolean {
    const distance = this.distanceFromPointToLine(point, line.start, line.end);
    return distance <= tolerance;
  }

  /**
   * Calculates distance from a point to a line segment.
   * @param point - Point to check
   * @param lineStart - Line start point
   * @param lineEnd - Line end point
   * @returns Distance in pixels
   */
  private distanceFromPointToLine(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ===== Shape Property Update Methods =====

  /**
   * Updates properties of a shape.
   * @param shapeId - ID of the shape to update
   * @param updates - Partial shape properties to update
   */
  updateShapeProperties(shapeId: string, updates: Partial<ShapeStyle>): void {
    const shape = this._shapes().find((s) => s.id === shapeId);
    if (!shape) return;

    const updatedShape = { ...shape, ...updates };
    this.executeCommand(new UpdateShapeCommand(this, shape, updatedShape));
  }

  /**
   * Internal method to update shape in state (used by commands).
   * @param shapeId - ID of the shape to update
   * @param updates - Partial shape properties to update
   */
  updateShapeInState(shapeId: string, updates: Partial<Shape>): void {
    this._shapes.update((shapes) =>
      shapes.map((s) => (s.id === shapeId ? { ...s, ...updates } : s)),
    );
  }

  // ===== Command Pattern Methods =====

  /**
   * Executes a command and adds it to history.
   * @param command - Command to execute
   */
  executeCommand(command: Command): void {
    command.execute();
    this._commandHistory.update((history) => {
      const newHistory = [...history, command];
      // Limit history to 50 commands
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });
    // Clear redo stack on new action
    this._redoStack.set([]);
  }

  /**
   * Undoes the last command.
   */
  undo(): void {
    const history = this._commandHistory();
    if (history.length === 0) return;

    const command = history[history.length - 1];
    command.undo();

    this._commandHistory.update((h) => h.slice(0, -1));
    this._redoStack.update((stack) => [...stack, command]);
  }

  /**
   * Redoes the last undone command.
   */
  redo(): void {
    const redoStack = this._redoStack();
    if (redoStack.length === 0) return;

    const command = redoStack[redoStack.length - 1];
    command.redo();

    this._redoStack.update((stack) => stack.slice(0, -1));
    this._commandHistory.update((h) => [...h, command]);
  }

  /**
   * Internal method to add shape to state (used by commands).
   * @param shape - Shape to add
   */
  addShapeToState(shape: Shape): void {
    this._shapes.update((shapes) => [...shapes, shape]);
  }

  /**
   * Internal method to remove shape from state (used by commands).
   * @param shapeId - ID of the shape to remove
   */
  removeShapeFromState(shapeId: string): void {
    this._shapes.update((shapes) => shapes.filter((s) => s.id !== shapeId));
    if (this._selectedShapeId() === shapeId) {
      this._selectedShapeId.set(null);
    }
  }

  /**
   * Deletes the currently selected shape.
   */
  deleteSelectedShape(): void {
    const shapeId = this._selectedShapeId();
    if (!shapeId) return;

    const shape = this._shapes().find((s) => s.id === shapeId);
    if (!shape) return;

    this.executeCommand(new DeleteShapeCommand(this, shape));
    this._selectedShapeId.set(null);
  }

  /**
   * Toggles the visibility of a shape.
   * @param shapeId - ID of the shape to toggle visibility
   */
  toggleShapeVisibility(shapeId: string): void {
    const shape = this._shapes().find((s) => s.id === shapeId);
    if (!shape) return;

    const updatedShape = { ...shape, visible: shape.visible === false ? true : false };
    this.executeCommand(new UpdateShapeCommand(this, shape, updatedShape));
  }

  /**
   * Duplicates a shape by creating a copy with a slight offset.
   * @param shapeId - ID of the shape to duplicate
   */
  duplicateShape(shapeId: string): void {
    const shape = this._shapes().find((s) => s.id === shapeId);
    if (!shape) return;

    const offset = 20; // Offset in pixels for the duplicate
    let duplicatedShape: Shape;

    if (shape.type === 'line') {
      const line = shape as LineShape;
      duplicatedShape = {
        ...line,
        id: this.generateShapeId(),
        start: { x: line.start.x + offset, y: line.start.y + offset },
        end: { x: line.end.x + offset, y: line.end.y + offset },
        createdAt: new Date(),
      } as LineShape;
    } else if (shape.type === 'polygon') {
      const polygon = shape as PolygonShape;
      duplicatedShape = {
        ...polygon,
        id: this.generateShapeId(),
        vertices: polygon.vertices.map((v) => ({ x: v.x + offset, y: v.y + offset })),
        createdAt: new Date(),
      } as PolygonShape;
    } else if (shape.type === 'polyline') {
      const polyline = shape as PolylineShape;
      duplicatedShape = {
        ...polyline,
        id: this.generateShapeId(),
        vertices: polyline.vertices.map((v) => ({ x: v.x + offset, y: v.y + offset })),
        createdAt: new Date(),
      } as PolylineShape;
    } else if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle') {
      const rect = shape as any;
      duplicatedShape = {
        ...rect,
        id: this.generateShapeId(),
        topLeft: { x: rect.topLeft.x + offset, y: rect.topLeft.y + offset },
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'circle') {
      const circle = shape as any;
      duplicatedShape = {
        ...circle,
        id: this.generateShapeId(),
        center: { x: circle.center.x + offset, y: circle.center.y + offset },
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'ellipse') {
      const ellipse = shape as any;
      duplicatedShape = {
        ...ellipse,
        id: this.generateShapeId(),
        center: { x: ellipse.center.x + offset, y: ellipse.center.y + offset },
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'triangle') {
      const triangle = shape as any;
      duplicatedShape = {
        ...triangle,
        id: this.generateShapeId(),
        vertices: triangle.vertices.map((v: Point) => ({ x: v.x + offset, y: v.y + offset })),
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'arc' || shape.type === 'arrow') {
      const arcOrArrow = shape as any;
      duplicatedShape = {
        ...arcOrArrow,
        id: this.generateShapeId(),
        start: { x: arcOrArrow.start.x + offset, y: arcOrArrow.start.y + offset },
        end: { x: arcOrArrow.end.x + offset, y: arcOrArrow.end.y + offset },
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'bezier') {
      const bezier = shape as any;
      duplicatedShape = {
        ...bezier,
        id: this.generateShapeId(),
        start: { x: bezier.start.x + offset, y: bezier.start.y + offset },
        end: { x: bezier.end.x + offset, y: bezier.end.y + offset },
        controlPoint1: {
          x: bezier.controlPoint1.x + offset,
          y: bezier.controlPoint1.y + offset,
        },
        controlPoint2: {
          x: bezier.controlPoint2.x + offset,
          y: bezier.controlPoint2.y + offset,
        },
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'star') {
      const star = shape as any;
      duplicatedShape = {
        ...star,
        id: this.generateShapeId(),
        center: { x: star.center.x + offset, y: star.center.y + offset },
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'cylinder') {
      const cylinder = shape as any;
      duplicatedShape = {
        ...cylinder,
        id: this.generateShapeId(),
        topLeft: { x: cylinder.topLeft.x + offset, y: cylinder.topLeft.y + offset },
        createdAt: new Date(),
      } as Shape;
    } else if (shape.type === 'cone') {
      const cone = shape as any;
      duplicatedShape = {
        ...cone,
        id: this.generateShapeId(),
        apex: { x: cone.apex.x + offset, y: cone.apex.y + offset },
        baseCenter: { x: cone.baseCenter.x + offset, y: cone.baseCenter.y + offset },
        createdAt: new Date(),
      } as Shape;
    } else {
      return;
    }

    this.executeCommand(new AddShapeCommand(this, duplicatedShape));
    this._selectedShapeId.set(duplicatedShape.id);
  }

  /**
   * Resizes a shape from a specific handle.
   * @param shapeId - ID of the shape to resize
   * @param handlePosition - Which handle is being dragged ('nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w', 'center')
   * @param newPoint - New position for the handle
   */
  resizeShape(shapeId: string, handlePosition: string, newPoint: Point): void {
    const shape = this._shapes().find((s) => s.id === shapeId);
    if (!shape) return;

    let resizedShape: Shape;

    if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle') {
      const rect = shape as any;
      const topLeft = { ...rect.topLeft };
      let width = rect.width;
      let height = rect.height;

      // Handle corner and edge resizing
      if (handlePosition.includes('n')) {
        const deltaY = newPoint.y - topLeft.y;
        topLeft.y = newPoint.y;
        height -= deltaY;
      }
      if (handlePosition.includes('s')) {
        height = newPoint.y - topLeft.y;
      }
      if (handlePosition.includes('w')) {
        const deltaX = newPoint.x - topLeft.x;
        topLeft.x = newPoint.x;
        width -= deltaX;
      }
      if (handlePosition.includes('e')) {
        width = newPoint.x - topLeft.x;
      }

      // Ensure minimum size
      width = Math.max(10, width);
      height = Math.max(10, height);

      resizedShape = { ...rect, topLeft, width, height };
    } else if (shape.type === 'circle') {
      const circle = shape as any;
      const radius = Math.sqrt(
        Math.pow(newPoint.x - circle.center.x, 2) + Math.pow(newPoint.y - circle.center.y, 2),
      );
      resizedShape = { ...circle, radius: Math.max(5, radius) };
    } else if (shape.type === 'ellipse') {
      const ellipse = shape as any;
      const radiusX = Math.abs(newPoint.x - ellipse.center.x);
      const radiusY = Math.abs(newPoint.y - ellipse.center.y);
      resizedShape = { ...ellipse, radiusX: Math.max(5, radiusX), radiusY: Math.max(5, radiusY) };
    } else if (shape.type === 'line') {
      const line = shape as LineShape;
      if (handlePosition === 'start') {
        resizedShape = { ...line, start: newPoint } as LineShape;
      } else {
        resizedShape = { ...line, end: newPoint } as LineShape;
      }
    } else if (shape.type === 'star') {
      const star = shape as any;
      const outerRadius = Math.sqrt(
        Math.pow(newPoint.x - star.center.x, 2) + Math.pow(newPoint.y - star.center.y, 2),
      );
      const innerRadius = (outerRadius * star.innerRadius) / star.outerRadius;
      resizedShape = {
        ...star,
        outerRadius: Math.max(10, outerRadius),
        innerRadius: Math.max(5, innerRadius),
      };
    } else if (shape.type === 'cylinder') {
      const cylinder = shape as any;
      const topLeft = { ...cylinder.topLeft };
      let width = cylinder.width;
      let height = cylinder.height;

      if (handlePosition.includes('n')) {
        const deltaY = newPoint.y - topLeft.y;
        topLeft.y = newPoint.y;
        height -= deltaY;
      }
      if (handlePosition.includes('s')) {
        height = newPoint.y - topLeft.y;
      }
      if (handlePosition.includes('w')) {
        const deltaX = newPoint.x - topLeft.x;
        topLeft.x = newPoint.x;
        width -= deltaX;
      }
      if (handlePosition.includes('e')) {
        width = newPoint.x - topLeft.x;
      }

      width = Math.max(10, width);
      height = Math.max(10, height);

      resizedShape = { ...cylinder, topLeft, width, height };
    } else if (shape.type === 'cone') {
      const cone = shape as any;
      if (handlePosition === 'apex') {
        resizedShape = { ...cone, apex: newPoint };
      } else if (handlePosition === 'base') {
        const baseWidth = Math.abs(newPoint.x - cone.baseCenter.x) * 2;
        resizedShape = { ...cone, baseWidth: Math.max(10, baseWidth) };
      } else {
        return;
      }
    } else if (shape.type === 'arrow') {
      const arrow = shape as any;
      if (handlePosition === 'start') {
        resizedShape = { ...arrow, start: newPoint };
      } else {
        resizedShape = { ...arrow, end: newPoint };
      }
    } else if (shape.type === 'arc') {
      const arc = shape as any;
      if (handlePosition === 'start') {
        resizedShape = { ...arc, start: newPoint };
      } else {
        resizedShape = { ...arc, end: newPoint };
      }
    } else if (shape.type === 'bezier') {
      const bezier = shape as any;
      if (handlePosition === 'start') {
        resizedShape = { ...bezier, start: newPoint };
      } else if (handlePosition === 'end') {
        resizedShape = { ...bezier, end: newPoint };
      } else if (handlePosition === 'cp1') {
        resizedShape = { ...bezier, controlPoint1: newPoint };
      } else if (handlePosition === 'cp2') {
        resizedShape = { ...bezier, controlPoint2: newPoint };
      } else {
        return;
      }
    } else {
      // For polygon and triangle, we don't support uniform resizing
      // They can be moved, but not resized uniformly
      return;
    }

    this.executeCommand(new UpdateShapeCommand(this, shape, resizedShape));
  }

  /**
   * Moves a shape by a delta offset.
   * @param shapeId - ID of the shape to move
   * @param deltaX - X offset in pixels
   * @param deltaY - Y offset in pixels
   */
  moveShape(shapeId: string, deltaX: number, deltaY: number): void {
    const shape = this._shapes().find((s) => s.id === shapeId);
    if (!shape) return;

    let movedShape: Shape;

    if (shape.type === 'line') {
      const line = shape as LineShape;
      movedShape = {
        ...line,
        start: { x: line.start.x + deltaX, y: line.start.y + deltaY },
        end: { x: line.end.x + deltaX, y: line.end.y + deltaY },
      } as LineShape;
    } else if (shape.type === 'polygon') {
      const polygon = shape as PolygonShape;
      movedShape = {
        ...polygon,
        vertices: polygon.vertices.map((v) => ({ x: v.x + deltaX, y: v.y + deltaY })),
      } as PolygonShape;
    } else if (shape.type === 'polyline') {
      const polyline = shape as PolylineShape;
      movedShape = {
        ...polyline,
        vertices: polyline.vertices.map((v) => ({ x: v.x + deltaX, y: v.y + deltaY })),
      } as PolylineShape;
    } else if (shape.type === 'rectangle') {
      const rect = shape as any;
      movedShape = {
        ...rect,
        topLeft: { x: rect.topLeft.x + deltaX, y: rect.topLeft.y + deltaY },
      } as Shape;
    } else if (shape.type === 'circle') {
      const circle = shape as any;
      movedShape = {
        ...circle,
        center: { x: circle.center.x + deltaX, y: circle.center.y + deltaY },
      } as Shape;
    } else if (shape.type === 'ellipse') {
      const ellipse = shape as any;
      movedShape = {
        ...ellipse,
        center: { x: ellipse.center.x + deltaX, y: ellipse.center.y + deltaY },
      } as Shape;
    } else if (shape.type === 'triangle') {
      const triangle = shape as any;
      movedShape = {
        ...triangle,
        vertices: triangle.vertices.map((v: Point) => ({ x: v.x + deltaX, y: v.y + deltaY })),
      } as Shape;
    } else if (shape.type === 'rounded-rectangle') {
      const roundedRect = shape as any;
      movedShape = {
        ...roundedRect,
        topLeft: { x: roundedRect.topLeft.x + deltaX, y: roundedRect.topLeft.y + deltaY },
      } as Shape;
    } else if (shape.type === 'arc') {
      const arc = shape as any;
      movedShape = {
        ...arc,
        start: { x: arc.start.x + deltaX, y: arc.start.y + deltaY },
        end: { x: arc.end.x + deltaX, y: arc.end.y + deltaY },
      } as Shape;
    } else if (shape.type === 'bezier') {
      const bezier = shape as any;
      movedShape = {
        ...bezier,
        start: { x: bezier.start.x + deltaX, y: bezier.start.y + deltaY },
        end: { x: bezier.end.x + deltaX, y: bezier.end.y + deltaY },
        controlPoint1: {
          x: bezier.controlPoint1.x + deltaX,
          y: bezier.controlPoint1.y + deltaY,
        },
        controlPoint2: {
          x: bezier.controlPoint2.x + deltaX,
          y: bezier.controlPoint2.y + deltaY,
        },
      } as Shape;
    } else if (shape.type === 'star') {
      const star = shape as any;
      movedShape = {
        ...star,
        center: { x: star.center.x + deltaX, y: star.center.y + deltaY },
      } as Shape;
    } else if (shape.type === 'arrow') {
      const arrow = shape as any;
      movedShape = {
        ...arrow,
        start: { x: arrow.start.x + deltaX, y: arrow.start.y + deltaY },
        end: { x: arrow.end.x + deltaX, y: arrow.end.y + deltaY },
      } as Shape;
    } else if (shape.type === 'cylinder') {
      const cylinder = shape as any;
      movedShape = {
        ...cylinder,
        topLeft: { x: cylinder.topLeft.x + deltaX, y: cylinder.topLeft.y + deltaY },
      } as Shape;
    } else if (shape.type === 'cone') {
      const cone = shape as any;
      movedShape = {
        ...cone,
        apex: { x: cone.apex.x + deltaX, y: cone.apex.y + deltaY },
        baseCenter: { x: cone.baseCenter.x + deltaX, y: cone.baseCenter.y + deltaY },
      } as Shape;
    } else {
      return;
    }

    this.executeCommand(new UpdateShapeCommand(this, shape, movedShape));
  }

  /**
   * Cuts a line at a specific point and adds cut marks (darts) at the cut point.
   * @param lineId - ID of the line to cut
   * @param cutPoint - Point where the line should be cut
   * @param addDottedLine - Whether to add a dotted line at the cut point (default: true)
   * @returns Array of new line IDs created from the cut
   */
  cutLineAtPoint(lineId: string, cutPoint: Point, addDottedLine: boolean = true): string[] {
    const line = this._shapes().find((s) => s.id === lineId && s.type === 'line') as
      | LineShape
      | undefined;
    if (!line) return [];

    // Check if cut point is on the line (use existing method)
    const distance = this.distanceFromPointToLine(cutPoint, line.start, line.end);
    if (distance > 10) {
      return [];
    }

    // Create two new lines from the cut with cut marks enabled
    const line1: LineShape = {
      id: this.generateShapeId(),
      type: 'line',
      start: line.start,
      end: cutPoint,
      color: line.color,
      strokeWidth: line.strokeWidth,
      fillColor: line.fillColor,
      lineStyle: line.lineStyle,
      hasCutMarks: true, // Add cut marks at the end point
      createdAt: new Date(),
    };

    const line2: LineShape = {
      id: this.generateShapeId(),
      type: 'line',
      start: cutPoint,
      end: line.end,
      color: line.color,
      strokeWidth: line.strokeWidth,
      fillColor: line.fillColor,
      lineStyle: addDottedLine ? 'dotted' : line.lineStyle,
      hasCutMarks: true, // Add cut marks at the start point
      createdAt: new Date(),
    };

    // Delete old line and add new ones
    this.executeCommand(new CutLineCommand(this, line, [line1, line2]));

    return [line1.id, line2.id];
  }

  // ===== SVG Export Methods =====

  /**
   * Calculates the bounding box for all shapes.
   * @param shapes - Array of shapes to calculate bounds for
   * @param padding - Optional padding around bounds in pixels
   * @returns Bounding box containing all shapes
   */
  calculateBounds(shapes: Shape[], padding: number = 20): BoundingBox {
    if (shapes.length === 0) {
      // Default dimensions for empty canvas
      return { x: 0, y: 0, width: 800, height: 600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapes.forEach((shape) => {
      if (shape.type === 'line') {
        const line = shape as LineShape;
        minX = Math.min(minX, line.start.x, line.end.x);
        minY = Math.min(minY, line.start.y, line.end.y);
        maxX = Math.max(maxX, line.start.x, line.end.x);
        maxY = Math.max(maxY, line.start.y, line.end.y);
      } else if (shape.type === 'polygon') {
        const polygon = shape as PolygonShape;
        polygon.vertices.forEach((vertex) => {
          minX = Math.min(minX, vertex.x);
          minY = Math.min(minY, vertex.y);
          maxX = Math.max(maxX, vertex.x);
          maxY = Math.max(maxY, vertex.y);
        });
      }
    });

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }

  /**
   * Converts a shape to SVG element string.
   * @param shape - Shape to convert
   * @returns SVG element string
   */
  private shapeToSVGElement(shape: Shape): string {
    const stroke = shape.color;
    const strokeWidth = shape.strokeWidth;
    const fill = shape.fillColor || 'transparent';

    if (shape.type === 'line') {
      const line = shape as LineShape;
      const x1 = line.start.x.toFixed(2);
      const y1 = line.start.y.toFixed(2);
      const x2 = line.end.x.toFixed(2);
      const y2 = line.end.y.toFixed(2);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    } else if (shape.type === 'polygon') {
      const polygon = shape as PolygonShape;
      const points = polygon.vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
      return `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
    } else if (shape.type === 'polyline') {
      const polyline = shape as PolylineShape;
      const points = polyline.vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
      return `<polyline points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none"/>`;
    } else if (shape.type === 'rectangle') {
      const rect = shape as any; // RectangleShape
      return `<rect x="${rect.topLeft.x.toFixed(2)}" y="${rect.topLeft.y.toFixed(2)}" width="${rect.width.toFixed(2)}" height="${rect.height.toFixed(2)}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
    } else if (shape.type === 'circle') {
      const circle = shape as any; // CircleShape
      return `<circle cx="${circle.center.x.toFixed(2)}" cy="${circle.center.y.toFixed(2)}" r="${circle.radius.toFixed(2)}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
    } else if (shape.type === 'ellipse') {
      const ellipse = shape as any; // EllipseShape
      return `<ellipse cx="${ellipse.center.x.toFixed(2)}" cy="${ellipse.center.y.toFixed(2)}" rx="${ellipse.radiusX.toFixed(2)}" ry="${ellipse.radiusY.toFixed(2)}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
    } else if (shape.type === 'triangle') {
      const triangle = shape as any; // TriangleShape
      const points = triangle.vertices
        .map((v: Point) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
        .join(' ');
      return `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
    }
    return '';
  }

  /**
   * Optimizes SVG content based on optimization level.
   * @param svg - SVG content string
   * @param level - Optimization level
   * @returns Optimized SVG content
   */
  private optimizeSVG(svg: string, level: OptimizationLevel): string {
    if (level === 'none') {
      return svg;
    }

    let optimized = svg;

    if (level === 'basic' || level === 'aggressive') {
      // Remove unnecessary whitespace
      optimized = optimized.replace(/\s+/g, ' ').trim();
      // Remove spaces around tags
      optimized = optimized.replace(/>\s+</g, '><');
    }

    if (level === 'aggressive') {
      // Remove default attributes
      optimized = optimized.replace(/\s+fill="transparent"/g, ' fill="none"');
      // Further minification
      optimized = optimized.replace(/\s+/g, ' ');
    }

    return optimized;
  }

  /**
   * Generates SVG content from shapes.
   * @param options - Export options for SVG generation
   * @returns SVG content string
   */
  exportToSVG(options: ExportOptions): string {
    const shapes = this._shapes();
    const bounds = this.calculateBounds(shapes, options.padding || 20);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${options.width}" height="${options.height}">`;

    shapes.forEach((shape) => {
      svg += this.shapeToSVGElement(shape);
    });

    svg += '</svg>';

    if (options.optimizationLevel !== 'none') {
      svg = this.optimizeSVG(svg, options.optimizationLevel);
    }

    return svg;
  }

  /**
   * Validates SVG structure by attempting to parse it.
   * @param svgContent - SVG content to validate
   * @returns True if SVG is valid, false otherwise
   */
  validateSVG(svgContent: string): boolean {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const parseError = doc.querySelector('parsererror');
      return !parseError;
    } catch (error) {
      console.error('SVG validation error:', error);
      return false;
    }
  }

  /**
   * Downloads SVG content as a file.
   * @param svgContent - SVG content to download
   * @param filename - Filename for the download
   */
  downloadSVG(svgContent: string, filename: string): void {
    try {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('SVG download error:', error);
      throw error;
    }
  }

  /**
   * Selects all shapes on the canvas.
   */
  selectAllShapes(): void {
    // For now, we'll select the first shape if available
    // Full multi-select could be implemented in a future enhancement
    const shapes = this._shapes();
    if (shapes.length > 0) {
      this._selectedShapeId.set(shapes[0].id);
    }
  }

  /**
   * Toggles grid visibility.
   */
  toggleGrid(): void {
    this._gridVisible.update((v) => !v);
  }

  /**
   * Sets grid visibility.
   * @param visible - Whether grid should be visible
   */
  setGridVisible(visible: boolean): void {
    this._gridVisible.set(visible);
  }

  // ===== Style Setter Methods =====

  /**
   * Sets the stroke color for new shapes.
   * @param color - Stroke color in hex format (e.g., "#000000")
   */
  setStrokeColor(color: string): void {
    this._strokeColor.set(color);
  }

  /**
   * Sets the stroke width for new shapes.
   * @param width - Stroke width in pixels (1-10)
   */
  setStrokeWidth(width: number): void {
    if (width >= 1 && width <= 10) {
      this._strokeWidth.set(width);
    }
  }

  /**
   * Sets the fill color for new shapes.
   * @param color - Fill color in hex format (e.g., "#cccccc")
   */
  setFillColor(color: string): void {
    this._fillColor.set(color);
  }

  /**
   * Toggles whether fill is enabled for new shapes.
   * @param enabled - Whether fill should be enabled
   */
  setFillEnabled(enabled: boolean): void {
    this._fillEnabled.set(enabled);
  }

  // ===== Background Image Methods =====

  /**
   * Sets the background image for tracing.
   * @param imageData - Base64 encoded image data or null to clear
   */
  setBackgroundImage(imageData: string | null): void {
    this._backgroundImage.set(imageData);
  }

  /**
   * Sets the background image opacity.
   * @param opacity - Opacity value between 0 and 1
   */
  setImageOpacity(opacity: number): void {
    if (opacity >= 0 && opacity <= 1) {
      this._imageOpacity.set(opacity);
    }
  }

  /**
   * Sets the background image scale.
   * @param scale - Scale value between 0.1 and 5
   */
  setImageScale(scale: number): void {
    if (scale >= 0.1 && scale <= 5) {
      this._imageScale.set(scale);
    }
  }

  /**
   * Sets the background image position.
   * @param x - X coordinate offset
   * @param y - Y coordinate offset
   */
  setImagePosition(x: number, y: number): void {
    this._imagePosition.set({ x, y });
  }

  /**
   * Resets the background image transform to defaults.
   */
  resetImageTransform(): void {
    this._imageScale.set(1);
    this._imagePosition.set({ x: 0, y: 0 });
  }

  /**
   * Toggles the background image lock state.
   */
  toggleImageLock(): void {
    this._imageLocked.update((locked) => !locked);
  }

  /**
   * Sets the background image lock state.
   * @param locked - Whether the image should be locked
   */
  setImageLocked(locked: boolean): void {
    this._imageLocked.set(locked);
  }

  // ===== Canvas Zoom Methods =====

  /**
   * Zooms in the canvas by 10%.
   */
  zoomIn(): void {
    const currentZoom = this._canvasZoom();
    const newZoom = Math.min(currentZoom + 0.1, 5); // Max 500%
    this._canvasZoom.set(newZoom);
  }

  /**
   * Zooms out the canvas by 10%.
   */
  zoomOut(): void {
    const currentZoom = this._canvasZoom();
    const newZoom = Math.max(currentZoom - 0.1, 0.1); // Min 10%
    this._canvasZoom.set(newZoom);
  }

  /**
   * Resets the canvas zoom to 100%.
   */
  resetZoom(): void {
    this._canvasZoom.set(1);
    this._canvasOffset.set({ x: 0, y: 0 });
  }

  /**
   * Sets a specific zoom level for the canvas.
   * @param zoom - Zoom level (0.1 to 5)
   */
  setZoom(zoom: number): void {
    const clampedZoom = Math.max(0.1, Math.min(5, zoom));
    this._canvasZoom.set(clampedZoom);
  }

  /**
   * Sets the canvas offset (pan position).
   * @param x - X offset
   * @param y - Y offset
   */
  setCanvasOffset(x: number, y: number): void {
    this._canvasOffset.set({ x, y });
  }

  /**
   * Zooms the canvas at a specific point (e.g., mouse cursor).
   * @param zoomDelta - Amount to zoom (positive = zoom in, negative = zoom out)
   * @param centerX - X coordinate of zoom center
   * @param centerY - Y coordinate of zoom center
   * @param canvasWidth - Width of the canvas
   * @param canvasHeight - Height of the canvas
   */
  zoomAtPoint(
    zoomDelta: number,
    centerX: number,
    centerY: number,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const currentZoom = this._canvasZoom();
    const currentOffset = this._canvasOffset();

    // Calculate new zoom level
    const newZoom = Math.max(0.1, Math.min(5, currentZoom + zoomDelta));

    // Calculate zoom ratio for offset adjustment
    const zoomRatio = newZoom / currentZoom;

    // Adjust offset to keep the point under cursor stationary
    const newOffsetX = centerX - (centerX - currentOffset.x) * zoomRatio;
    const newOffsetY = centerY - (centerY - currentOffset.y) * zoomRatio;

    this._canvasZoom.set(newZoom);
    this._canvasOffset.set({ x: newOffsetX, y: newOffsetY });
  }

  // ===== Canvas Pan Methods =====

  /**
   * Pans the canvas by a relative delta amount.
   * @param deltaX - X offset delta in pixels
   * @param deltaY - Y offset delta in pixels
   */
  panCanvas(deltaX: number, deltaY: number): void {
    const currentOffset = this._canvasOffset();
    this._canvasOffset.set({
      x: currentOffset.x + deltaX,
      y: currentOffset.y + deltaY,
    });
  }

  /**
   * Pans the canvas by a fixed amount in a specific direction.
   * @param direction - Direction to pan ('up', 'down', 'left', 'right')
   * @param amount - Number of pixels to pan (default: 50)
   */
  panDirection(direction: 'up' | 'down' | 'left' | 'right', amount: number = 50): void {
    const offset = this._canvasOffset();
    switch (direction) {
      case 'up':
        this._canvasOffset.set({ x: offset.x, y: offset.y + amount });
        break;
      case 'down':
        this._canvasOffset.set({ x: offset.x, y: offset.y - amount });
        break;
      case 'left':
        this._canvasOffset.set({ x: offset.x + amount, y: offset.y });
        break;
      case 'right':
        this._canvasOffset.set({ x: offset.x - amount, y: offset.y });
        break;
    }
  }

  // ===== localStorage Persistence Methods =====

  /**
   * Saves drawing state to localStorage.
   * @param state - Drawing state to save
   */
  private saveToLocalStorage(state: DrawingState): void {
    try {
      const stored: StoredDrawing = {
        version: this.STORAGE_VERSION,
        shapes: state.shapes,
        settings: {
          snapEnabled: state.snapEnabled,
          snapThreshold: state.snapThreshold,
          gridVisible: this._gridVisible(),
          style: {
            strokeColor: this._strokeColor(),
            strokeWidth: this._strokeWidth(),
            fillColor: this._fillColor(),
            fillEnabled: this._fillEnabled(),
          },
        },
        backgroundImage: {
          data: this._backgroundImage(),
          opacity: this._imageOpacity(),
          scale: this._imageScale(),
          position: this._imagePosition(),
          locked: this._imageLocked(),
        },
        canvasZoom: this._canvasZoom(),
        canvasOffset: this._canvasOffset(),
        timestamp: new Date(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded');
        // Could emit an event here for UI notification
      } else {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }

  /**
   * Loads drawing state from localStorage.
   * @returns Stored drawing data or null if not found
   */
  private loadFromLocalStorage(): StoredDrawing | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as StoredDrawing;

      // Validate version for future migrations
      if (parsed.version !== this.STORAGE_VERSION) {
        console.warn('Stored data version mismatch, using defaults');
        return null;
      }

      // Convert timestamp string back to Date
      if (typeof parsed.timestamp === 'string') {
        parsed.timestamp = new Date(parsed.timestamp);
      }

      // Convert shape timestamps
      parsed.shapes = parsed.shapes.map((shape) => ({
        ...shape,
        createdAt:
          typeof shape.createdAt === 'string' ? new Date(shape.createdAt) : shape.createdAt,
      }));

      return parsed;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Clears drawing state from localStorage.
   */
  clearLocalStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  /**
   * Creates a new drawing (clears all shapes and localStorage).
   */
  newDrawing(): void {
    this.clearAll();
    this.clearLocalStorage();
    this._commandHistory.set([]);
    this._redoStack.set([]);
  }

  /**
   * Gets the size of stored data in localStorage.
   * @returns Size in bytes or null if not stored
   */
  getStorageSize(): number | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? new Blob([stored]).size : null;
    } catch (error) {
      console.error('Failed to get storage size:', error);
      return null;
    }
  }
}

// ===== Command Pattern Implementations =====

/**
 * Command for adding a shape.
 */
class AddShapeCommand implements Command {
  constructor(
    private service: SvgDrawingService,
    private shape: Shape,
  ) {}

  execute(): void {
    this.service.addShapeToState(this.shape);
  }

  undo(): void {
    this.service.removeShapeFromState(this.shape.id);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Command for deleting a shape.
 */
class DeleteShapeCommand implements Command {
  constructor(
    private service: SvgDrawingService,
    private shape: Shape,
  ) {}

  execute(): void {
    this.service.removeShapeFromState(this.shape.id);
  }

  undo(): void {
    this.service.addShapeToState(this.shape);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Command for updating shape properties.
 */
class UpdateShapeCommand implements Command {
  constructor(
    private service: SvgDrawingService,
    private oldShape: Shape,
    private newShape: Shape,
  ) {}

  execute(): void {
    this.service.updateShapeInState(this.newShape.id, this.newShape);
  }

  undo(): void {
    this.service.updateShapeInState(this.oldShape.id, this.oldShape);
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Command for cutting a line into multiple segments.
 */
class CutLineCommand implements Command {
  constructor(
    private service: SvgDrawingService,
    private originalLine: LineShape,
    private newLines: LineShape[],
  ) {}

  execute(): void {
    this.service.removeShapeFromState(this.originalLine.id);
    this.newLines.forEach((line) => this.service.addShapeToState(line));
  }

  undo(): void {
    this.newLines.forEach((line) => this.service.removeShapeFromState(line.id));
    this.service.addShapeToState(this.originalLine);
  }

  redo(): void {
    this.execute();
  }
}
