import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ThemeDropdownComponent } from './theme-dropdown.component';
import { ThemesApiService } from '../themes-api.service';
import { FormTheme, ApiResponse } from '@nodeangularfullstack/shared';

describe('ThemeDropdownComponent', () => {
  let component: ThemeDropdownComponent;
  let fixture: ComponentFixture<ThemeDropdownComponent>;
  let themesApiService: jasmine.SpyObj<ThemesApiService>;

  const mockThemes: FormTheme[] = [
    {
      id: 'theme-1',
      name: 'Neon Theme',
      description: 'A bright neon theme',
      thumbnailUrl: 'https://example.com/neon.jpg',
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
    },
    {
      id: 'theme-2',
      name: 'Classic Theme',
      description: 'A classic theme',
      thumbnailUrl: 'https://example.com/classic.jpg',
      themeConfig: {
        desktop: {
          primaryColor: '#0066cc',
          secondaryColor: '#cccccc',
          backgroundColor: '#ffffff',
          textColorPrimary: '#333333',
          textColorSecondary: '#666666',
          fontFamilyHeading: 'Times',
          fontFamilyBody: 'Arial',
          fieldBorderRadius: '4px',
          fieldSpacing: '12px',
          containerBackground: '#f8f8f8',
          containerOpacity: 0.95,
          containerPosition: 'center',
        },
      },
      usageCount: 15,
      isActive: true,
      createdBy: 'user-2',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  const mockApiResponse: ApiResponse<FormTheme[]> = {
    success: true,
    data: mockThemes,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    const themesApiSpy = jasmine.createSpyObj('ThemesApiService', ['getThemes', 'applyTheme']);

    await TestBed.configureTestingModule({
      imports: [ThemeDropdownComponent], // Standalone component
      providers: [{ provide: ThemesApiService, useValue: themesApiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeDropdownComponent);
    component = fixture.componentInstance;
    themesApiService = TestBed.inject(ThemesApiService) as jasmine.SpyObj<ThemesApiService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display theme count in header', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const countEl = fixture.nativeElement.querySelector('.theme-count');
    expect(countEl.textContent).toContain('2 themes');
  });

  it('should show loading skeleton when loading is true', () => {
    component.loading.set(true);
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');

    expect(skeleton).toBeTruthy();
    expect(themeGrid).toBeFalsy();
  });

  it('should show theme grid when loading is false', () => {
    component.loading.set(false);
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('.loading-skeleton');
    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');

    expect(skeleton).toBeFalsy();
    expect(themeGrid).toBeTruthy();
  });

  it('should fetch themes when dropdown opens for first time', () => {
    themesApiService.getThemes.and.returnValue(of(mockApiResponse));
    component.themes.set([]); // Empty themes array

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(themesApiService.getThemes).toHaveBeenCalled();
  });

  it('should not fetch themes when dropdown opens and themes already loaded', () => {
    component.themes.set(mockThemes);

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(themesApiService.getThemes).not.toHaveBeenCalled();
  });

  it('should populate themes from API response', () => {
    themesApiService.getThemes.and.returnValue(of(mockApiResponse));

    component['fetchThemes']();

    expect(component.themes()).toEqual(mockThemes);
    expect(component.loading()).toBe(false);
  });

  it('should handle API error when fetching themes', () => {
    const error = new Error('API Error');
    themesApiService.getThemes.and.returnValue(throwError(() => error));
    spyOn(console, 'error');

    component['fetchThemes']();

    expect(console.error).toHaveBeenCalledWith('Failed to load themes:', error);
    expect(component.loading()).toBe(false);
  });

  it('should emit themeSelected event when theme is selected', () => {
    spyOn(component.themeSelected, 'emit');
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeCards = fixture.nativeElement.querySelectorAll('app-theme-card');
    const firstCard = themeCards[0];

    // Simulate theme card selection
    firstCard.dispatchEvent(new CustomEvent('selected', { detail: mockThemes[0] }));

    expect(component.themeSelected.emit).toHaveBeenCalledWith(mockThemes[0]);
  });

  it('should highlight active theme', () => {
    component.currentThemeId = 'theme-1';
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeCards = fixture.nativeElement.querySelectorAll('app-theme-card');
    const firstCard = themeCards[0];
    const secondCard = themeCards[1];

    expect(firstCard.getAttribute('ng-reflect-is-active')).toBe('true');
    expect(secondCard.getAttribute('ng-reflect-is-active')).toBe('false');
  });

  it('should handle keyboard navigation - ArrowRight', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });

    spyOn(keyboardEvent, 'preventDefault');
    spyOn(document, 'querySelectorAll').and.returnValue([
      { focus: jasmine.createSpy() },
      { focus: jasmine.createSpy() },
    ] as any);

    component.handleKeyboardNav(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalled();
  });

  it('should handle keyboard navigation - ArrowLeft', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

    spyOn(keyboardEvent, 'preventDefault');
    spyOn(document, 'querySelectorAll').and.returnValue([
      { focus: jasmine.createSpy() },
      { focus: jasmine.createSpy() },
    ] as any);

    component.handleKeyboardNav(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalled();
  });

  it('should handle keyboard navigation - ArrowDown', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });

    spyOn(keyboardEvent, 'preventDefault');
    spyOn(document, 'querySelectorAll').and.returnValue([
      { focus: jasmine.createSpy() },
      { focus: jasmine.createSpy() },
    ] as any);

    component.handleKeyboardNav(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalled();
  });

  it('should handle keyboard navigation - ArrowUp', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });

    spyOn(keyboardEvent, 'preventDefault');
    spyOn(document, 'querySelectorAll').and.returnValue([
      { focus: jasmine.createSpy() },
      { focus: jasmine.createSpy() },
    ] as any);

    component.handleKeyboardNav(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalled();
  });

  it('should handle keyboard navigation - Enter', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });

    spyOn(keyboardEvent, 'preventDefault');
    spyOn(component, 'onThemeSelect');
    spyOn(document, 'querySelectorAll').and.returnValue([
      { focus: jasmine.createSpy() },
      { focus: jasmine.createSpy() },
    ] as any);

    component.handleKeyboardNav(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalled();
    expect(component.onThemeSelect).toHaveBeenCalledWith(mockThemes[0]);
  });

  it('should handle keyboard navigation - Escape', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'Escape' });

    spyOn(keyboardEvent, 'preventDefault');
    spyOn(component.themePanel, 'hide');

    component.handleKeyboardNav(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalled();
    expect(component.themePanel.hide).toHaveBeenCalled();
  });

  it('should have correct responsive grid classes', () => {
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const themeGrid = fixture.nativeElement.querySelector('.theme-grid');
    expect(themeGrid).toBeTruthy();
    expect(themeGrid.getAttribute('role')).toBe('grid');
  });

  it('should display correct number of skeleton cards when loading', () => {
    component.loading.set(true);
    fixture.detectChanges();

    const skeletons = fixture.nativeElement.querySelectorAll('p-skeleton');
    expect(skeletons.length).toBe(8); // As specified in template
  });
});
