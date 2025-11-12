-- Migration 032: Create appointment_bookings table for time slot management
-- Epic 29, Story 29.12: Appointment Booking Template with Time Slot Management
-- Author: Dev Agent (James)
-- Date: 2025-11-09

-- Create appointment_bookings table for time slot management
CREATE TABLE appointment_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast conflict detection
-- Partial index only on confirmed bookings for better performance
CREATE INDEX idx_appointment_bookings_form_date_slot ON appointment_bookings(form_id, date, time_slot) WHERE status = 'confirmed';

-- Index for calendar queries
CREATE INDEX idx_appointment_bookings_date ON appointment_bookings(date, status);

-- Trigger for updated_at
CREATE TRIGGER update_appointment_bookings_updated_at
BEFORE UPDATE ON appointment_bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE appointment_bookings IS 'Stores appointment bookings with conflict detection support for template business logic';
COMMENT ON COLUMN appointment_bookings.id IS 'Unique booking identifier (UUID v4)';
COMMENT ON COLUMN appointment_bookings.form_id IS 'References the form this booking belongs to';
COMMENT ON COLUMN appointment_bookings.date IS 'Appointment date in ISO format (YYYY-MM-DD)';
COMMENT ON COLUMN appointment_bookings.time_slot IS 'Time slot identifier (e.g., "09:00-10:00", "morning", custom labels)';
COMMENT ON COLUMN appointment_bookings.booked_at IS 'Timestamp when booking was created';
COMMENT ON COLUMN appointment_bookings.status IS 'Booking status: confirmed (active), cancelled (user cancelled), completed (past appointment)';
COMMENT ON COLUMN appointment_bookings.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN appointment_bookings.updated_at IS 'Record last update timestamp';
