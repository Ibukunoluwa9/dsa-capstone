import { DomainError } from '../src/domain/errors.js';
import {
  createStore, createEvent, addTier, bookTickets, cancelBooking,
  findBookingByReference, joinWaitlist, nextInWaitlist, seatsLeft,
} from '../src/domain/inventory.js';

const cents = (n) => `₦${(n / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
const say = (s = '') => console.log(s);
const step = (s) => say(`\n== ${s}`);

const store = createStore();
const event = createEvent(store, { name: 'Lagos Tech Night', venue: 'Landmark Centre', startsAt: '2026-12-05T18:00:00Z' });
const tier = addTier(store, event.id, { name: 'General', priceCents: 500000, capacity: 3 });
say(`Event: ${event.name}. Tier "${tier.name}": ${tier.capacity} seats at ${cents(tier.priceCents)}.`);

step('Ada books 2 of 3 seats');
const ada = bookTickets(store, { tierId: tier.id, attendeeName: 'Ada', quantity: 2 });
say(`Ada booked ${ada.quantity}, reference ${ada.reference}, total ${cents(ada.totalCents)}. Seats left: ${seatsLeft(tier)}`);

step('Bayo asks for 2 but only 1 is left');
try {
  bookTickets(store, { tierId: tier.id, attendeeName: 'Bayo', quantity: 2 });
} catch (err) {
  if (!(err instanceof DomainError)) throw err;
  say(`Refused: ${err.code}. ${err.message}`);
  say(`Nothing changed. Seats left: ${seatsLeft(tier)}`);
}

step('Dayo takes the last seat: the event sells out');
const dayo = bookTickets(store, { tierId: tier.id, attendeeName: 'Dayo', quantity: 1 });
say(`Dayo booked 1, reference ${dayo.reference}. Seats left: ${seatsLeft(tier)}`);

step('Bayo and Chidi join the waitlist');
for (const [name, quantity] of [['Bayo', 2], ['Chidi', 1]]) {
  const { position } = joinWaitlist(store, { tierId: tier.id, attendeeName: name, quantity });
  say(`${name} wants ${quantity}: position ${position}`);
}

step('Find a booking by its reference (O(1) Map lookup)');
const found = findBookingByReference(store, ada.reference);
say(`${found.reference} belongs to ${found.attendeeName}, ${found.quantity} ticket(s), status ${found.status}`);

step("Ada cancels");
cancelBooking(store, ada.id);
say(`Ada's booking is now ${ada.status}. Seats left: ${seatsLeft(tier)}`);
try {
  cancelBooking(store, ada.id);
} catch (err) {
  if (!(err instanceof DomainError)) throw err;
  say(`Cancelling again is refused: ${err.code}`);
}

step('Who is next in line?');
const next = nextInWaitlist(store, tier.id);
say(`Next in line: ${next.attendeeName}, who wants ${next.quantity} seat(s). ${seatsLeft(tier)} are free.`);
