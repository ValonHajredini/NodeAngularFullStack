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
      isCustom: false,
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
      isCustom: false,
      createdBy: 'user-2',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 'custom-theme-1',
      name: 'Custom Corporate',
      description: 'A custom corporate theme',
      thumbnailUrl: 'https://example.com/custom-corporate.jpg',
      themeConfig: {
        desktop: {
          primaryColor: '#003366',
          secondaryColor: '#ff6600',
          backgroundColor: '#f5f5f5',
          textColorPrimary: '#333333',
          textColorSecondary: '#666666',
          fontFamilyHeading: 'Roboto',
          fontFamilyBody: 'Open Sans',
          fieldBorderRadius: '6px',
          fieldSpacing: '14px',
          containerBackground: '#ffffff',
          containerOpacity: 1.0,
          containerPosition: 'center',
        },
      },
      usageCount: 8,
      isActive: true,
      isCustom: true,
      creatorId: 'admin-1',
      createdBy: 'admin-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      themeDefinition: {
        primaryColor: '#003366',
        secondaryColor: '#ff6600',
        backgroundColor: '#f5f5f5',
        fontHeading: 'Roboto',
        fontBody: 'Open Sans',
      },
    },
  ];

  const mockApiResponse: ApiResponse<FormTheme[]> = {
    success: true,
    data: mockThemes,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    const themesApiSpy = jasmine.createSpyObj('ThemesApiService', [
      'getThemes',
      'getAllThemes',
      'applyTheme',
    ]);

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
    expect(countEl.textContent).toContain('3 themes');
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
    themesApiService.getAllThemes.and.returnValue(of(mockThemes));
    component.themes.set([]); // Empty themes array

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(themesApiService.getAllThemes).toHaveBeenCalled();
  });

  it('should not fetch themes when dropdown opens and themes already loaded', () => {
    component.themes.set(mockThemes);

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(themesApiService.getAllThemes).not.toHaveBeenCalled();
  });

  it('should populate themes from API response', () => {
    themesApiService.getAllThemes.and.returnValue(of(mockThemes));

    component['fetchThemes']();

    expect(component.themes()).toEqual(mockThemes);
    expect(component.loading()).toBe(false);
  });

  it('should handle API error when fetching themes', () => {
    const error = new Error('API Error');
    themesApiService.getAllThemes.and.returnValue(throwError(() => error));
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

    component.handleKeyboardNav(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalled();
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

  it('should emit openThemeDesigner event when button clicked', () => {
    spyOn(component.openThemeDesigner, 'emit');
    component.loading.set(false);
    component.themes.set(mockThemes);
    fixture.detectChanges();

    const footerButton = fixture.nativeElement.querySelector('.theme-dropdown-footer button');
    expect(footerButton).toBeTruthy();
    expect(footerButton.textContent).toContain('Build Your Own Custom Color Theme');

    footerButton.click();

    expect(component.openThemeDesigner.emit).toHaveBeenCalled();
    expect(component.panelVisible).toBe(false);
  });

  // Custom theme integration tests
  describe('Custom Theme Integration', () => {
    it('should load both predefined and custom themes', () => {
      themesApiService.getAllThemes.and.returnValue(of(mockThemes));

      component['fetchThemes']();

      const loadedThemes = component.themes();
      expect(loadedThemes.length).toBe(3);

      const predefinedThemes = loadedThemes.filter((t) => !t.isCustom);
      const customThemes = loadedThemes.filter((t) => t.isCustom);

      expect(predefinedThemes.length).toBe(2);
      expect(customThemes.length).toBe(1);
      expect(customThemes[0].name).toBe('Custom Corporate');
    });

    it('should distinguish custom themes from predefined themes', () => {
      component.themes.set(mockThemes);
      fixture.detectChanges();

      const themeCards = fixture.nativeElement.querySelectorAll('app-theme-card');
      expect(themeCards.length).toBe(3);

      // Check that custom theme has isCustom property
      const customTheme = mockThemes.find((t) => t.isCustom);
      expect(customTheme).toBeTruthy();
      expect(customTheme!.isCustom).toBe(true);
      expect(customTheme!.creatorId).toBe('admin-1');
    });

    it('should pass custom theme data to theme cards correctly', () => {
      component.themes.set(mockThemes);
      fixture.detectChanges();

      const themeCards = fixture.nativeElement.querySelectorAll('app-theme-card');
      const customThemeCard = themeCards[2]; // Third card should be custom theme

      expect(customThemeCard.getAttribute('ng-reflect-theme')).toContain('Custom Corporate');
    });

    it('should emit custom themes on selection like predefined themes', () => {
      spyOn(component.themeSelected, 'emit');
      component.themes.set(mockThemes);
      fixture.detectChanges();

      const customTheme = mockThemes.find((t) => t.isCustom)!;

      component.onThemeSelect(customTheme);

      expect(component.themeSelected.emit).toHaveBeenCalledWith(customTheme);
      expect(component.panelVisible).toBe(false);
    });

    it('should maintain performance with multiple custom themes', () => {
      const manyThemes = [...mockThemes];
      // Add more custom themes to test performance
      for (let i = 1; i <= 20; i++) {
        manyThemes.push({
          ...mockThemes[2],
          id: `custom-theme-${i}`,
          name: `Custom Theme ${i}`,
          isCustom: true,
        } as FormTheme);
      }

      themesApiService.getAllThemes.and.returnValue(of(manyThemes));

      const startTime = performance.now();
      component['fetchThemes']();
      const endTime = performance.now();

      expect(component.themes().length).toBe(23); // 2 predefined + 21 custom
      expect(endTime - startTime).toBeLessThan(100); // Should load quickly
    });

    it('should continue to work when no custom themes are available', () => {
      const predefinedOnly = mockThemes.filter((t) => !t.isCustom);
      themesApiService.getAllThemes.and.returnValue(of(predefinedOnly));

      component['fetchThemes']();

      expect(component.themes().length).toBe(2);
      expect(component.themes().every((t) => !t.isCustom)).toBe(true);
    });
  });
});
