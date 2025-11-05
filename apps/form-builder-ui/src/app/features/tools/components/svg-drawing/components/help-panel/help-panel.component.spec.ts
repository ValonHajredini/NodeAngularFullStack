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

  it('should render help content', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.help-panel')).toBeTruthy();
    expect(compiled.textContent).toContain('Help & Shortcuts');
  });

  it('should display keyboard shortcuts', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Keyboard Shortcuts');
    expect(compiled.textContent).toContain('Line Tool');
    expect(compiled.textContent).toContain('Polygon Tool');
  });
});
