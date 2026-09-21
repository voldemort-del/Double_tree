import { supabase } from '@/lib/supabase';
import type { Booking, BookingServiceType, BookingDetails } from '@/types';

// ============================================================
// bookingService — Spa / gym / pool slot management.
// Provides conflict detection before confirming bookings.
// The AI checks availability; the app confirms and persists.
// ============================================================

// Service capacity defaults (concurrent guests per slot)
const DEFAULT_CAPACITY: Record<BookingServiceType, number> = {
  spa: 1,          // One guest per treatment room / slot
  gym: 10,         // Gym is effectively open access
  pool_session: 5, // Pool lane / session
  beach_club: 20,  // Beach club is high capacity
  kids_club: 12,   // Kids club group capacity
};

// Default durations in minutes
export const DEFAULT_DURATION: Record<string, number> = {
  'Swedish Massage': 60,
  'Hot Stone Massage': 90,
  'Deep Tissue Massage': 60,
  'Couples Massage': 90,
  'Facial Treatment': 60,
  'Body Scrub': 45,
  'Manicure': 45,
  'Pedicure': 60,
  'Gym Session': 60,
  'Pool Session': 60,
  'Aqua Aerobics': 45,
  'Beach Club': 120,
  'Kids Club': 120,
};

function rowToBooking(row: any): Booking {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    guestId: row.guest_id,
    stayId: row.stay_id,
    requestId: row.request_id ?? undefined,
    serviceType: row.service_type,
    serviceName: row.service_name,
    bookingDate: row.booking_date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export interface AvailabilityResult {
  available: boolean;
  conflictCount: number;
  capacity: number;
  suggestedAlternatives?: string[]; // alternative times as HH:MM
}

/**
 * Check if a service slot is available (no conflict or under capacity)
 */
export async function checkAvailability(
  hotelId: string,
  serviceType: BookingServiceType,
  bookingDate: string,    // YYYY-MM-DD
  startTime: string,      // HH:MM
  durationMinutes: number,
): Promise<AvailabilityResult> {
  const capacity = DEFAULT_CAPACITY[serviceType] ?? 1;

  // Find bookings that overlap with the requested time window
  // A booking overlaps if: booking.start_time < (startTime + duration) AND (booking.start_time + duration) > startTime
  const { data, error } = await supabase
    .from('bookings')
    .select('id, start_time, duration_minutes')
    .eq('hotel_id', hotelId)
    .eq('service_type', serviceType)
    .eq('booking_date', bookingDate)
    .eq('status', 'confirmed');

  if (error) {
    console.error('[bookingService] checkAvailability error:', error.message);
    // On error, allow the booking (fail open for demo)
    return { available: true, conflictCount: 0, capacity };
  }

  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = requestedStart + durationMinutes;

  const conflicts = (data ?? []).filter((b: any) => {
    const bStart = timeToMinutes(b.start_time);
    const bEnd = bStart + b.duration_minutes;
    return bStart < requestedEnd && bEnd > requestedStart;
  });

  const conflictCount = conflicts.length;
  const available = conflictCount < capacity;

  // Generate 3 alternative time slots if requested slot is full
  let suggestedAlternatives: string[] | undefined;
  if (!available) {
    suggestedAlternatives = generateAlternatives(startTime, durationMinutes, data ?? []);
  }

  return { available, conflictCount, capacity, suggestedAlternatives };
}

/** Convert HH:MM to total minutes from midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Generate alternative time slots within 09:00–21:00 operating window */
function generateAlternatives(
  requestedTime: string,
  duration: number,
  existingBookings: any[],
): string[] {
  const requested = timeToMinutes(requestedTime);
  const candidates: number[] = [];

  // Try ±1h, ±2h, ±3h from requested
  for (const offset of [-60, 60, -120, 120, -180, 180]) {
    const candidate = requested + offset;
    const candidateEnd = candidate + duration;
    if (candidate < 9 * 60 || candidateEnd > 21 * 60) continue;

    const hasConflict = existingBookings.some((b: any) => {
      const bStart = timeToMinutes(b.start_time);
      const bEnd = bStart + b.duration_minutes;
      return bStart < candidateEnd && bEnd > candidate;
    });

    if (!hasConflict) {
      candidates.push(candidate);
      if (candidates.length >= 3) break;
    }
  }

  return candidates.map(minutesToTime);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export interface CreateBookingInput {
  hotelId: string;
  guestId: string;
  stayId: string;
  requestId?: string;
  details: BookingDetails;
  notes?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking | null> {
  const { details } = input;
  const capacity = DEFAULT_CAPACITY[details.serviceType as BookingServiceType] ?? 1;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      hotel_id: input.hotelId,
      guest_id: input.guestId,
      stay_id: input.stayId,
      request_id: input.requestId ?? null,
      service_type: details.serviceType,
      service_name: details.serviceName,
      booking_date: details.date,
      start_time: details.startTime,
      duration_minutes: details.durationMinutes,
      capacity,
      status: 'confirmed',
      notes: input.notes ?? '',
    })
    .select()
    .single();

  if (error) {
    console.error('[bookingService] createBooking error:', error.message);
    return null;
  }
  return rowToBooking(data);
}

export async function getGuestBookings(guestId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('guest_id', guestId)
    .eq('status', 'confirmed')
    .order('booking_date')
    .order('start_time');

  if (error) {
    console.error('[bookingService] getGuestBookings error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToBooking);
}

export async function cancelBooking(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('[bookingService] cancelBooking error:', error.message);
    return false;
  }
  return true;
}

/** Get all upcoming bookings for a hotel (staff view) */
export async function getHotelBookings(hotelId: string, date?: string): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('status', 'confirmed')
    .order('booking_date')
    .order('start_time');

  if (date) {
    query = query.eq('booking_date', date);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[bookingService] getHotelBookings error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToBooking);
}
