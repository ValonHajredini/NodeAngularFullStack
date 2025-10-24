import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestToolService } from './test-tool.service';

/**
 * Test Tool Component
 *
 * A test tool for integration testing
 *
 * @example
 * ```html
 * <app-test-tool></app-test-tool>
 * ```
 */
@Component({
  selector: 'app-test-tool',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-tool.component.html',
  styleUrls: ['./test-tool.component.css'],
})
export class TestToolComponent implements OnInit {
  /** Service for Test Tool operations */
  constructor(private testToolService: TestToolService) {}

  /**
   * Component initialization lifecycle hook.
   * Loads initial data and sets up subscriptions.
   */
  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Load Test Tool data from backend.
   */
  private loadData(): void {
    console.log('Test Tool component initialized');
    // TODO: Implement data loading
    // this.testToolService.getAll().subscribe({
    //   next: (data) => console.log('Data loaded:', data),
    //   error: (err) => console.error('Error loading data:', err)
    // });
  }
}
