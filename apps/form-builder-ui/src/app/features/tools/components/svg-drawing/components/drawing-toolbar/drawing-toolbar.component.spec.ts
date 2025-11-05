import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawingToolbarComponent } from './drawing-toolbar.component';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

describe('DrawingToolbarComponent', () => {
  let component: DrawingToolbarComponent;
  let fixture: ComponentFixture<DrawingToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawingToolbarComponent, ToolbarModule, ButtonModule, TooltipModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DrawingToolbarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('currentTool', 'line');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Tool Selection', () => {
    it('should emit tool selected event when line tool is clicked', () => {
      spyOn(component.toolSelected, 'emit');
      component.onToolSelect('line');
      expect(component.toolSelected.emit).toHaveBeenCalledWith('line');
    });

    it('should emit tool selected event when polygon tool is clicked', () => {
      spyOn(component.toolSelected, 'emit');
      component.onToolSelect('polygon');
      expect(component.toolSelected.emit).toHaveBeenCalledWith('polygon');
    });

    it('should emit tool selected event when select tool is clicked', () => {
      spyOn(component.toolSelected, 'emit');
      component.onToolSelect('select');
      expect(component.toolSelected.emit).toHaveBeenCalledWith('select');
    });

    it('should emit tool selected event when delete tool is clicked', () => {
      spyOn(component.toolSelected, 'emit');
      component.onToolSelect('delete');
      expect(component.toolSelected.emit).toHaveBeenCalledWith('delete');
    });
  });

  describe('Tool Active State', () => {
    it('should return true when checking if current tool is active', () => {
      fixture.componentRef.setInput('currentTool', 'polygon');
      fixture.detectChanges();
      expect(component.isToolActive('polygon')).toBe(true);
    });

    it('should return false when checking if non-current tool is active', () => {
      fixture.componentRef.setInput('currentTool', 'line');
      fixture.detectChanges();
      expect(component.isToolActive('polygon')).toBe(false);
    });
  });

  describe('Undo/Redo Actions', () => {
    it('should emit undo clicked event', () => {
      spyOn(component.undoClicked, 'emit');
      component.onUndo();
      expect(component.undoClicked.emit).toHaveBeenCalled();
    });

    it('should emit redo clicked event', () => {
      spyOn(component.redoClicked, 'emit');
      component.onRedo();
      expect(component.redoClicked.emit).toHaveBeenCalled();
    });
  });

  describe('Clear All Action', () => {
    it('should emit clear all clicked event', () => {
      spyOn(component.clearAllClicked, 'emit');
      component.onClearAll();
      expect(component.clearAllClicked.emit).toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('should show undo button as disabled when canUndo is false', () => {
      fixture.componentRef.setInput('canUndo', false);
      fixture.detectChanges();
      expect(component.canUndo()).toBe(false);
    });

    it('should show undo button as enabled when canUndo is true', () => {
      fixture.componentRef.setInput('canUndo', true);
      fixture.detectChanges();
      expect(component.canUndo()).toBe(true);
    });

    it('should show redo button as disabled when canRedo is false', () => {
      fixture.componentRef.setInput('canRedo', false);
      fixture.detectChanges();
      expect(component.canRedo()).toBe(false);
    });

    it('should show redo button as enabled when canRedo is true', () => {
      fixture.componentRef.setInput('canRedo', true);
      fixture.detectChanges();
      expect(component.canRedo()).toBe(true);
    });
  });
});
