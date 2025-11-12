-- Rollback Migration 032: Drop appointment_bookings table
-- Epic 29, Story 29.12: Appointment Booking Template with Time Slot Management
-- Author: Dev Agent (James)
-- Date: 2025-11-09

-- Drop trigger
DROP TRIGGER IF EXISTS update_appointment_bookings_updated_at ON appointment_bookings;

-- Drop indexes
DROP INDEX IF EXISTS idx_appointment_bookings_form_date_slot;
DROP INDEX IF EXISTS idx_appointment_bookings_date;

-- Drop table
DROP TABLE IF EXISTS appointment_bookings;
