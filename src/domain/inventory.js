import { DomainError } from './errors.js';
import { newId, newReference } from './ids.js';
import { Queue } from './waitlistQueue.js';

export const MIN_TICKETS = 1;
export const MAX_TICKETS = 10;

// ---------- validation helpers ----------

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('VALIDATION', `${field} must be a non-empty string`);
  }
  return value.trim();
}

function requireWholeNumber(value, field, min) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new DomainError('VALIDATION', `${field} must be a whole number of at least ${min}`);
  }
  return value;
}

function requireQuantity(value) {
  if (!Number.isSafeInteger(value) || value < MIN_TICKETS || value > MAX_TICKETS) {
    throw new DomainError('VALIDATION', `quantity must be a whole number from ${MIN_TICKETS} to ${MAX_TICKETS}`);
  }
  return value;
}

function requireObject(value, field) {
  if (value === null || typeof value !== 'object') {
    throw new DomainError('VALIDATION', `${field} must be an object`);
  }
  return value;
}

function getEvent(store, eventId) {
  const event = store.events.get(eventId);
  if (!event) throw new DomainError('NOT_FOUND', `Event not found: ${eventId}`);
  return event;
}

function getTier(store, tierId) {
  const tier = store.tiers.get(tierId);
  if (!tier) throw new DomainError('NOT_FOUND', `Ticket tier not found: ${tierId}`);
  return tier;
}

// ---------- store ----------

export function createStore() {
  return {
    events: new Map(),        // eventId -> event
    tiers: new Map(),         // tierId -> tier
    bookings: new Map(),      // bookingId -> booking
    byReference: new Map(),   // reference -> booking (the O(1) lookup)
    waitlists: new Map(),     // tierId -> Queue of waitlist entries
  };
}

// ---------- events and tiers ----------

export function createEvent(store, input) {
  requireObject(input, 'event');
  const name = requireText(input.name, 'name');
  const venue = requireText(input.venue, 'venue');
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new DomainError('VALIDATION', 'startsAt must be a valid date');
  }
  const event = { id: newId(), name, venue, startsAt, tierIds: [] };
  store.events.set(event.id, event);
  return event;
}

export function addTier(store, eventId, input) {
  const event = getEvent(store, eventId);
  requireObject(input, 'tier');
  const tier = {
    id: newId(),
    eventId: event.id,
    name: requireText(input.name, 'name'),
    priceCents: requireWholeNumber(input.priceCents, 'priceCents', 0), // whole cents, never decimals
    capacity: requireWholeNumber(input.capacity, 'capacity', 1),
    sold: 0,
  };
  store.tiers.set(tier.id, tier);
  event.tierIds.push(tier.id);
  return tier;
}

export function seatsLeft(tier) {
  return tier.capacity - tier.sold;
}

// ---------- bookings ----------

export function bookTickets(store, input) {
  // 1. Validate everything first. Nothing is changed until all checks pass.
  requireObject(input, 'booking');
  const tier = getTier(store, input.tierId);
  const attendeeName = requireText(input.attendeeName, 'attendeeName');
  const quantity = requireQuantity(input.quantity);

  if (seatsLeft(tier) < quantity) {
    throw new DomainError(
      'SOLD_OUT',
      `Only ${seatsLeft(tier)} seat(s) left in "${tier.name}", you asked for ${quantity}`,
    );
  }

  // 2. Build the booking (a unique reference is picked before any change).
  let reference = newReference();
  while (store.byReference.has(reference)) reference = newReference();

  const booking = {
    id: newId(),
    reference,
    eventId: tier.eventId,
    tierId: tier.id,
    attendeeName,
    quantity,
    totalCents: tier.priceCents * quantity,
    status: 'CONFIRMED',
  };

  // 3. Only now change the store.
  tier.sold += quantity;
  store.bookings.set(booking.id, booking);
  store.byReference.set(booking.reference, booking);
  return booking;
}

export function cancelBooking(store, bookingId) {
  const booking = store.bookings.get(bookingId);
  if (!booking) throw new DomainError('NOT_FOUND', `Booking not found: ${bookingId}`);
  if (booking.status === 'CANCELLED') {
    throw new DomainError('ALREADY_CANCELLED', `Booking ${booking.reference} is already cancelled`);
  }
  const tier = getTier(store, booking.tierId);
  booking.status = 'CANCELLED';
  tier.sold -= booking.quantity; // seats released exactly once
  return booking;
}

export function findBookingByReference(store, reference) {
  if (typeof reference !== 'string') {
    throw new DomainError('VALIDATION', 'reference must be a string');
  }
  const booking = store.byReference.get(reference.trim().toUpperCase());
  if (!booking) throw new DomainError('NOT_FOUND', `No booking with reference ${reference}`);
  return booking;
}

// ---------- waitlist ----------

export function joinWaitlist(store, input) {
  requireObject(input, 'waitlist entry');
  const tier = getTier(store, input.tierId);
  const attendeeName = requireText(input.attendeeName, 'attendeeName');
  const quantity = requireQuantity(input.quantity);

  if (seatsLeft(tier) >= quantity) {
    throw new DomainError('SEATS_AVAILABLE', `${quantity} seat(s) are available in "${tier.name}": book instead of waiting`);
  }

  let queue = store.waitlists.get(tier.id);
  if (!queue) {
    queue = new Queue();
    store.waitlists.set(tier.id, queue);
  }
  const entry = { id: newId(), tierId: tier.id, attendeeName, quantity, joinedAt: new Date() };
  queue.enqueue(entry);
  return { entry, position: queue.size };
}

// Who is first in line for a tier? (undefined if nobody is waiting)
export function nextInWaitlist(store, tierId) {
  getTier(store, tierId);
  return store.waitlists.get(tierId)?.peek();
}


