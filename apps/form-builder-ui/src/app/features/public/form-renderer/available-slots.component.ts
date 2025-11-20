import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { FormRendererService, FormRenderError, FormRenderErrorType } from './form-renderer.service';
import { AvailableSlot } from '@nodeangularfullstack/shared';

/**
 * Available Slots Component
 *
 * Displays a calendar-based UI for viewing and selecting available appointment time slots.
 * Shows real-time availability with capacity indicators (available, limited, full).
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.12: Appointment Booking Template with Time Slot Management
 *
 * @example
 * <app-available-slots
 *   [shortCode]="formShortCode"
 *   (slotSelected)="onSlotSelected($event)">
 * </app-available-slots>
 */
@Component({
  selector: 'app-available-slots',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    TagModule,
  ],
  templateUrl: './available-slots.component.html',
  styleUrls: ['./available-slots.component.scss'],
})
export class AvailableSlotsComponent implements OnInit {
  /**
   * Form short code for fetching available slots
   */
  @Input({ required: true }) shortCode!: string;

  /**
   * Emits when a user selects a time slot
   */
  @Output() slotSelected = new EventEmitter<{ date: string; timeSlot: string }>();

  /**
   * Date range for slot availability query
   */
  dateRange = signal<Date[]>([]);

  /**
   * Available slots fetched from API
   */
  availableSlots = signal<AvailableSlot[]>([]);

  /**
   * Loading state while fetching slots
   */
  loading = signal<boolean>(false);

  /**
   * Error message if slot fetching fails
   */
  errorMessage = signal<string | null>(null);

  /**
   * Currently selected slot
   */
  selectedSlot = signal<{ date: string; timeSlot: string } | null>(null);

  /**
   * Minimum selectable date (today)
   */
  minDate: Date;

  /**
   * Maximum selectable date (90 days from today)
   */
  maxDate: Date;

  constructor(private formRendererService: FormRendererService) {
    // Set date range constraints (today to 90 days from now)
    this.minDate = new Date();
    this.maxDate = new Date();
    this.maxDate.setDate(this.maxDate.getDate() + 90);

    // Initialize date range to next 7 days by default
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    this.dateRange.set([startDate, endDate]);
  }

  ngOnInit(): void {
    // Fetch slots on component initialization
    this.fetchAvailableSlots();
  }

  /**
   * Fetches available slots from API based on selected date range
   */
  fetchAvailableSlots(): void {
    const range = this.dateRange();

    // Validate date range selection
    if (!range || range.length !== 2 || !range[0] || !range[1]) {
      this.errorMessage.set('Please select both start and end dates');
      return;
    }

    const [startDate, endDate] = range;

    // Format dates to YYYY-MM-DD (ISO 8601)
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    // Clear previous errors
    this.errorMessage.set(null);
    this.loading.set(true);

    // Fetch slots from API
    this.formRendererService.getAvailableSlots(this.shortCode, startDateStr, endDateStr).subscribe({
      next: (slots) => {
        this.availableSlots.set(slots);
        this.loading.set(false);
        console.log(`Fetched ${slots.length} available slots`);
      },
      error: (error: FormRenderError) => {
        this.loading.set(false);
        this.handleError(error);
      },
    });
  }

  /**
   * Handles errors from slot fetching
   */
  private handleError(error: FormRenderError): void {
    switch (error.type) {
      case FormRenderErrorType.NOT_FOUND:
        this.errorMessage.set('Form not found or not configured for appointment booking');
        break;
      case FormRenderErrorType.EXPIRED:
        this.errorMessage.set('This form has expired and is no longer accepting appointments');
        break;
      case FormRenderErrorType.RATE_LIMITED:
        this.errorMessage.set('Too many requests. Please wait a moment and try again.');
        break;
      case FormRenderErrorType.NETWORK_ERROR:
        this.errorMessage.set('Network error. Please check your connection and try again.');
        break;
      default:
        this.errorMessage.set(error.message || 'Failed to load available slots. Please try again.');
    }
  }

  /**
   * Handles date range change event from calendar
   */
  onDateRangeChange(): void {
    // Fetch slots when date range changes
    this.fetchAvailableSlots();
  }

  /**
   * Handles slot selection
   */
  selectSlot(slot: AvailableSlot): void {
    // Only allow selection of available slots
    if (!slot.is_available) {
      return;
    }

    // Set selected slot
    this.selectedSlot.set({
      date: slot.date,
      timeSlot: slot.time_slot,
    });

    // Emit selection event
    this.slotSelected.emit({
      date: slot.date,
      timeSlot: slot.time_slot,
    });
  }

  /**
   * Gets severity level for availability tag
   * Used to color-code slots based on remaining capacity
   */
  getAvailabilitySeverity(slot: AvailableSlot): 'success' | 'warn' | 'danger' {
    if (!slot.is_available) {
      return 'danger'; // Red for full
    }

    const availabilityPercentage = (slot.available_capacity / slot.max_capacity) * 100;

    if (availabilityPercentage >= 50) {
      return 'success'; // Green for 50%+ available
    } else if (availabilityPercentage >= 25) {
      return 'warn'; // Yellow for 25-50% available
    } else {
      return 'danger'; // Red for <25% available (limited)
    }
  }

  /**
   * Gets availability label text
   */
  getAvailabilityLabel(slot: AvailableSlot): string {
    if (!slot.is_available) {
      return 'Full';
    }

    return `${slot.available_capacity}/${slot.max_capacity} available`;
  }

  /**
   * Groups slots by date for display
   */
  getSlotsByDate(): Map<string, AvailableSlot[]> {
    const slotsByDate = new Map<string, AvailableSlot[]>();

    for (const slot of this.availableSlots()) {
      const existing = slotsByDate.get(slot.date) || [];
      existing.push(slot);
      slotsByDate.set(slot.date, existing);
    }

    return slotsByDate;
  }

  /**
   * Formats date for display (e.g., "Monday, Dec 15, 2025")
   */
  formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00'); // Parse as local date
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Checks if a slot is currently selected
   */
  isSlotSelected(slot: AvailableSlot): boolean {
    const selected = this.selectedSlot();
    return selected !== null && selected.date === slot.date && selected.timeSlot === slot.time_slot;
  }

  /**
   * Resets date range to default (today) and fetches new slots
   */
  resetAndFetchSlots(): void {
    const today = new Date();
    this.dateRange.set([today, today]);
    this.fetchAvailableSlots();
  }
}
