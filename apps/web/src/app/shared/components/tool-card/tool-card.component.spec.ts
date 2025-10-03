import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { Tool } from '@nodeangularfullstack/shared';
import { ToolCardComponent } from './tool-card.component';

describe('ToolCardComponent', () => {
  let component: ToolCardComponent;
  let fixture: ComponentFixture<ToolCardComponent>;

  const mockTool: Tool = {
    id: '1',
    key: 'test-tool',
    name: 'Test Tool',
    slug: 'test-tool',
    description: 'A test tool for unit testing',
    icon: 'pi pi-wrench',
    category: 'utility',
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolCardComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('tool', mockTool);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display tool name and description', () => {
    const titleElement = fixture.debugElement.query(By.css('.tool-card-title'));
    const descriptionElement = fixture.debugElement.query(By.css('.tool-card-description'));

    expect(titleElement.nativeElement.textContent.trim()).toBe(mockTool.name);
    expect(descriptionElement.nativeElement.textContent.trim()).toBe(mockTool.description);
  });

  it('should display active status badge', () => {
    const badge = fixture.debugElement.query(By.css('p-badge'));
    expect(badge).toBeTruthy();
  });

  it('should emit toggle status event when checkbox is changed', () => {
    spyOn(component.toggleStatus, 'emit');

    component.onToggleStatus(false);

    expect(component.toggleStatus.emit).toHaveBeenCalledWith(false);
  });

  it('should emit view details event when view button is clicked', () => {
    spyOn(component.viewDetails, 'emit');

    component.onViewDetails();

    expect(component.viewDetails.emit).toHaveBeenCalledWith(mockTool);
  });

  it('should emit configure event when configure button is clicked', () => {
    spyOn(component.configure, 'emit');

    component.onConfigure();

    expect(component.configure.emit).toHaveBeenCalledWith(mockTool);
  });

  it('should emit card click event when card is clicked', () => {
    spyOn(component.cardClick, 'emit');

    const cardElement = fixture.debugElement.query(By.css('.tool-card'));
    const mockEvent = new MouseEvent('click');
    Object.defineProperty(mockEvent, 'target', { value: cardElement.nativeElement });

    component.handleCardClick(mockEvent);

    expect(component.cardClick.emit).toHaveBeenCalledWith(mockTool);
  });

  it('should show selection checkbox when showSelection is true', () => {
    fixture.componentRef.setInput('showSelection', true);
    fixture.detectChanges();

    const checkbox = fixture.debugElement.query(By.css('.tool-card-checkbox'));
    expect(checkbox).toBeTruthy();
  });

  it('should hide selection checkbox when showSelection is false', () => {
    fixture.componentRef.setInput('showSelection', false);
    fixture.detectChanges();

    const checkbox = fixture.debugElement.query(By.css('.tool-card-checkbox'));
    expect(checkbox).toBeFalsy();
  });

  it('should show loading spinner when updating is true', () => {
    fixture.componentRef.setInput('updating', true);
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('.tool-card-loading'));
    expect(spinner).toBeTruthy();
  });

  it('should apply selected class when selected is true', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    const cardElement = fixture.debugElement.query(By.css('.tool-card'));
    expect(cardElement.nativeElement.classList.contains('selected')).toBeTruthy();
  });

  it('should apply updating class when updating is true', () => {
    fixture.componentRef.setInput('updating', true);
    fixture.detectChanges();

    const cardElement = fixture.debugElement.query(By.css('.tool-card'));
    expect(cardElement.nativeElement.classList.contains('updating')).toBeTruthy();
  });

  it('should display correct icon based on tool key', () => {
    const iconElement = fixture.debugElement.query(By.css('.tool-card-icon i'));
    expect(iconElement.nativeElement.classList.contains('pi')).toBeTruthy();
    expect(iconElement.nativeElement.classList.contains('pi-wrench')).toBeTruthy();
  });

  it('should handle keyboard navigation with Enter key', () => {
    spyOn(component.cardClick, 'emit');

    const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(mockEvent, 'preventDefault');

    component.handleKeydown(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.cardClick.emit).toHaveBeenCalledWith(mockTool);
  });

  it('should handle keyboard navigation with Space key', () => {
    spyOn(component.cardClick, 'emit');

    const mockEvent = new KeyboardEvent('keydown', { key: ' ' });
    spyOn(mockEvent, 'preventDefault');

    component.handleKeydown(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.cardClick.emit).toHaveBeenCalledWith(mockTool);
  });

  it('should generate appropriate aria label', () => {
    const ariaLabel = component.ariaLabel();
    expect(ariaLabel).toContain(mockTool.name);
    expect(ariaLabel).toContain('active');
    expect(ariaLabel).toContain(mockTool.description);
  });

  it('should show correct status text for active tool', () => {
    expect(component.statusText()).toBe('Active');
  });

  it('should show correct status text for inactive tool', () => {
    const inactiveTool = { ...mockTool, active: false };
    fixture.componentRef.setInput('tool', inactiveTool);
    fixture.detectChanges();

    expect(component.statusText()).toBe('Inactive');
  });

  it('should use default icon when tool has no icon property', () => {
    const toolWithoutIcon = { ...mockTool, icon: undefined };
    fixture.componentRef.setInput('tool', toolWithoutIcon);
    fixture.detectChanges();

    const icon = component.toolIcon();
    expect(icon).toBe('pi pi-wrench'); // default fallback
  });
});
