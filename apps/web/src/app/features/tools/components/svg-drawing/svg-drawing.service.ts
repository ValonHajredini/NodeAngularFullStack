import { Injectable, signal, computed, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  Shape,
  LineShape,
  PolygonShape,
  Point,
  DrawingState,
  Command,
  ShapeStyle,
  ExportOptions,
  BoundingBox,
  OptimizationLevel,
  StoredDrawing,
  DrawingSettings,
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
  private readonly _currentTool = signal<'line' | 'polygon' | 'select' | 'delete'>('line');
  private readonly _isDrawing = signal<boolean>(false);
  private readonly _activeVertices = signal<Point[]>([]);
  private readonly _snapEnabled = signal<boolean>(true);
  private readonly _snapThreshold = signal<number>(5);
  private readonly _commandHistory = signal<Command[]>([]);
  private readonly _redoStack = signal<Command[]>([]);
  private readonly _gridVisible = signal<boolean>(false);

  // Background image state
  private readonly _backgroundImage = signal<string | null>(null);
  private readonly _imageOpacity = signal<number>(0.5);
  private readonly _imageScale = signal<number>(1);
  private readonly _imagePosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  private readonly _imageLocked = signal<boolean>(false);

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

  // Background image public signals
  readonly backgroundImage = this._backgroundImage.asReadonly();
  readonly imageOpacity = this._imageOpacity.asReadonly();
  readonly imageScale = this._imageScale.asReadonly();
  readonly imagePosition = this._imagePosition.asReadonly();
  readonly imageLocked = this._imageLocked.asReadonly();

  // Computed signals
  readonly selectedShape = computed(() => {
    const id = this._selectedShapeId();
    return this._shapes().find((shape) => shape.id === id) || null;
  });

  readonly canUndo = computed(() => this._commandHistory().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);

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

      // Restore background image settings if available
      if (stored.backgroundImage) {
        this._backgroundImage.set(stored.backgroundImage.data || null);
        this._imageOpacity.set(stored.backgroundImage.opacity ?? 0.5);
        this._imageScale.set(stored.backgroundImage.scale ?? 1);
        this._imagePosition.set(stored.backgroundImage.position ?? { x: 0, y: 0 });
        this._imageLocked.set(stored.backgroundImage.locked ?? false);
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
  setCurrentTool(tool: 'line' | 'polygon' | 'select' | 'delete'): void {
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
      } else if (shape.type === 'line') {
        if (this.isPointOnLine(point, shape as LineShape, 5)) {
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
    if (shape.type === 'line') {
      const line = shape as LineShape;
      const x1 = line.start.x.toFixed(2);
      const y1 = line.start.y.toFixed(2);
      const x2 = line.end.x.toFixed(2);
      const y2 = line.end.y.toFixed(2);
      const stroke = shape.color;
      const strokeWidth = shape.strokeWidth;

      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    } else if (shape.type === 'polygon') {
      const polygon = shape as PolygonShape;
      const points = polygon.vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
      const stroke = shape.color;
      const strokeWidth = shape.strokeWidth;
      const fill = shape.fillColor || 'transparent';

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
        },
        backgroundImage: {
          data: this._backgroundImage(),
          opacity: this._imageOpacity(),
          scale: this._imageScale(),
          position: this._imagePosition(),
          locked: this._imageLocked(),
        },
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
