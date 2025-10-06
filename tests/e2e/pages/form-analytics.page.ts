import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Form Analytics page.
 * Encapsulates interactions with the analytics charts dashboard.
 */
export class FormAnalyticsPage {
  readonly page: Page;
  readonly chartsDashboard: Locator;
  readonly configureFieldsButton: Locator;
  readonly fieldSelectorDialog: Locator;
  readonly submissionsTable: Locator;
  readonly tableFilterInput: Locator;
  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chartsDashboard = page.locator('.charts-dashboard');
    this.configureFieldsButton = page.getByRole('button', { name: /configure fields/i });
    this.fieldSelectorDialog = page.locator('[role="dialog"]').filter({ hasText: /field visibility/i });
    this.submissionsTable = page.locator('p-table');
    this.tableFilterInput = page.locator('[data-testid="table-filter-input"], input[placeholder*="Search"]');
    this.emptyStateMessage = page.locator('text=/no submissions|no data/i');
  }

  /**
   * Navigate to the analytics page for a specific form
   */
  async navigateToFormAnalytics(formId: string): Promise<void> {
    await this.page.goto(`/app/tools/form-builder/${formId}/analytics`);

    // Wait for page to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for charts dashboard to be visible
   */
  async waitForChartsDashboard(): Promise<void> {
    await this.chartsDashboard.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get the count of visible charts
   */
  async getVisibleChartCount(): Promise<number> {
    const barCharts = await this.page.locator('app-bar-chart').count();
    const lineCharts = await this.page.locator('app-line-chart').count();
    const pieCharts = await this.page.locator('app-pie-chart').count();
    const statCards = await this.page.locator('app-stat-card').count();

    return barCharts + lineCharts + pieCharts + statCards;
  }

  /**
   * Check if a specific chart type exists
   */
  async hasChartType(type: 'bar' | 'line' | 'pie' | 'stat'): Promise<boolean> {
    const selector = `app-${type}-chart`;
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Get data from the first bar chart
   */
  async getBarChartData(): Promise<number[]> {
    // Wait for bar chart to be visible
    const barChart = this.page.locator('app-bar-chart').first();
    await barChart.waitFor({ state: 'visible', timeout: 5000 });

    // Extract data from chart (this is simplified - actual implementation may vary)
    // In a real scenario, you might need to evaluate chart data from the component
    const dataText = await barChart.textContent();

    // Parse numbers from text (fallback for testing)
    const numbers = dataText?.match(/\d+/g)?.map(Number) || [0];
    return numbers;
  }

  /**
   * Filter submissions table by search term
   */
  async filterSubmissions(searchTerm: string): Promise<void> {
    await this.tableFilterInput.fill(searchTerm);

    // Wait for filter to apply
    await this.page.waitForTimeout(500);
  }

  /**
   * Open the field selector dialog
   */
  async openFieldSelector(): Promise<void> {
    await this.configureFieldsButton.click();
    await this.fieldSelectorDialog.waitFor({ state: 'visible', timeout: 3000 });
  }

  /**
   * Close the field selector dialog
   */
  async closeFieldSelector(): Promise<void> {
    // Click close button or press Escape
    const closeButton = this.fieldSelectorDialog.locator('button').filter({ hasText: /close|cancel/i });

    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }

    await this.fieldSelectorDialog.waitFor({ state: 'hidden', timeout: 3000 });
  }

  /**
   * Get the name of the first visible field
   */
  async getFirstVisibleFieldName(): Promise<string> {
    // Find first checked checkbox in field selector
    const firstField = this.fieldSelectorDialog.locator('p-checkbox[ng-reflect-binary="true"]').first();
    const fieldName = await firstField.getAttribute('ng-reflect-form-control-name') || 'field_0';
    return fieldName;
  }

  /**
   * Toggle field visibility by field name
   */
  async toggleFieldVisibility(fieldName: string): Promise<void> {
    // Find checkbox for the field and click it
    const checkbox = this.fieldSelectorDialog.locator(`p-checkbox[ng-reflect-form-control-name="${fieldName}"]`);
    await checkbox.click();
  }

  /**
   * Get field visibility preference from localStorage
   */
  async getFieldVisibilityPreference(): Promise<string[] | null> {
    const preference = await this.page.evaluate(() => {
      const saved = localStorage.getItem('analytics-visible-fields');
      return saved ? JSON.parse(saved) : null;
    });
    return preference;
  }

  /**
   * Check if empty state is displayed
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.emptyStateMessage.isVisible();
  }

  /**
   * Get the first bar chart element
   */
  async getFirstBarChart(): Promise<Locator | null> {
    const barChart = this.page.locator('app-bar-chart').first();
    const isVisible = await barChart.isVisible().catch(() => false);
    return isVisible ? barChart : null;
  }

  /**
   * Get the first visible chart (any type)
   */
  async getFirstVisibleChart(): Promise<Locator | null> {
    const selectors = ['app-bar-chart', 'app-line-chart', 'app-pie-chart', 'app-stat-card'];

    for (const selector of selectors) {
      const chart = this.page.locator(selector).first();
      const isVisible = await chart.isVisible().catch(() => false);
      if (isVisible) {
        return chart;
      }
    }

    return null;
  }

  /**
   * Get count of charts with aria-label attributes
   */
  async getChartsWithAriaLabels(): Promise<number> {
    const selectors = [
      'app-bar-chart[aria-label]',
      'app-line-chart[aria-label]',
      'app-pie-chart[aria-label]',
      'app-stat-card[aria-label]',
      'p-chart[aria-label]'
    ];

    let count = 0;
    for (const selector of selectors) {
      count += await this.page.locator(selector).count();
    }

    return count;
  }

  /**
   * Check if field selector dialog is visible
   */
  async isFieldSelectorDialogVisible(): Promise<boolean> {
    return await this.fieldSelectorDialog.isVisible().catch(() => false);
  }
}
