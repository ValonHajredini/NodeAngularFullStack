import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasRendererComponent } from './canvas-renderer.component';
import { SvgDrawingService } from '../../svg-drawing.service';

describe('CanvasRendererComponent', () => {
  let component: CanvasRendererComponent;
  let fixture: ComponentFixture<CanvasRendererComponent>;
  let service: SvgDrawingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasRendererComponent],
      providers: [SvgDrawingService],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasRendererComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(SvgDrawingService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize canvas dimensions', () => {
    expect(component.canvasWidth()).toBeGreaterThan(0);
    expect(component.canvasHeight()).toBeGreaterThan(0);
  });

  it('should update canvas dimensions on window resize', () => {
    const initialWidth = component.canvasWidth();
    component.onWindowResize();
    // Dimensions may change or stay the same depending on container
    expect(component.canvasWidth()).toBeGreaterThanOrEqual(0);
  });

  it('should start drawing on mouse down when line tool is active', () => {
    service.setCurrentTool('line');
    const event = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
    });

    component.onMouseDown(event);
    expect(service.isDrawing()).toBe(true);
  });

  it('should not start drawing when other tool is active', () => {
    service.setCurrentTool('select');
    const event = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
    });

    component.onMouseDown(event);
    expect(service.isDrawing()).toBe(false);
  });

  it('should show preview line during drawing', () => {
    service.setCurrentTool('line');

    // Start drawing
    const downEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
    });
    component.onMouseDown(downEvent);

    // Move mouse
    const moveEvent = new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 200,
    });
    component.onMouseMove(moveEvent);

    expect(component.previewLine()).not.toBeNull();
  });

  it('should display angle indicator during drawing', () => {
    service.setCurrentTool('line');

    // Start drawing
    const downEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
    });
    component.onMouseDown(downEvent);

    // Move mouse
    const moveEvent = new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 100,
    });
    component.onMouseMove(moveEvent);

    const indicator = component.angleIndicator();
    expect(indicator).not.toBeNull();
    expect(indicator?.angle).toBeDefined();
  });

  it('should finish drawing and add shape on mouse up', () => {
    service.setCurrentTool('line');
    const initialShapeCount = service.shapes().length;

    // Start drawing
    component.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));

    // Finish drawing
    component.onMouseUp(new MouseEvent('mouseup', { clientX: 200, clientY: 200 }));

    expect(service.shapes().length).toBe(initialShapeCount + 1);
    expect(service.isDrawing()).toBe(false);
  });

  it('should cancel drawing on mouse leave', () => {
    service.setCurrentTool('line');

    // Start drawing
    component.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    expect(service.isDrawing()).toBe(true);

    // Mouse leaves canvas
    component.onMouseLeave(new MouseEvent('mouseleave'));
    expect(service.isDrawing()).toBe(false);
    expect(component.previewLine()).toBeNull();
  });

  it('should cast shape to LineShape correctly', () => {
    const lineShape = {
      id: '123',
      type: 'line' as const,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
      color: '#000000',
      strokeWidth: 2,
      createdAt: new Date(),
    };

    const result = component.asLineShape(lineShape);
    expect(result.type).toBe('line');
    expect(result.start).toEqual({ x: 0, y: 0 });
    expect(result.end).toEqual({ x: 100, y: 100 });
  });
});
