import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { ToolGateDirective } from './tool-gate.directive';
import { ToolsService } from '../../core/services/tools.service';
import { Tool } from '@nodeangularfullstack/shared';

@Component({
  template: `
    <div *appToolGate="toolKey" id="main-content">Tool content is visible</div>

    <div *appToolGate="toolKey; loading: loadingTemplate" id="content-with-loading">
      Tool content with loading template
    </div>

    <ng-template #loadingTemplate>
      <div id="loading-content">Loading...</div>
    </ng-template>

    <div *appToolGate="toolKey; invert: true" id="inverted-content">Tool is disabled</div>

    <div *appToolGate="toolKey; showLoading: false" id="no-loading">No loading state</div>
  `,
})
class TestComponent {
  toolKey = 'test-tool';

  @ViewChild('loadingTemplate', { static: true })
  loadingTemplate!: TemplateRef<unknown>;
}

describe('ToolGateDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let toolsServiceSpy: jasmine.SpyObj<ToolsService>;
  let loadingSubject: BehaviorSubject<boolean>;

  const mockTool: Tool = {
    id: '1',
    key: 'test-tool',
    name: 'Test Tool',
    slug: 'test-tool',
    description: 'A test tool',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    loadingSubject = new BehaviorSubject<boolean>(false);
    const spy = jasmine.createSpyObj('ToolsService', ['isToolEnabled', 'getToolStatus'], {
      loading: loadingSubject.asObservable(),
    });

    await TestBed.configureTestingModule({
      declarations: [TestComponent],
      imports: [ToolGateDirective],
      providers: [{ provide: ToolsService, useValue: spy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    toolsServiceSpy = TestBed.inject(ToolsService) as jasmine.SpyObj<ToolsService>;
  });

  describe('basic functionality', () => {
    it('should create directive', () => {
      expect(component).toBeTruthy();
    });

    it('should show content when tool is enabled', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      fixture.detectChanges();

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeTruthy();
      expect(mainContent.nativeElement.textContent.trim()).toBe('Tool content is visible');
    });

    it('should hide content when tool is disabled', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of({ ...mockTool, active: false }));

      fixture.detectChanges();

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();
    });

    it('should hide content when tool is not found', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of(null));

      fixture.detectChanges();

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();
    });
  });

  describe('inverted logic', () => {
    it('should show content when tool is disabled and invert is true', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of({ ...mockTool, active: false }));

      fixture.detectChanges();

      const invertedContent = fixture.debugElement.query(By.css('#inverted-content'));
      expect(invertedContent).toBeTruthy();
      expect(invertedContent.nativeElement.textContent.trim()).toBe('Tool is disabled');
    });

    it('should hide content when tool is enabled and invert is true', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      fixture.detectChanges();

      const invertedContent = fixture.debugElement.query(By.css('#inverted-content'));
      expect(invertedContent).toBeFalsy();
    });
  });

  describe('loading states', () => {
    it('should show loading template when service is loading', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      // Set loading state
      loadingSubject.next(true);
      fixture.detectChanges();

      const loadingContent = fixture.debugElement.query(By.css('#loading-content'));
      expect(loadingContent).toBeTruthy();

      const mainContent = fixture.debugElement.query(By.css('#content-with-loading'));
      expect(mainContent).toBeFalsy();
    });

    it('should hide loading when service finishes loading', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      // Start with loading
      loadingSubject.next(true);
      fixture.detectChanges();

      let loadingContent = fixture.debugElement.query(By.css('#loading-content'));
      expect(loadingContent).toBeTruthy();

      // Finish loading
      loadingSubject.next(false);
      fixture.detectChanges();

      loadingContent = fixture.debugElement.query(By.css('#loading-content'));
      expect(loadingContent).toBeFalsy();

      const mainContent = fixture.debugElement.query(By.css('#content-with-loading'));
      expect(mainContent).toBeTruthy();
    });

    it('should not show loading when showLoading is false', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      // Set loading state
      loadingSubject.next(true);
      fixture.detectChanges();

      const noLoadingContent = fixture.debugElement.query(By.css('#no-loading'));
      expect(noLoadingContent).toBeFalsy(); // Should be hidden, no loading template shown
    });
  });

  describe('error handling', () => {
    it('should handle empty tool key gracefully', () => {
      component.toolKey = '';
      toolsServiceSpy.isToolEnabled.and.returnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      spyOn(console, 'warn');

      fixture.detectChanges();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      expect(console.warn).toHaveBeenCalledWith('ToolGateDirective: Empty tool key provided');

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();
    });

    it('should handle API errors gracefully', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(throwError(() => new Error('API Error')));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      spyOn(console, 'error');

      fixture.detectChanges();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      expect(console.error).toHaveBeenCalled();

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();
    });

    it('should continue working after API error recovery', () => {
      // First call fails
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(throwError(() => new Error('API Error')));

      fixture.detectChanges();

      let mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();

      // Second call succeeds
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      // Trigger change detection by updating the tool key
      component.toolKey = 'test-tool-2';
      fixture.detectChanges();

      // Should show content now
      mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeTruthy();
    });
  });

  describe('dynamic tool key changes', () => {
    it('should update visibility when tool key changes', () => {
      // First tool is enabled
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      fixture.detectChanges();

      let mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeTruthy();

      // Change to disabled tool
      component.toolKey = 'disabled-tool';
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(
        of({ ...mockTool, key: 'disabled-tool', active: false }),
      );

      fixture.detectChanges();

      mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();
    });

    it('should handle rapid tool key changes', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      // Rapid changes
      component.toolKey = 'tool-1';
      fixture.detectChanges();

      component.toolKey = 'tool-2';
      fixture.detectChanges();

      component.toolKey = 'tool-3';
      fixture.detectChanges();

      // Should handle all changes gracefully
      expect(toolsServiceSpy.getToolStatus).toHaveBeenCalled();
    });
  });

  describe('template lifecycle', () => {
    it('should clean up views on destroy', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      fixture.detectChanges();

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeTruthy();

      // Destroy component
      fixture.destroy();

      // Should not throw errors during cleanup
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('should handle multiple view creations and destructions', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      // Show content
      fixture.detectChanges();
      let mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeTruthy();

      // Hide content
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of({ ...mockTool, active: false }));
      fixture.detectChanges();

      mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();

      // Show content again
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));
      fixture.detectChanges();

      mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should not interfere with content accessibility when visible', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(true);
      toolsServiceSpy.getToolStatus.and.returnValue(of(mockTool));

      fixture.detectChanges();

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeTruthy();

      // Content should be accessible
      expect(mainContent.nativeElement.id).toBe('main-content');
      expect(mainContent.nativeElement.textContent.trim()).toBe('Tool content is visible');
    });

    it('should properly remove content from DOM when hidden', () => {
      toolsServiceSpy.isToolEnabled.and.returnValue(false);
      toolsServiceSpy.getToolStatus.and.returnValue(of({ ...mockTool, active: false }));

      fixture.detectChanges();

      const mainContent = fixture.debugElement.query(By.css('#main-content'));
      expect(mainContent).toBeFalsy();

      // Should not be present in DOM at all
      const allDivs = fixture.debugElement.queryAll(By.css('div'));
      const hasMainContent = allDivs.some((div) => div.nativeElement.id === 'main-content');
      expect(hasMainContent).toBe(false);
    });
  });
});
