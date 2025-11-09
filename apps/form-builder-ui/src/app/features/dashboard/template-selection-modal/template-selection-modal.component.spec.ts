import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TemplateSelectionModalComponent } from './template-selection-modal.component';
import { FormTemplate, TemplateCategory } from '@nodeangularfullstack/shared';

describe('TemplateSelectionModalComponent', () => {
  let component: TemplateSelectionModalComponent;
  let fixture: ComponentFixture<TemplateSelectionModalComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TemplateSelectionModalComponent],
      providers: [{ provide: Router, useValue: routerSpyObj }],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateSelectionModalComponent);
    component = fixture.componentInstance;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with modal closed', () => {
      expect(component['visibleSignal']()).toBe(false);
    });

    it('should initialize with loading state false', () => {
      expect(component['loading']()).toBe(false);
    });

    it('should initialize with no error', () => {
      expect(component['error']()).toBeNull();
    });

    it('should initialize with empty search query', () => {
      expect(component['searchQuery']()).toBe('');
      expect(component['searchQueryModel']).toBe('');
    });

    it('should initialize with no selected category', () => {
      expect(component['selectedCategory']()).toBeNull();
    });

    it('should load mock templates on init', fakeAsync(() => {
      component.ngOnInit();
      expect(component['loading']()).toBe(true);
      tick(500); // Wait for mock API delay
      fixture.detectChanges();
      expect(component['loading']()).toBe(false);
      expect(component['templates']().length).toBeGreaterThan(0);
    }));
  });

  describe('Modal Visibility', () => {
    it('should open modal when visible input is set to true', () => {
      component.visible = true;
      fixture.detectChanges();
      expect(component['visibleSignal']()).toBe(true);
    });

    it('should emit visibleChange when modal visibility changes', () => {
      spyOn(component.visibleChange, 'emit');
      component['handleVisibilityChange'](true);
      expect(component.visibleChange.emit).toHaveBeenCalledWith(true);
    });

    it('should reset state when dialog hides', () => {
      component['selectedCategory'].set(TemplateCategory.ECOMMERCE);
      component['searchQuery'].set('test');
      component['handleDialogHide']();
      expect(component['selectedCategory']()).toBeNull();
      expect(component['searchQuery']()).toBe('');
    });
  });

  describe('Category Display', () => {
    beforeEach(fakeAsync(() => {
      component.ngOnInit();
      tick(500); // Wait for templates to load
      fixture.detectChanges();
    }));

    it('should display 6 categories', () => {
      const categories = component['categories']();
      expect(categories.length).toBe(6);
    });

    it('should have correct category names and icons', () => {
      const categories = component['categories']();
      expect(categories[0].name).toBe('E-commerce');
      expect(categories[0].icon).toBe('pi-shopping-cart');
      expect(categories[1].name).toBe('Services');
      expect(categories[1].icon).toBe('pi-briefcase');
      expect(categories[2].name).toBe('Data Collection');
      expect(categories[2].icon).toBe('pi-database');
      expect(categories[3].name).toBe('Events');
      expect(categories[3].icon).toBe('pi-calendar');
      expect(categories[4].name).toBe('Quiz');
      expect(categories[4].icon).toBe('pi-book');
      expect(categories[5].name).toBe('Polls');
      expect(categories[5].icon).toBe('pi-chart-bar');
    });

    it('should count templates correctly per category', () => {
      const categories = component['categories']();
      categories.forEach((cat) => {
        const expectedCount = component['templates']().filter((t) => t.category === cat.category)
          .length;
        expect(cat.count).toBe(expectedCount);
      });
    });
  });

  describe('Category Selection and Accordion', () => {
    beforeEach(fakeAsync(() => {
      component.ngOnInit();
      tick(500);
      fixture.detectChanges();
    }));

    it('should expand category when clicked', () => {
      component['toggleCategory'](TemplateCategory.ECOMMERCE);
      expect(component['selectedCategory']()).toBe(TemplateCategory.ECOMMERCE);
    });

    it('should collapse category when clicked again (accordion behavior)', () => {
      component['toggleCategory'](TemplateCategory.ECOMMERCE);
      expect(component['selectedCategory']()).toBe(TemplateCategory.ECOMMERCE);
      component['toggleCategory'](TemplateCategory.ECOMMERCE);
      expect(component['selectedCategory']()).toBeNull();
    });

    it('should switch to different category when another is clicked', () => {
      component['toggleCategory'](TemplateCategory.ECOMMERCE);
      expect(component['selectedCategory']()).toBe(TemplateCategory.ECOMMERCE);
      component['toggleCategory'](TemplateCategory.SERVICES);
      expect(component['selectedCategory']()).toBe(TemplateCategory.SERVICES);
    });

    it('should return correct templates for selected category', () => {
      const templates = component['getTemplatesByCategory'](TemplateCategory.ECOMMERCE);
      expect(templates.every((t) => t.category === TemplateCategory.ECOMMERCE)).toBe(true);
    });
  });

  describe('Search and Filter', () => {
    beforeEach(fakeAsync(() => {
      component.ngOnInit();
      tick(500);
      fixture.detectChanges();
    }));

    it('should filter templates by name', fakeAsync(() => {
      const event = { target: { value: 'Product' } } as any;
      component['onSearchInput'](event);
      tick(300); // Wait for debounce
      const filtered = component['filteredTemplates']();
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((t) => t.name.toLowerCase().includes('product'))).toBe(true);
    }));

    it('should debounce search input', fakeAsync(() => {
      const event1 = { target: { value: 'Pro' } } as any;
      const event2 = { target: { value: 'Prod' } } as any;
      const event3 = { target: { value: 'Product' } } as any;

      component['onSearchInput'](event1);
      tick(100);
      component['onSearchInput'](event2);
      tick(100);
      component['onSearchInput'](event3);
      tick(300);

      // Should only apply the last search
      expect(component['searchQuery']()).toBe('Product');
    }));

    it('should clear search query', () => {
      component['searchQuery'].set('test');
      component['searchQueryModel'] = 'test';
      component['clearSearch']();
      expect(component['searchQuery']()).toBe('');
      expect(component['searchQueryModel']).toBe('');
    });

    it('should filter categories based on search results', fakeAsync(() => {
      const event = { target: { value: 'Appointment' } } as any;
      component['onSearchInput'](event);
      tick(300);
      const filteredCategories = component['filteredCategories']();
      // Should only show categories that have templates matching "Appointment"
      expect(filteredCategories.every((cat) => cat.count > 0)).toBe(true);
    }));

    it('should show no results when search yields nothing', fakeAsync(() => {
      const event = { target: { value: 'NonexistentTemplate12345' } } as any;
      component['onSearchInput'](event);
      tick(300);
      const filtered = component['filteredTemplates']();
      expect(filtered.length).toBe(0);
      const filteredCategories = component['filteredCategories']();
      expect(filteredCategories.length).toBe(0);
    }));
  });

  describe('Start Blank Action', () => {
    it('should emit startBlank event', () => {
      spyOn(component.startBlank, 'emit');
      component['handleStartBlank']();
      expect(component.startBlank.emit).toHaveBeenCalled();
    });

    it('should navigate to form builder without template ID', () => {
      component['handleStartBlank']();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/form-builder']);
    });

    it('should close modal after start blank', () => {
      component['visibleSignal'].set(true);
      component['handleStartBlank']();
      expect(component['visibleSignal']()).toBe(false);
    });
  });

  describe('Template Selection', () => {
    let mockTemplate: FormTemplate;

    beforeEach(() => {
      mockTemplate = {
        id: 'test-template-1',
        name: 'Test Template',
        description: 'Test description',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: {} as any,
        isActive: true,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should emit templateSelected event', () => {
      spyOn(component.templateSelected, 'emit');
      component['handleUseTemplate'](mockTemplate);
      expect(component.templateSelected.emit).toHaveBeenCalledWith(mockTemplate);
    });

    it('should navigate to form builder with template ID', () => {
      component['handleUseTemplate'](mockTemplate);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/form-builder'], {
        queryParams: { templateId: mockTemplate.id },
      });
    });

    it('should close modal after template selection', () => {
      component['visibleSignal'].set(true);
      component['handleUseTemplate'](mockTemplate);
      expect(component['visibleSignal']()).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('should show loading state during template fetch', () => {
      component.ngOnInit();
      expect(component['loading']()).toBe(true);
    });

    it('should hide loading state after templates loaded', fakeAsync(() => {
      component.ngOnInit();
      tick(500);
      expect(component['loading']()).toBe(false);
    }));
  });

  describe('Error State', () => {
    it('should retry loading templates', fakeAsync(() => {
      component['error'].set('Test error');
      component['retryLoadTemplates']();
      expect(component['loading']()).toBe(true);
      expect(component['error']()).toBeNull();
      tick(500);
      expect(component['loading']()).toBe(false);
    }));
  });

  describe('Template Preview', () => {
    let mockTemplate: FormTemplate;

    beforeEach(() => {
      mockTemplate = {
        id: 'test-template-1',
        name: 'Test Template',
        description: 'Test description',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: {} as any,
        isActive: true,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should handle preview template action', () => {
      spyOn(console, 'log');
      component['handlePreviewTemplate'](mockTemplate);
      expect(console.log).toHaveBeenCalledWith('Preview template:', mockTemplate.name);
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('should have accessible search input', () => {
      fixture.detectChanges();
      const searchInput = fixture.nativeElement.querySelector('input[pInputText]');
      expect(searchInput).toBeTruthy();
      expect(searchInput.getAttribute('placeholder')).toContain('Search');
    });

    it('should have role and aria attributes on start blank card', () => {
      fixture.detectChanges();
      const startBlankCard = fixture.nativeElement.querySelector('.start-blank-card');
      expect(startBlankCard).toBeTruthy();
      expect(startBlankCard.getAttribute('role')).toBe('button');
      expect(startBlankCard.getAttribute('tabindex')).toBe('0');
    });
  });
});
