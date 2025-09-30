import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ShapePropertiesComponent } from './shape-properties.component';
import { PanelModule } from 'primeng/panel';
import { ColorPickerModule } from 'primeng/colorpicker';
import { SliderModule } from 'primeng/slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { Shape, LineShape, PolygonShape } from '@nodeangularfullstack/shared';

describe('ShapePropertiesComponent', () => {
  let component: ShapePropertiesComponent;
  let fixture: ComponentFixture<ShapePropertiesComponent>;

  const mockLineShape: LineShape = {
    id: 'test-id-1',
    type: 'line',
    start: { x: 10, y: 10 },
    end: { x: 100, y: 100 },
    color: '#000000',
    strokeWidth: 2,
    createdAt: new Date(),
  };

  const mockPolygonShape: PolygonShape = {
    id: 'test-id-2',
    type: 'polygon',
    vertices: [
      { x: 10, y: 10 },
      { x: 100, y: 10 },
      { x: 100, y: 100 },
    ],
    color: '#ff0000',
    strokeWidth: 3,
    fillColor: '#00ff00',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ShapePropertiesComponent,
        FormsModule,
        PanelModule,
        ColorPickerModule,
        SliderModule,
        InputNumberModule,
        CheckboxModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShapePropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Shape Display', () => {
    it('should display no shape selected message when no shape is selected', () => {
      fixture.componentRef.setInput('selectedShape', null);
      fixture.detectChanges();
      expect(component.selectedShape()).toBeNull();
    });

    it('should display line shape properties when line is selected', () => {
      fixture.componentRef.setInput('selectedShape', mockLineShape);
      fixture.detectChanges();
      expect(component.selectedShape()).toEqual(mockLineShape);
      expect(component.getShapeTypeName()).toBe('Line');
    });

    it('should display polygon shape properties when polygon is selected', () => {
      fixture.componentRef.setInput('selectedShape', mockPolygonShape);
      fixture.detectChanges();
      expect(component.selectedShape()).toEqual(mockPolygonShape);
      expect(component.getShapeTypeName()).toBe('Polygon');
    });
  });

  describe('Stroke Color Changes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('selectedShape', mockLineShape);
      fixture.detectChanges();
    });

    it('should emit properties changed event when stroke color is updated', () => {
      spyOn(component.propertiesChanged, 'emit');
      component.onStrokeColorChange('#ff0000');
      expect(component.propertiesChanged.emit).toHaveBeenCalledWith({
        shapeId: 'test-id-1',
        updates: { color: '#ff0000' },
      });
    });
  });

  describe('Stroke Width Changes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('selectedShape', mockLineShape);
      fixture.detectChanges();
    });

    it('should emit properties changed event when stroke width is updated', () => {
      spyOn(component.propertiesChanged, 'emit');
      component.onStrokeWidthChange(5);
      expect(component.propertiesChanged.emit).toHaveBeenCalledWith({
        shapeId: 'test-id-1',
        updates: { strokeWidth: 5 },
      });
    });
  });

  describe('Fill Color Changes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('selectedShape', mockPolygonShape);
      fixture.detectChanges();
    });

    it('should emit properties changed event when fill color is updated', () => {
      spyOn(component.propertiesChanged, 'emit');
      component.onFillColorChange('#0000ff');
      expect(component.propertiesChanged.emit).toHaveBeenCalledWith({
        shapeId: 'test-id-2',
        updates: { fillColor: '#0000ff' },
      });
    });

    it('should emit properties changed event when fill is toggled on', () => {
      spyOn(component.propertiesChanged, 'emit');
      component.fillColor = '#ff00ff';
      component.onFillToggle(true);
      expect(component.propertiesChanged.emit).toHaveBeenCalledWith({
        shapeId: 'test-id-2',
        updates: { fillColor: '#ff00ff' },
      });
    });

    it('should emit properties changed event with undefined fillColor when fill is toggled off', () => {
      spyOn(component.propertiesChanged, 'emit');
      component.onFillToggle(false);
      expect(component.propertiesChanged.emit).toHaveBeenCalledWith({
        shapeId: 'test-id-2',
        updates: { fillColor: undefined },
      });
    });
  });

  describe('No Shape Selected', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('selectedShape', null);
      fixture.detectChanges();
    });

    it('should not emit events when no shape is selected', () => {
      spyOn(component.propertiesChanged, 'emit');
      component.onStrokeColorChange('#ff0000');
      expect(component.propertiesChanged.emit).not.toHaveBeenCalled();
    });
  });
});
