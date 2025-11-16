import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, FormFieldType, TimeSlotMetadata } from '@nodeangularfullstack/shared';

/**
 * Time Slot Field Preview Component
 * Displays a preview of time slot dropdown in the form builder canvas
 * Shows up to 5 sample time slots based on field metadata configuration
 */
@Component({
  selector: 'app-time-slot-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      @if (field.label) {
        <label class="block text-sm font-medium text-gray-700">
          {{ field.label }}
          @if (field.required) {
            <span class="text-red-500 ml-1">*</span>
          }
        </label>
      }

      <select
        class="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled
      >
        <option value="">{{ placeholder }}</option>
        @for (slot of previewSlots; track slot.value) {
          <option [value]="slot.value">{{ slot.label }}</option>
        }
        @if (hasMoreSlots) {
          <option value="" disabled>... and {{ remainingSlots }} more slots</option>
        }
      </select>

      @if (field.helpText) {
        <p class="text-xs text-gray-500 mt-1">{{ field.helpText }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class TimeSlotPreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Get preview time slots (limited to first 5 for preview)
   * Uses sensible defaults if metadata is not configured
   */
  get previewSlots(): { label: string; value: string }[] {
    const metadata = (this.field.metadata || {}) as TimeSlotMetadata;

    // Handle "all-day" special case
    if (metadata?.interval === 'all-day') {
      return [{ label: 'All Day (24 hours)', value: 'all-day' }];
    }

    // Generate sample time slots
    const slots = this.generateTimeSlots(metadata);
    return slots.slice(0, 5); // Show only first 5 for preview
  }

  /**
   * Check if there are more slots beyond the preview
   */
  get hasMoreSlots(): boolean {
    const metadata = this.field.metadata as TimeSlotMetadata;
    if (metadata?.interval === 'all-day') return false;

    const totalSlots = this.generateTimeSlots(metadata).length;
    return totalSlots > 5;
  }

  /**
   * Get count of remaining slots not shown in preview
   */
  get remainingSlots(): number {
    const metadata = this.field.metadata as TimeSlotMetadata;
    if (metadata?.interval === 'all-day') return 0;

    const totalSlots = this.generateTimeSlots(metadata).length;
    return totalSlots - 5;
  }

  /**
   * Get placeholder text
   */
  get placeholder(): string {
    return this.field.placeholder || 'Select a time slot';
  }

  /**
   * Generate time slot options based on metadata
   */
  private generateTimeSlots(metadata?: TimeSlotMetadata): { label: string; value: string }[] {
    // Default values
    const interval = metadata?.interval || '30min';
    const startTime = metadata?.startTime || '09:00';
    const endTime = metadata?.endTime || '17:00';
    const maxSlots = metadata?.maxSlots || 20;

    // Convert interval to minutes
    const intervalMinutes = this.getIntervalMinutes(interval);

    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const slots: { label: string; value: string }[] = [];
    let currentMinutes = startMinutes;
    let slotCount = 0;

    while (currentMinutes < endMinutes && slotCount < maxSlots) {
      const slotStart = this.formatTime(currentMinutes);
      const slotEnd = this.formatTime(currentMinutes + intervalMinutes);

      // Format as time range: "08:00 - 08:30"
      const label = `${slotStart} - ${slotEnd}`;
      const value = `${slotStart}-${slotEnd}`;

      slots.push({ label, value });

      currentMinutes += intervalMinutes;
      slotCount++;
    }

    return slots;
  }

  /**
   * Convert interval string to minutes
   */
  private getIntervalMinutes(interval: string): number {
    switch (interval) {
      case '5min':
        return 5;
      case '10min':
        return 10;
      case '15min':
        return 15;
      case '30min':
        return 30;
      case '1h':
      case '1hour':
        return 60;
      case '3h':
        return 180;
      case '6h':
        return 360;
      case 'all-day':
      case '1day':
        return 1440; // 24 hours
      default:
        return 30;
    }
  }

  /**
   * Format minutes to HH:MM time string
   */
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
