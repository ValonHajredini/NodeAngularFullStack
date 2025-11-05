import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuideOverlayComponent } from './guide-overlay.component';

describe('GuideOverlayComponent', () => {
  let component: GuideOverlayComponent;
  let fixture: ComponentFixture<GuideOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GuideOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate grid X positions', () => {
    component.width = 800;
    component.gridSpacing = 100;
    const gridX = component.gridX;
    expect(gridX.length).toBe(7); // 100, 200, ..., 700
    expect(gridX[0]).toBe(100);
    expect(gridX[gridX.length - 1]).toBe(700);
  });

  it('should calculate grid Y positions', () => {
    component.height = 600;
    component.gridSpacing = 100;
    const gridY = component.gridY;
    expect(gridY.length).toBe(5); // 100, 200, ..., 500
    expect(gridY[0]).toBe(100);
    expect(gridY[gridY.length - 1]).toBe(500);
  });

  it('should toggle visibility', () => {
    expect(component.visible).toBe(true);
    component.visible = false;
    expect(component.visible).toBe(false);
  });
});
