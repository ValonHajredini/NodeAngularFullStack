import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Guide overlay component for grid and snap guides visualization.
 * Renders grid lines and snap indicators on the canvas.
 */
@Component({
  selector: 'app-guide-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg *ngIf="visible" class="guide-overlay" [style.pointer-events]="'none'">
      <!-- Grid lines -->
      <g *ngIf="showGrid" class="grid-lines">
        <!-- Minor grid lines -->
        <line
          *ngFor="let x of gridX"
          [attr.x1]="x"
          [attr.y1]="0"
          [attr.x2]="x"
          [attr.y2]="height"
          [attr.stroke]="isMajorLine(x) ? '#b0b0b0' : '#d8d8d8'"
          [attr.stroke-width]="isMajorLine(x) ? '1.5' : '1'"
          [attr.stroke-dasharray]="isMajorLine(x) ? 'none' : '4,4'"
          opacity="0.6"
        />
        <line
          *ngFor="let y of gridY"
          [attr.x1]="0"
          [attr.y1]="y"
          [attr.x2]="width"
          [attr.y2]="y"
          [attr.stroke]="isMajorLine(y) ? '#b0b0b0' : '#d8d8d8'"
          [attr.stroke-width]="isMajorLine(y) ? '1.5' : '1'"
          [attr.stroke-dasharray]="isMajorLine(y) ? 'none' : '4,4'"
          opacity="0.6"
        />
      </g>

      <!-- Ruler markings -->
      <g *ngIf="showRulers" class="rulers">
        <!-- Top ruler -->
        <rect x="0" y="0" [attr.width]="width" height="20" fill="#f5f5f5" />
        <!-- Left ruler -->
        <rect x="0" y="0" width="20" [attr.height]="height" fill="#f5f5f5" />
      </g>
    </svg>
  `,
  styles: [
    `
      .guide-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      }
    `,
  ],
})
export class GuideOverlayComponent {
  /** Whether overlay is visible */
  @Input() visible: boolean = true;

  /** Whether to show grid */
  @Input() showGrid: boolean = false;

  /** Whether to show rulers */
  @Input() showRulers: boolean = false;

  /** Canvas width */
  @Input() width: number = 800;

  /** Canvas height */
  @Input() height: number = 600;

  /** Grid spacing in pixels */
  @Input() gridSpacing: number = 50;

  /** Major grid line spacing (every N minor lines) */
  @Input() majorGridInterval: number = 4;

  /** Computed grid X positions */
  get gridX(): number[] {
    const lines: number[] = [];
    for (let x = this.gridSpacing; x < this.width; x += this.gridSpacing) {
      lines.push(x);
    }
    return lines;
  }

  /** Computed grid Y positions */
  get gridY(): number[] {
    const lines: number[] = [];
    for (let y = this.gridSpacing; y < this.height; y += this.gridSpacing) {
      lines.push(y);
    }
    return lines;
  }

  /** Check if line should be a major grid line */
  isMajorLine(position: number): boolean {
    return position % (this.gridSpacing * this.majorGridInterval) === 0;
  }
}
