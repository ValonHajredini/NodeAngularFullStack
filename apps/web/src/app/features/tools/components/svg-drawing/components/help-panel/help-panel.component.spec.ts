import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpPanelComponent } from './help-panel.component';

describe('HelpPanelComponent', () => {
  let component: HelpPanelComponent;
  let fixture: ComponentFixture<HelpPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit visibleChange when hidden', (done) => {
    component.visible = true;
    component.visibleChange.subscribe((visible) => {
      expect(visible).toBe(false);
      done();
    });

    component.onHide();
    expect(component.visible).toBe(false);
  });

  it('should have visible property', () => {
    expect(component.visible).toBe(false);
    component.visible = true;
    expect(component.visible).toBe(true);
  });
});
