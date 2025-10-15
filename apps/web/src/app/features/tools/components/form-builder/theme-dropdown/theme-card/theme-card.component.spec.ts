import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeCardComponent } from './theme-card.component';
import { FormTheme } from '@nodeangularfullstack/shared';

describe('ThemeCardComponent', () => {
  let component: ThemeCardComponent;
  let fixture: ComponentFixture<ThemeCardComponent>;

  const mockTheme: FormTheme = {
    id: 'theme-1',
    name: 'Neon Theme',
    description: 'A bright neon theme',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    themeConfig: {
      desktop: {
        primaryColor: '#ff00ff',
        secondaryColor: '#00ffff',
        backgroundColor: '#000000',
        textColorPrimary: '#ffffff',
        textColorSecondary: '#cccccc',
        fontFamilyHeading: 'Arial',
        fontFamilyBody: 'Arial',
        fieldBorderRadius: '8px',
        fieldSpacing: '16px',
        containerBackground: '#111111',
        containerOpacity: 0.9,
        containerPosition: 'center',
      },
    },
    usageCount: 42,
    isActive: true,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeCardComponent], // Standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeCardComponent);
    component = fixture.componentInstance;
    component.theme = mockTheme;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display theme name', () => {
    fixture.detectChanges();

    const nameEl = fixture.nativeElement.querySelector('.theme-name');
    expect(nameEl.textContent).toContain('Neon Theme');
  });

  it('should display theme usage count', () => {
    fixture.detectChanges();

    const usageEl = fixture.nativeElement.querySelector('.theme-usage');
    expect(usageEl.textContent).toContain('42');
  });

  it('should emit selected event on click', () => {
    spyOn(component.selected, 'emit');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.theme-card');
    card.click();

    expect(component.selected.emit).toHaveBeenCalledWith(mockTheme);
  });

  it('should apply active class when isActive is true', () => {
    component.isActive = true;
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.theme-card');
    expect(card.classList.contains('active')).toBe(true);
  });

  it('should not apply active class when isActive is false', () => {
    component.isActive = false;
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.theme-card');
    expect(card.classList.contains('active')).toBe(false);
  });

  it('should show skeleton initially when image is not loaded', () => {
    component.imageLoaded = false;
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('p-skeleton');
    const img = fixture.nativeElement.querySelector('img');

    expect(skeleton).toBeTruthy();
    expect(img).toBeFalsy();
  });

  it('should show image when imageLoaded is true', () => {
    component.imageLoaded = true;
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('p-skeleton');
    const img = fixture.nativeElement.querySelector('img');

    expect(skeleton).toBeFalsy();
    expect(img).toBeTruthy();
    expect(img.src).toBe(mockTheme.thumbnailUrl);
    expect(img.alt).toBe(mockTheme.name);
  });

  it('should set imageLoaded to true when image loads', () => {
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(component.imageLoaded).toBe(false);

    // Simulate image load event
    img.dispatchEvent(new Event('load'));
    fixture.detectChanges();

    expect(component.imageLoaded).toBe(true);
  });

  it('should have correct ARIA label', () => {
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.theme-card');
    expect(card.getAttribute('aria-label')).toBe('Select Neon Theme theme');
  });

  it('should have correct role and tabindex', () => {
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.theme-card');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('should have lazy loading attribute on image', () => {
    component.imageLoaded = true;
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('loading')).toBe('lazy');
  });
});
