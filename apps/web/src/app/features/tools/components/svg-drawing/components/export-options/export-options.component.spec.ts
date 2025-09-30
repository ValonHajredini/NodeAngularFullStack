import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ExportOptionsComponent } from './export-options.component';

describe('ExportOptionsComponent', () => {
  let component: ExportOptionsComponent;
  let fixture: ComponentFixture<ExportOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportOptionsComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default export options', () => {
    expect(component.exportOptions.filename).toBe('drawing.svg');
    expect(component.exportOptions.width).toBe(800);
    expect(component.exportOptions.height).toBe(600);
    expect(component.exportOptions.optimizationLevel).toBe('basic');
    expect(component.exportOptions.padding).toBe(20);
  });

  it('should validate export options', () => {
    expect(component.isValid()).toBe(true);

    component.exportOptions.filename = '';
    expect(component.isValid()).toBe(false);

    component.exportOptions.filename = 'test.svg';
    component.exportOptions.width = 0;
    expect(component.isValid()).toBe(false);

    component.exportOptions.width = 800;
    expect(component.isValid()).toBe(true);
  });

  it('should add .svg extension if missing', () => {
    component.exportOptions.filename = 'drawing';
    component.onExport();
    expect(component.exportOptions.filename).toBe('drawing.svg');
  });

  it('should emit export event with options', (done) => {
    component.export.subscribe((options) => {
      expect(options.filename).toBe('test.svg');
      expect(options.width).toBe(1024);
      done();
    });

    component.exportOptions = {
      filename: 'test.svg',
      width: 1024,
      height: 768,
      optimizationLevel: 'aggressive',
      padding: 10,
    };

    component.onExport();
  });

  it('should emit cancel event', (done) => {
    component.cancel.subscribe(() => {
      done();
    });

    component.onCancel();
  });

  it('should reset export options', () => {
    component.exportOptions = {
      filename: 'custom.svg',
      width: 1024,
      height: 768,
      optimizationLevel: 'aggressive',
      padding: 10,
    };

    component.reset();

    expect(component.exportOptions.filename).toBe('drawing.svg');
    expect(component.exportOptions.width).toBe(800);
    expect(component.exportOptions.height).toBe(600);
    expect(component.exportOptions.optimizationLevel).toBe('basic');
    expect(component.exportOptions.padding).toBe(20);
  });

  it('should have three optimization levels', () => {
    expect(component.optimizationLevels.length).toBe(3);
    expect(component.optimizationLevels[0].value).toBe('none');
    expect(component.optimizationLevels[1].value).toBe('basic');
    expect(component.optimizationLevels[2].value).toBe('aggressive');
  });
});
