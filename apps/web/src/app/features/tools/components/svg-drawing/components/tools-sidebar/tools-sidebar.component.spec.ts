import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolsSidebarComponent } from './tools-sidebar.component';
import { signal } from '@angular/core';

describe('ToolsSidebarComponent', () => {
  let component: ToolsSidebarComponent;
  let fixture: ComponentFixture<ToolsSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolsSidebarComponent);
    component = fixture.componentInstance;

    // Set up required inputs
    component.currentTool = signal('line');
    component.canUndo = signal(false);
    component.canRedo = signal(false);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit toolSelected event when tool button is clicked', () => {
    spyOn(component.toolSelected, 'emit');

    component.onToolSelect('polygon');

    expect(component.toolSelected.emit).toHaveBeenCalledWith('polygon');
  });

  it('should emit undoClicked event when undo button is clicked', () => {
    spyOn(component.undoClicked, 'emit');

    component.onUndo();

    expect(component.undoClicked.emit).toHaveBeenCalled();
  });

  it('should emit redoClicked event when redo button is clicked', () => {
    spyOn(component.redoClicked, 'emit');

    component.onRedo();

    expect(component.redoClicked.emit).toHaveBeenCalled();
  });

  it('should emit clearAllClicked event when clear all button is clicked', () => {
    spyOn(component.clearAllClicked, 'emit');

    component.onClearAll();

    expect(component.clearAllClicked.emit).toHaveBeenCalled();
  });
});
