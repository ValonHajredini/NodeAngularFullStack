import { TestBed } from '@angular/core/testing';
import { SvgDrawingService } from './svg-drawing.service';
import { LineShape, PolygonShape, Point, ShapeStyle } from '@nodeangularfullstack/shared';

describe('SvgDrawingService', () => {
  let service: SvgDrawingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SvgDrawingService],
    });
    service = TestBed.inject(SvgDrawingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', async () => {
      await service.initialize();

      expect(service.shapes()).toEqual([]);
      expect(service.selectedShapeId()).toBeNull();
      expect(service.currentTool()).toBe('line');
      expect(service.isDrawing()).toBe(false);
      expect(service.snapEnabled()).toBe(true);
      expect(service.snapThreshold()).toBe(5);
    });
  });

  describe('drawing operations', () => {
    it('should start drawing', () => {
      const point: Point = { x: 10, y: 20 };
      service.startDrawing(point);

      expect(service.isDrawing()).toBe(true);
    });

    it('should finish drawing and add shape', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.finishDrawing(lineShape);

      expect(service.shapes().length).toBe(1);
      expect(service.shapes()[0]).toEqual(lineShape);
      expect(service.isDrawing()).toBe(false);
    });

    it('should cancel drawing', () => {
      service.startDrawing({ x: 0, y: 0 });
      expect(service.isDrawing()).toBe(true);

      service.cancelDrawing();
      expect(service.isDrawing()).toBe(false);
    });
  });

  describe('shape management', () => {
    it('should add a shape', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);

      expect(service.shapes().length).toBe(1);
      expect(service.shapes()[0].id).toBe('test-id');
    });

    it('should remove a shape', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);
      expect(service.shapes().length).toBe(1);

      service.removeShape('test-id');
      expect(service.shapes().length).toBe(0);
    });

    it('should clear selected shape when removed', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);
      service.selectShape('test-id');
      expect(service.selectedShapeId()).toBe('test-id');

      service.removeShape('test-id');
      expect(service.selectedShapeId()).toBeNull();
    });

    it('should select a shape', () => {
      service.selectShape('test-id');
      expect(service.selectedShapeId()).toBe('test-id');
    });

    it('should clear all shapes', () => {
      const lineShape1: LineShape = {
        id: 'test-id-1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      const lineShape2: LineShape = {
        id: 'test-id-2',
        type: 'line',
        start: { x: 200, y: 200 },
        end: { x: 300, y: 300 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape1);
      service.addShape(lineShape2);
      expect(service.shapes().length).toBe(2);

      service.clearAll();
      expect(service.shapes().length).toBe(0);
      expect(service.selectedShapeId()).toBeNull();
      expect(service.isDrawing()).toBe(false);
    });
  });

  describe('tool selection', () => {
    it('should set current tool', () => {
      service.setCurrentTool('polygon');
      expect(service.currentTool()).toBe('polygon');
      expect(service.isDrawing()).toBe(false);
    });

    it('should stop drawing when changing tools', () => {
      service.startDrawing({ x: 0, y: 0 });
      expect(service.isDrawing()).toBe(true);

      service.setCurrentTool('select');
      expect(service.isDrawing()).toBe(false);
    });
  });

  describe('snap functionality', () => {
    it('should toggle snap enabled', () => {
      expect(service.snapEnabled()).toBe(true);

      service.setSnapEnabled(false);
      expect(service.snapEnabled()).toBe(false);
    });

    it('should set snap threshold within valid range', () => {
      service.setSnapThreshold(7);
      expect(service.snapThreshold()).toBe(7);
    });

    it('should reject snap threshold outside valid range', () => {
      service.setSnapThreshold(5);
      expect(service.snapThreshold()).toBe(5);

      service.setSnapThreshold(0); // Invalid
      expect(service.snapThreshold()).toBe(5); // Unchanged

      service.setSnapThreshold(11); // Invalid
      expect(service.snapThreshold()).toBe(5); // Unchanged
    });
  });

  describe('angle calculations', () => {
    it('should calculate angle for horizontal line (0 degrees)', () => {
      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 100, y: 0 };

      const angle = service.calculateAngle(start, end);
      expect(angle).toBe(0);
    });

    it('should calculate angle for vertical line (90 degrees)', () => {
      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 0, y: 100 };

      const angle = service.calculateAngle(start, end);
      expect(angle).toBe(90);
    });

    it('should calculate angle for diagonal line (45 degrees)', () => {
      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 100, y: 100 };

      const angle = service.calculateAngle(start, end);
      expect(angle).toBe(45);
    });

    it('should normalize negative angles to 0-360 range', () => {
      const start: Point = { x: 100, y: 100 };
      const end: Point = { x: 0, y: 0 };

      const angle = service.calculateAngle(start, end);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
    });
  });

  describe('snap logic', () => {
    it('should detect snap for angles within threshold', () => {
      expect(service.shouldSnap(3)).toBe(true); // Close to 0
      expect(service.shouldSnap(92)).toBe(true); // Close to 90
      expect(service.shouldSnap(177)).toBe(true); // Close to 180
      expect(service.shouldSnap(272)).toBe(true); // Close to 270
    });

    it('should not snap for angles outside threshold', () => {
      expect(service.shouldSnap(45)).toBe(false);
      expect(service.shouldSnap(135)).toBe(false);
    });

    it('should snap to nearest angle', () => {
      expect(service.snapToNearest(3)).toBe(0);
      expect(service.snapToNearest(92)).toBe(90);
      expect(service.snapToNearest(177)).toBe(180);
      expect(service.snapToNearest(272)).toBe(270);
      expect(service.snapToNearest(45)).toBe(90); // Closest is 90
    });
  });

  describe('snap point adjustment', () => {
    it('should return original point when snap is disabled', () => {
      service.setSnapEnabled(false);

      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 100, y: 5 };

      const result = service.applySnapToPoint(start, end);
      expect(result).toEqual(end);
    });

    it('should snap point to horizontal when close', () => {
      service.setSnapEnabled(true);

      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 100, y: 3 }; // Close to horizontal

      const result = service.applySnapToPoint(start, end);
      expect(result.y).toBeCloseTo(0, 0);
    });

    it('should snap point to vertical when close', () => {
      service.setSnapEnabled(true);

      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 3, y: 100 }; // Close to vertical

      const result = service.applySnapToPoint(start, end);
      expect(result.x).toBeCloseTo(0, 0);
    });

    it('should not snap point when angle is far from snap angles', () => {
      service.setSnapEnabled(true);

      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 100, y: 100 }; // 45 degrees

      const result = service.applySnapToPoint(start, end);
      expect(result).toEqual(end);
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs', () => {
      const id1 = service.generateShapeId();
      const id2 = service.generateShapeId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should generate valid UUID format', () => {
      const id = service.generateShapeId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(id).toMatch(uuidRegex);
    });
  });

  describe('computed signals', () => {
    it('should compute selected shape', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);
      service.selectShape('test-id');

      expect(service.selectedShape()).toEqual(lineShape);
    });

    it('should return null for selected shape when none selected', () => {
      expect(service.selectedShape()).toBeNull();
    });

    it('should compute drawing state', () => {
      const state = service.drawingState();

      expect(state).toBeDefined();
      expect(state.shapes).toEqual([]);
      expect(state.currentTool).toBe('line');
      expect(state.snapEnabled).toBe(true);
    });
  });

  describe('polygon drawing', () => {
    const style: ShapeStyle = {
      color: '#ff0000',
      strokeWidth: 3,
      fillColor: '#00ff00',
    };

    it('should add vertices to active polygon', () => {
      service.addPolygonVertex({ x: 10, y: 10 });
      expect(service.activeVertices().length).toBe(1);
      expect(service.isDrawing()).toBe(true);

      service.addPolygonVertex({ x: 100, y: 10 });
      expect(service.activeVertices().length).toBe(2);
    });

    it('should close polygon with minimum 3 vertices', () => {
      service.addPolygonVertex({ x: 10, y: 10 });
      service.addPolygonVertex({ x: 100, y: 10 });
      service.addPolygonVertex({ x: 50, y: 100 });

      const polygon = service.closePolygon(style);

      expect(polygon).toBeTruthy();
      expect(polygon!.type).toBe('polygon');
      expect(polygon!.vertices.length).toBe(3);
      expect(service.shapes().length).toBe(1);
      expect(service.activeVertices().length).toBe(0);
      expect(service.isDrawing()).toBe(false);
    });

    it('should not close polygon with less than 3 vertices', () => {
      service.addPolygonVertex({ x: 10, y: 10 });
      service.addPolygonVertex({ x: 100, y: 10 });

      const polygon = service.closePolygon(style);

      expect(polygon).toBeNull();
    });

    it('should cancel polygon drawing', () => {
      service.addPolygonVertex({ x: 10, y: 10 });
      service.addPolygonVertex({ x: 100, y: 10 });
      expect(service.activeVertices().length).toBe(2);

      service.cancelPolygon();

      expect(service.activeVertices().length).toBe(0);
      expect(service.isDrawing()).toBe(false);
    });

    it('should detect point near first vertex', () => {
      service.addPolygonVertex({ x: 10, y: 10 });

      expect(service.isNearFirstVertex({ x: 12, y: 12 })).toBe(true);
      expect(service.isNearFirstVertex({ x: 100, y: 100 })).toBe(false);
    });
  });

  describe('shape selection', () => {
    beforeEach(() => {
      // Add a polygon
      const polygon: PolygonShape = {
        id: 'polygon-1',
        type: 'polygon',
        vertices: [
          { x: 50, y: 50 },
          { x: 150, y: 50 },
          { x: 150, y: 150 },
          { x: 50, y: 150 },
        ],
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      const line: LineShape = {
        id: 'line-1',
        type: 'line',
        start: { x: 200, y: 200 },
        end: { x: 300, y: 300 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(polygon);
      service.addShape(line);
    });

    it('should find polygon at point inside polygon', () => {
      const shapeId = service.findShapeAtPoint({ x: 100, y: 100 });
      expect(shapeId).toBe('polygon-1');
    });

    it('should find line near line', () => {
      const shapeId = service.findShapeAtPoint({ x: 250, y: 252 });
      expect(shapeId).toBe('line-1');
    });

    it('should return null for point not on any shape', () => {
      const shapeId = service.findShapeAtPoint({ x: 500, y: 500 });
      expect(shapeId).toBeNull();
    });
  });

  describe('shape property updates', () => {
    it('should update shape properties', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);

      service.updateShapeProperties('test-id', {
        color: '#ff0000',
        strokeWidth: 5,
      });

      const updatedShape = service.shapes().find((s) => s.id === 'test-id');
      expect(updatedShape!.color).toBe('#ff0000');
      expect(updatedShape!.strokeWidth).toBe(5);
    });
  });

  describe('undo/redo functionality', () => {
    it('should start with canUndo false', () => {
      expect(service.canUndo()).toBe(false);
    });

    it('should enable undo after adding a shape', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.finishDrawing(lineShape);
      expect(service.canUndo()).toBe(true);
    });

    it('should undo shape addition', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.finishDrawing(lineShape);
      expect(service.shapes().length).toBe(1);

      service.undo();
      expect(service.shapes().length).toBe(0);
      expect(service.canRedo()).toBe(true);
    });

    it('should redo shape addition', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.finishDrawing(lineShape);
      service.undo();
      expect(service.shapes().length).toBe(0);

      service.redo();
      expect(service.shapes().length).toBe(1);
    });

    it('should clear redo stack on new action', () => {
      const lineShape1: LineShape = {
        id: 'test-id-1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      const lineShape2: LineShape = {
        id: 'test-id-2',
        type: 'line',
        start: { x: 200, y: 200 },
        end: { x: 300, y: 300 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.finishDrawing(lineShape1);
      service.undo();
      expect(service.canRedo()).toBe(true);

      service.finishDrawing(lineShape2);
      expect(service.canRedo()).toBe(false);
    });
  });

  describe('shape deletion', () => {
    it('should delete selected shape', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);
      service.selectShape('test-id');
      expect(service.shapes().length).toBe(1);

      service.deleteSelectedShape();
      expect(service.shapes().length).toBe(0);
      expect(service.selectedShapeId()).toBeNull();
    });

    it('should not delete when no shape is selected', () => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);
      expect(service.shapes().length).toBe(1);

      service.deleteSelectedShape();
      expect(service.shapes().length).toBe(1);
    });
  });

  describe('SVG export functionality', () => {
    beforeEach(() => {
      // Add test shapes
      const lineShape: LineShape = {
        id: 'line-1',
        type: 'line',
        start: { x: 10, y: 10 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      const polygonShape: PolygonShape = {
        id: 'polygon-1',
        type: 'polygon',
        vertices: [
          { x: 150, y: 50 },
          { x: 250, y: 50 },
          { x: 200, y: 150 },
        ],
        color: '#ff0000',
        strokeWidth: 3,
        fillColor: '#00ff00',
        createdAt: new Date(),
      };

      service.addShape(lineShape);
      service.addShape(polygonShape);
    });

    afterEach(() => {
      service.setBackgroundImage(null);
      service.resetImageTransform();
    });

    it('should calculate bounds for shapes with padding', () => {
      const bounds = service.calculateBounds(service.shapes(), 20);

      expect(bounds.x).toBeLessThanOrEqual(10);
      expect(bounds.y).toBeLessThanOrEqual(10);
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
    });

    it('should return default bounds for empty canvas', () => {
      service.clearAll();
      const bounds = service.calculateBounds(service.shapes(), 20);

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
    });

    it('should export to valid SVG format', () => {
      const exportOptions = {
        filename: 'test.svg',
        width: 800,
        height: 600,
        optimizationLevel: 'none' as const,
        padding: 20,
        format: 'svg' as const,
        includeBackground: true,
      };

      const svg = service.exportToSVG(exportOptions);

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('width="800"');
      expect(svg).toContain('height="600"');
      expect(svg).toContain('</svg>');
    });

    it('should include line elements in exported SVG', () => {
      const exportOptions = {
        filename: 'test.svg',
        width: 800,
        height: 600,
        optimizationLevel: 'none' as const,
        padding: 20,
        format: 'svg' as const,
        includeBackground: true,
      };

      const svg = service.exportToSVG(exportOptions);
      expect(svg).toContain('<line');
      expect(svg).toContain('x1=');
      expect(svg).toContain('y1=');
      expect(svg).toContain('x2=');
      expect(svg).toContain('y2=');
    });

    it('should include polygon elements in exported SVG', () => {
      const exportOptions = {
        filename: 'test.svg',
        width: 800,
        height: 600,
        optimizationLevel: 'none' as const,
        padding: 20,
        format: 'svg' as const,
        includeBackground: true,
      };

      const svg = service.exportToSVG(exportOptions);
      expect(svg).toContain('<polygon');
      expect(svg).toContain('points=');
    });

    it('should include background image when requested', () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAC0lEQVR42mP8/x8AAwMCAO+X2NwAAAAASUVORK5CYII=';
      service.setBackgroundImage(dataUrl);
      service.setImageScale(1);
      service.setImagePosition(0, 0);

      const exportOptions = {
        filename: 'test.svg',
        width: 800,
        height: 600,
        optimizationLevel: 'none' as const,
        padding: 20,
        format: 'svg' as const,
        includeBackground: true,
      };

      const svg = service.exportToSVG(exportOptions);
      expect(svg).toContain('<image');
      expect(svg).toContain(dataUrl);
    });

    it('should omit background image when includeBackground is false', () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAC0lEQVR42mP8/x8AAwMCAO+X2NwAAAAASUVORK5CYII=';
      service.setBackgroundImage(dataUrl);

      const exportOptions = {
        filename: 'test.svg',
        width: 800,
        height: 600,
        optimizationLevel: 'none' as const,
        padding: 20,
        format: 'svg' as const,
        includeBackground: false,
      };

      const svg = service.exportToSVG(exportOptions);
      expect(svg).not.toContain('<image');
    });

    it('should apply basic optimization', () => {
      const exportOptions = {
        filename: 'test.svg',
        width: 800,
        height: 600,
        optimizationLevel: 'basic' as const,
        padding: 20,
        format: 'svg' as const,
        includeBackground: true,
      };

      const svg = service.exportToSVG(exportOptions);
      // Basic optimization should remove extra whitespace
      expect(svg).not.toContain('  '); // No double spaces
    });

    it('should apply aggressive optimization', () => {
      const exportOptions = {
        filename: 'test.svg',
        width: 800,
        height: 600,
        optimizationLevel: 'aggressive' as const,
        padding: 20,
        format: 'svg' as const,
        includeBackground: true,
      };

      const svg = service.exportToSVG(exportOptions);
      // Aggressive should use 'none' instead of 'transparent'
      expect(svg).not.toContain('transparent');
    });

    it('should validate correct SVG structure', () => {
      const validSvg =
        '<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="100" y2="100"/></svg>';
      expect(service.validateSVG(validSvg)).toBe(true);
    });

    it('should reject invalid SVG structure', () => {
      const invalidSvg = '<svg><line x1="0" y1="0"</svg>'; // Missing closing tag
      expect(service.validateSVG(invalidSvg)).toBe(false);
    });

    it('should trigger browser download', () => {
      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

      service.downloadSVG(svgContent, 'test.svg');

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });
  });

  describe('localStorage persistence', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('should save drawing state to localStorage', (done) => {
      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);

      // Wait for debounced save
      setTimeout(() => {
        const stored = localStorage.getItem('svg-drawing-state');
        expect(stored).toBeTruthy();

        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.version).toBe('1.0');
          expect(parsed.shapes.length).toBe(1);
        }
        done();
      }, 1100);
    });

    it('should load drawing state from localStorage', async () => {
      const storedData = {
        version: '1.0',
        shapes: [
          {
            id: 'stored-line',
            type: 'line',
            start: { x: 50, y: 50 },
            end: { x: 150, y: 150 },
            color: '#ff0000',
            strokeWidth: 3,
            createdAt: new Date().toISOString(),
          },
        ],
        settings: {
          snapEnabled: false,
          snapThreshold: 7,
          gridVisible: true,
        },
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem('svg-drawing-state', JSON.stringify(storedData));

      await service.initialize();

      expect(service.shapes().length).toBe(1);
      expect(service.shapes()[0].id).toBe('stored-line');
      expect(service.snapEnabled()).toBe(false);
      expect(service.snapThreshold()).toBe(7);
      expect(service.gridVisible()).toBe(true);
    });

    it('should handle localStorage quota exceeded', () => {
      spyOn(localStorage, 'setItem').and.throwError({ name: 'QuotaExceededError' });
      spyOn(console, 'error');

      const lineShape: LineShape = {
        id: 'test-id',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape);

      // Should not throw, just log error
      expect(console.error).toHaveBeenCalled();
    });

    it('should clear localStorage on new drawing', () => {
      localStorage.setItem('svg-drawing-state', 'test-data');

      service.newDrawing();

      expect(localStorage.getItem('svg-drawing-state')).toBeNull();
      expect(service.shapes().length).toBe(0);
    });

    it('should get storage size', () => {
      const storedData = { version: '1.0', shapes: [], settings: {}, timestamp: new Date() };
      localStorage.setItem('svg-drawing-state', JSON.stringify(storedData));

      const size = service.getStorageSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should return null storage size when nothing stored', () => {
      localStorage.clear();
      const size = service.getStorageSize();
      expect(size).toBeNull();
    });

    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('svg-drawing-state', 'invalid-json{');

      await service.initialize();

      // Should fall back to defaults
      expect(service.shapes()).toEqual([]);
      expect(service.currentTool()).toBe('line');
    });
  });

  describe('grid visibility', () => {
    it('should toggle grid visibility', () => {
      expect(service.gridVisible()).toBe(false);

      service.toggleGrid();
      expect(service.gridVisible()).toBe(true);

      service.toggleGrid();
      expect(service.gridVisible()).toBe(false);
    });

    it('should set grid visibility', () => {
      service.setGridVisible(true);
      expect(service.gridVisible()).toBe(true);

      service.setGridVisible(false);
      expect(service.gridVisible()).toBe(false);
    });
  });

  describe('select all shapes', () => {
    it('should select first shape when shapes exist', () => {
      const lineShape1: LineShape = {
        id: 'line-1',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      const lineShape2: LineShape = {
        id: 'line-2',
        type: 'line',
        start: { x: 200, y: 200 },
        end: { x: 300, y: 300 },
        color: '#000000',
        strokeWidth: 2,
        createdAt: new Date(),
      };

      service.addShape(lineShape1);
      service.addShape(lineShape2);

      service.selectAllShapes();
      expect(service.selectedShapeId()).toBe('line-1');
    });

    it('should do nothing when no shapes exist', () => {
      service.clearAll();
      service.selectAllShapes();
      expect(service.selectedShapeId()).toBeNull();
    });
  });
});
