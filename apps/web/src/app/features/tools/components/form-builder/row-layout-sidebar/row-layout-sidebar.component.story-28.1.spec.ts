import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RowLayoutSidebarComponent } from './row-layout-sidebar.component';
import { FormBuilderService } from '../form-builder.service';
import { signal, WritableSignal } from '@angular/core';
import { RowLayoutConfig } from '@nodeangularfullstack/shared';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

/**
 * Story 28.1: Single Row Duplication - Component Test Suite (AC 10)
 *
 * This test suite validates the duplicate button UI functionality in RowLayoutSidebarComponent.
 * These tests ensure compliance with Acceptance Criteria 10 requirements.
 *
 * Test Coverage:
 * 1. Duplicate button renders with correct icon and label
 * 2. Click handler triggers formBuilderService.duplicateRow() with correct rowId
 * 3. Button disabled when form is published
 * 4. UI updates reactively after duplication
 * 5. aria-label correctness for accessibility compliance
 *
 * @see docs/stories/28/28.1.single-row-duplication.md (AC 10)
 * @see docs/qa/gates/28.1-single-row-duplication.yml (TEST-001)
 */
describe('RowLayoutSidebarComponent - Story 28.1: Row Duplication (AC 10)', () => {
  let component: RowLayoutSidebarComponent;
  let fixture: ComponentFixture<RowLayoutSidebarComponent>;
  let mockFormBuilderService: jasmine.SpyObj<FormBuilderService>;
  let rowConfigsSignal: WritableSignal<RowLayoutConfig[]>;
  let isPublishedSignal: WritableSignal<boolean>;
  let rowLayoutEnabledSignal: WritableSignal<boolean>;

  beforeEach(async () => {
    // Create writable signals for reactive state
    rowConfigsSignal = signal<RowLayoutConfig[]>([
      { rowId: 'row-1', columnCount: 2, order: 0 },
      { rowId: 'row-2', columnCount: 3, order: 1 },
    ]);
    isPublishedSignal = signal<boolean>(false);
    rowLayoutEnabledSignal = signal<boolean>(true);

    // Create mock FormBuilderService with minimal required methods
    mockFormBuilderService = jasmine.createSpyObj(
      'FormBuilderService',
      ['duplicateRow', 'isPublished', 'rowLayoutEnabled'],
      {
        rowConfigs: rowConfigsSignal,
      },
    );

    // Configure spy return values
    mockFormBuilderService.duplicateRow.and.returnValue('new-row-id-123');
    mockFormBuilderService.isPublished.and.returnValue(isPublishedSignal());
    mockFormBuilderService.rowLayoutEnabled.and.returnValue(rowLayoutEnabledSignal());

    await TestBed.configureTestingModule({
      imports: [RowLayoutSidebarComponent, NoopAnimationsModule],
      providers: [{ provide: FormBuilderService, useValue: mockFormBuilderService }],
    }).compileComponents();

    fixture = TestBed.createComponent(RowLayoutSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Test 1: Verify duplicate button renders with correct icon and label for each row
   * Requirement: AC 10 - "Test duplicate button renders for each row"
   */
  it('should render duplicate button for each row with pi-copy icon and correct aria-label', () => {
    const duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );

    // Verify button count matches row count
    expect(duplicateButtons.length).toBe(2);

    // Verify first button has pi-copy icon and correct label
    const firstButton = duplicateButtons[0];
    expect(firstButton.querySelector('.pi-copy'))
      .withContext('First button should have pi-copy icon')
      .toBeTruthy();
    expect(firstButton.getAttribute('aria-label')).toBe('Duplicate row 1');

    // Verify second button has pi-copy icon and correct label
    const secondButton = duplicateButtons[1];
    expect(secondButton.querySelector('.pi-copy'))
      .withContext('Second button should have pi-copy icon')
      .toBeTruthy();
    expect(secondButton.getAttribute('aria-label')).toBe('Duplicate row 2');
  });

  /**
   * Test 2: Verify click handler calls formBuilderService.duplicateRow() with correct rowId
   * Requirement: AC 10 - "Test duplicate button click triggers duplicateRow() call"
   */
  it('should call formBuilderService.duplicateRow() with correct rowId when button clicked', () => {
    const duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );
    const firstButton = duplicateButtons[0] as HTMLButtonElement;

    // Click first button
    firstButton.click();
    fixture.detectChanges();

    // Verify service method called with correct rowId
    expect(mockFormBuilderService.duplicateRow)
      .withContext('duplicateRow should be called once')
      .toHaveBeenCalledTimes(1);
    expect(mockFormBuilderService.duplicateRow)
      .withContext('duplicateRow should be called with row-1 ID')
      .toHaveBeenCalledWith('row-1');
  });

  /**
   * Test 3: Verify button disabled when form is published (readonly mode)
   * Requirement: AC 10 - "Test button disabled when form published"
   */
  it('should disable duplicate button when form is published', () => {
    // Set published state to true
    isPublishedSignal.set(true);
    mockFormBuilderService.isPublished.and.returnValue(true);
    fixture.detectChanges();

    const duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );

    // Verify all duplicate buttons are disabled
    duplicateButtons.forEach((button: HTMLButtonElement, index) => {
      expect(button.disabled)
        .withContext(`Duplicate button ${index + 1} should be disabled when published`)
        .toBe(true);
    });
  });

  /**
   * Test 4: Verify UI updates reactively when row is duplicated
   * Requirement: AC 10 - "Test UI updates after duplication (new row appears)"
   */
  it('should update UI reactively when row is duplicated (new row appears in list)', () => {
    // Verify initial row count
    let duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );
    expect(duplicateButtons.length).withContext('Initial row count should be 2').toBe(2);

    // Simulate successful duplication by updating rowConfigs signal
    rowConfigsSignal.set([
      { rowId: 'row-1', columnCount: 2, order: 0 },
      { rowId: 'new-row-id-123', columnCount: 2, order: 1 },
      { rowId: 'row-2', columnCount: 3, order: 2 },
    ]);
    fixture.detectChanges();

    // Verify new row appears in UI
    duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );
    expect(duplicateButtons.length)
      .withContext('Row count should increase to 3 after duplication')
      .toBe(3);

    // Verify new row has correct order in aria-label
    const newRowButton = duplicateButtons[1] as HTMLButtonElement;
    expect(newRowButton.getAttribute('aria-label'))
      .withContext('New row should be labeled "Duplicate row 2"')
      .toBe('Duplicate row 2');
  });

  /**
   * Test 5: Verify aria-label correctness for accessibility compliance
   * Requirement: AC 10 - "Test aria-label='Duplicate row {order + 1}' for accessibility"
   */
  it('should have correct aria-label pattern for accessibility compliance (WCAG AA)', () => {
    const duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );

    // Verify aria-labels match required pattern: "Duplicate row {order + 1}"
    expect(duplicateButtons[0].getAttribute('aria-label'))
      .withContext('First row button aria-label')
      .toBe('Duplicate row 1');
    expect(duplicateButtons[1].getAttribute('aria-label'))
      .withContext('Second row button aria-label')
      .toBe('Duplicate row 2');

    // Verify all buttons have aria-label attribute (required for screen readers)
    duplicateButtons.forEach((button: HTMLButtonElement, index) => {
      expect(button.hasAttribute('aria-label'))
        .withContext(`Button ${index + 1} must have aria-label for accessibility`)
        .toBe(true);
      expect(button.getAttribute('aria-label'))
        .withContext(`Button ${index + 1} aria-label must contain "Duplicate row"`)
        .toContain('Duplicate row');
    });
  });

  /**
   * Bonus Test: Verify console logging behavior on success/failure
   * Not explicitly required by AC 10, but verifies implementation details
   */
  it('should log success message when duplication succeeds', () => {
    spyOn(console, 'log');
    const duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );

    (duplicateButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(console.log)
      .withContext('Success message should be logged')
      .toHaveBeenCalledWith('Row duplicated successfully. New row ID:', 'new-row-id-123');
  });

  it('should log error message when duplication fails', () => {
    mockFormBuilderService.duplicateRow.and.returnValue(''); // Simulate failure
    spyOn(console, 'error');

    const duplicateButtons = fixture.nativeElement.querySelectorAll(
      'button[aria-label*="Duplicate row"]',
    );
    (duplicateButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(console.error)
      .withContext('Error message should be logged on failure')
      .toHaveBeenCalledWith('Failed to duplicate row:', 'row-1');
  });
});
