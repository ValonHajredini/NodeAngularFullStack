import { TestBed } from '@angular/core/testing';
import { ThemeDesignerModalService } from './theme-designer-modal.service';
import { FormsApiService } from '../forms-api.service';
import { of } from 'rxjs';

describe('ThemeDesignerModalService', () => {
  let service: ThemeDesignerModalService;
  let formsApiService: jasmine.SpyObj<FormsApiService>;

  beforeEach(() => {
    const formsApiSpy = jasmine.createSpyObj('FormsApiService', ['createTheme']);

    TestBed.configureTestingModule({
      providers: [ThemeDesignerModalService, { provide: FormsApiService, useValue: formsApiSpy }],
    });

    service = TestBed.inject(ThemeDesignerModalService);
    formsApiService = TestBed.inject(FormsApiService) as jasmine.SpyObj<FormsApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.currentStep()).toBe(0);
    expect(service.getPrimaryColor()).toBe('#3B82F6');
    expect(service.getSecondaryColor()).toBe('#10B981');
    expect(service.getBackgroundType()).toBe('solid');
    expect(service.getBackgroundColor()).toBe('#FFFFFF');
    expect(service.getHeadingFont()).toBe('Roboto');
    expect(service.getBodyFont()).toBe('Open Sans');
    expect(service.getBorderRadius()).toBe(8);
    expect(service.getFieldPadding()).toBe(12);
    expect(service.getFieldMargin()).toBe(8);
    expect(service.getBorderWidth()).toBe(1);
  });

  it('should advance to next step when validation passes', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');

    service.nextStep();

    expect(service.currentStep()).toBe(1);
  });

  it('should not advance to next step when validation fails', () => {
    service.setPrimaryColor('');
    service.setSecondaryColor('');

    service.nextStep();

    expect(service.currentStep()).toBe(0);
  });

  it('should go to previous step', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.nextStep();
    expect(service.currentStep()).toBe(1);

    service.previousStep();

    expect(service.currentStep()).toBe(0);
  });

  it('should not go below step 0', () => {
    expect(service.currentStep()).toBe(0);

    service.previousStep();

    expect(service.currentStep()).toBe(0);
  });

  it('should update theme values', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.setThemeName('Test Theme');

    expect(service.getPrimaryColor()).toBe('#FF0000');
    expect(service.getSecondaryColor()).toBe('#00FF00');
    expect(service.getThemeName()).toBe('Test Theme');
  });

  it('should compute currentTheme correctly', () => {
    service.setThemeName('Test Theme');
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');

    const theme = service.currentTheme();

    expect(theme.name).toBe('Test Theme');
    expect(theme.primaryColor).toBe('#FF0000');
    expect(theme.secondaryColor).toBe('#00FF00');
    expect(theme.backgroundColor).toBe('#FFFFFF');
  });

  it('should compute linear gradient background correctly', () => {
    service.setBackgroundType('linear');
    service.setGradientColor1('#FF0000');
    service.setGradientColor2('#00FF00');
    service.setGradientAngle(90);

    const theme = service.currentTheme();

    expect(theme.backgroundColor).toBe('linear-gradient(90deg, #FF0000, #00FF00)');
    expect(theme.backgroundType).toBe('linear');
    expect(theme.gradientAngle).toBe(90);
  });

  it('should compute radial gradient background correctly', () => {
    service.setBackgroundType('radial');
    service.setGradientColor1('#FF0000');
    service.setGradientColor2('#00FF00');
    service.setGradientPosition('top-left');

    const theme = service.currentTheme();

    expect(theme.backgroundColor).toBe('radial-gradient(circle at top-left, #FF0000, #00FF00)');
    expect(theme.backgroundType).toBe('radial');
    expect(theme.gradientPosition).toBe('top-left');
  });

  it('should use image URL for image background', () => {
    service.setBackgroundType('image');
    service.setBackgroundImageUrl('https://example.com/image.jpg');

    const theme = service.currentTheme();

    expect(theme.backgroundColor).toBe('https://example.com/image.jpg');
    expect(theme.backgroundType).toBe('image');
    expect(theme.backgroundImageUrl).toBe('https://example.com/image.jpg');
  });

  it('should detect unsaved changes', () => {
    expect(service.hasUnsavedChanges()).toBe(false);

    service.setThemeName('Test Theme');

    expect(service.hasUnsavedChanges()).toBe(true);
  });

  it('should validate step 1 (colors)', () => {
    service.setPrimaryColor('');
    service.setSecondaryColor('');
    expect(service.canProceedToNextStep()).toBe(false);

    service.setPrimaryColor('#FF0000');
    expect(service.canProceedToNextStep()).toBe(false);

    service.setSecondaryColor('#00FF00');
    expect(service.canProceedToNextStep()).toBe(true);
  });

  it('should reset all values to defaults', () => {
    service.setThemeName('Test Theme');
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.setBackgroundType('linear');
    service.setHeadingFont('Arial');
    service.setBorderRadius(16);

    service.reset();

    expect(service.currentStep()).toBe(0);
    expect(service.getThemeName()).toBe('');
    expect(service.getPrimaryColor()).toBe('#3B82F6');
    expect(service.getSecondaryColor()).toBe('#10B981');
    expect(service.getBackgroundType()).toBe('solid');
    expect(service.getBackgroundColor()).toBe('#FFFFFF');
    expect(service.getHeadingFont()).toBe('Roboto');
    expect(service.getBorderRadius()).toBe(8);
  });

  it('should call FormsApiService.createTheme when saving', () => {
    const mockTheme = { id: '123', name: 'Test Theme' } as any;
    formsApiService.createTheme.and.returnValue(of(mockTheme));

    service.setThemeName('Test Theme');
    service.saveTheme().subscribe((theme) => {
      expect(theme).toEqual(mockTheme);
    });

    expect(formsApiService.createTheme).toHaveBeenCalled();
  });

  it('should validate theme name length (max 50 chars)', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.nextStep();
    service.nextStep();
    service.nextStep();
    service.nextStep(); // Navigate to step 4 (Preview & Save)

    service.setThemeName('A'.repeat(51));
    expect(service.canProceedToNextStep()).toBe(false);

    service.setThemeName('A'.repeat(50));
    expect(service.canProceedToNextStep()).toBe(true);

    service.setThemeName('Valid Theme Name');
    expect(service.canProceedToNextStep()).toBe(true);
  });

  it('should not advance past step 4', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');

    for (let i = 0; i < 10; i++) {
      service.nextStep();
    }

    expect(service.currentStep()).toBe(4);
  });
});
