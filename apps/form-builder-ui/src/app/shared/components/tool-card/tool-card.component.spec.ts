import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolCardComponent } from './tool-card.component';
import { ToolRegistryRecord, ToolStatus } from '@nodeangularfullstack/shared';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('ToolCardComponent', () => {
  let component: ToolCardComponent;
  let fixture: ComponentFixture<ToolCardComponent>;
  let compiled: DebugElement;

  const mockTool: ToolRegistryRecord = {
    id: '1',
    tool_id: 'test-tool',
    name: 'Test Tool',
    description: 'A tool for testing',
    version: '1.0.0',
    icon: 'pi-box',
    route: '/tools/test-tool',
    api_base: '/api/test-tool',
    permissions: ['read', 'write'],
    status: ToolStatus.ACTIVE,
    is_exported: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolCardComponent);
    component = fixture.componentInstance;
    compiled = fixture.debugElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    it('should render tool name', () => {
      component.tool = mockTool;
      fixture.detectChanges();

      const nameEl = compiled.query(By.css('.tool-name'));
      expect(nameEl.nativeElement.textContent).toContain('Test Tool');
    });

    it('should render tool description', () => {
      component.tool = mockTool;
      fixture.detectChanges();

      const descEl = compiled.query(By.css('.tool-description'));
      expect(descEl.nativeElement.textContent).toContain('A tool for testing');
    });

    it('should render tool icon', () => {
      component.tool = mockTool;
      fixture.detectChanges();

      const iconEl = compiled.query(By.css('.tool-icon i'));
      expect(iconEl.nativeElement.classList).toContain('pi-box');
    });

    it('should render version badge', () => {
      component.tool = mockTool;
      fixture.detectChanges();

      const versionEl = compiled.query(By.css('.tool-version'));
      expect(versionEl.nativeElement.textContent).toContain('v1.0.0');
    });

    it('should render status badge with correct severity', () => {
      component.tool = mockTool;
      fixture.detectChanges();

      const badgeEl = compiled.query(By.css('p-badge'));
      expect(badgeEl.componentInstance.severity).toBe('success');
      expect(badgeEl.componentInstance.value).toBe('Active');
    });

    it('should display skeleton in loading state', () => {
      component.loading = true;
      fixture.detectChanges();

      const skeletons = compiled.queryAll(By.css('p-skeleton'));
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display empty state when tool is null', () => {
      component.tool = null;
      fixture.detectChanges();

      const emptyEl = compiled.query(By.css('.tool-card-empty'));
      expect(emptyEl).toBeTruthy();
      expect(emptyEl.nativeElement.textContent).toContain('No tool data');
    });

    it('should apply interactive class when interactive is true', () => {
      component.tool = mockTool;
      component.interactive = true;
      fixture.detectChanges();

      const card = compiled.query(By.css('.tool-card'));
      expect(card.nativeElement.classList.contains('interactive')).toBeTruthy();
    });

    it('should not apply interactive class when loading', () => {
      component.tool = mockTool;
      component.interactive = true;
      component.loading = true;
      fixture.detectChanges();

      const card = compiled.query(By.css('.tool-card'));
      expect(card.nativeElement.classList.contains('interactive')).toBeFalsy();
    });
  });

  describe('Interactions', () => {
    it('should emit toolClick on card click', () => {
      component.tool = mockTool;
      component.interactive = true;
      fixture.detectChanges();

      spyOn(component.toolClick, 'emit');

      const card = compiled.query(By.css('.tool-card'));
      card.nativeElement.click();

      expect(component.toolClick.emit).toHaveBeenCalledWith(mockTool);
    });

    it('should not emit toolClick when interactive is false', () => {
      component.tool = mockTool;
      component.interactive = false;
      fixture.detectChanges();

      spyOn(component.toolClick, 'emit');

      const card = compiled.query(By.css('.tool-card'));
      card.nativeElement.click();

      expect(component.toolClick.emit).not.toHaveBeenCalled();
    });

    it('should not emit toolClick when loading is true', () => {
      component.tool = mockTool;
      component.loading = true;
      fixture.detectChanges();

      spyOn(component.toolClick, 'emit');

      const card = compiled.query(By.css('.tool-card'));
      card.nativeElement.click();

      expect(component.toolClick.emit).not.toHaveBeenCalled();
    });

    it('should emit toolClick on Enter key', () => {
      component.tool = mockTool;
      component.interactive = true;
      fixture.detectChanges();

      spyOn(component.toolClick, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeyDown(event);

      expect(component.toolClick.emit).toHaveBeenCalledWith(mockTool);
    });

    it('should emit toolClick on Space key', () => {
      component.tool = mockTool;
      component.interactive = true;
      fixture.detectChanges();

      spyOn(component.toolClick, 'emit');

      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');
      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.toolClick.emit).toHaveBeenCalledWith(mockTool);
    });

    it('should have tabindex 0 when interactive', () => {
      component.tool = mockTool;
      component.interactive = true;
      fixture.detectChanges();

      const card = compiled.query(By.css('.tool-card'));
      expect(card.nativeElement.getAttribute('tabindex')).toBe('0');
    });

    it('should not have tabindex when not interactive', () => {
      component.tool = mockTool;
      component.interactive = false;
      fixture.detectChanges();

      const card = compiled.query(By.css('.tool-card'));
      expect(card.nativeElement.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('Status Mapping', () => {
    it('should map "active" status to "success" severity', () => {
      const tool = { ...mockTool, status: ToolStatus.ACTIVE };
      expect(component.getStatusSeverity(tool)).toBe('success');
    });

    it('should map "beta" status to "warn" severity', () => {
      const tool = { ...mockTool, status: ToolStatus.BETA };
      expect(component.getStatusSeverity(tool)).toBe('warn');
    });

    it('should map "deprecated" status to "secondary" severity', () => {
      const tool = { ...mockTool, status: ToolStatus.DEPRECATED };
      expect(component.getStatusSeverity(tool)).toBe('secondary');
    });

    it('should map exported tool to "info" severity', () => {
      const tool = { ...mockTool, is_exported: true };
      expect(component.getStatusSeverity(tool)).toBe('info');
    });

    it('should convert status to title case', () => {
      expect(component.getStatusLabel({ ...mockTool, status: ToolStatus.ACTIVE })).toBe('Active');
      expect(component.getStatusLabel({ ...mockTool, status: ToolStatus.BETA })).toBe('Beta');
      expect(component.getStatusLabel({ ...mockTool, status: ToolStatus.DEPRECATED })).toBe(
        'Deprecated',
      );
    });

    it('should show "Exported" for exported tools', () => {
      const tool = { ...mockTool, is_exported: true };
      expect(component.getStatusLabel(tool)).toBe('Exported');
    });

    it('should handle null tool gracefully', () => {
      expect(component.getStatusSeverity(null)).toBe('info');
      expect(component.getStatusLabel(null)).toBe('Unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing icon gracefully', () => {
      component.tool = { ...mockTool, icon: undefined };
      fixture.detectChanges();

      const iconEl = compiled.query(By.css('.tool-icon i'));
      expect(iconEl.nativeElement.classList).toContain('pi-box'); // Fallback
    });

    it('should handle missing description', () => {
      component.tool = { ...mockTool, description: undefined };
      fixture.detectChanges();

      const descEl = compiled.query(By.css('.tool-description'));
      expect(descEl.nativeElement.textContent).toContain('No description');
    });

    it('should truncate long tool names', () => {
      const longName = 'This is a very long tool name that should be truncated';
      component.tool = { ...mockTool, name: longName };
      fixture.detectChanges();

      const nameEl = compiled.query(By.css('.tool-name'));
      const styles = window.getComputedStyle(nameEl.nativeElement);
      expect(styles.textOverflow).toBe('ellipsis');
      expect(styles.whiteSpace).toBe('nowrap');
    });

    it('should truncate long descriptions', () => {
      const longDesc =
        'This is a very long description that should be truncated to two lines maximum with ellipsis overflow';
      component.tool = { ...mockTool, description: longDesc };
      fixture.detectChanges();

      const descEl = compiled.query(By.css('.tool-description'));
      const styles = window.getComputedStyle(descEl.nativeElement);
      expect(styles.display).toContain('-webkit-box');
    });

    it('should get correct icon color for active status', () => {
      const tool = { ...mockTool, status: ToolStatus.ACTIVE };
      expect(component.getIconColor(tool)).toBe('#22c55e');
    });

    it('should get correct icon color for beta status', () => {
      const tool = { ...mockTool, status: ToolStatus.BETA };
      expect(component.getIconColor(tool)).toBe('#f59e0b');
    });

    it('should get correct icon color for deprecated status', () => {
      const tool = { ...mockTool, status: ToolStatus.DEPRECATED };
      expect(component.getIconColor(tool)).toBe('#6b7280');
    });

    it('should get correct icon color for exported tool', () => {
      const tool = { ...mockTool, is_exported: true };
      expect(component.getIconColor(tool)).toBe('#3b82f6');
    });

    it('should handle undefined tool gracefully', () => {
      expect(component.getIconColor(null)).toBe('#6b7280');
    });

    it('should emit actionClick with correct data', () => {
      component.tool = mockTool;
      fixture.detectChanges();

      spyOn(component.actionClick, 'emit');

      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');

      component.onActionButtonClick('export', mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.actionClick.emit).toHaveBeenCalledWith({
        action: 'export',
        tool: mockTool,
      });
    });

    it('should not emit actionClick when tool is null', () => {
      component.tool = null;
      fixture.detectChanges();

      spyOn(component.actionClick, 'emit');

      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');

      component.onActionButtonClick('export', mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.actionClick.emit).not.toHaveBeenCalled();
    });
  });
});
