import { newReference } from '../src/domain/ids.js';

const BOOKINGS = 100_000;
const LOOKUPS = 500;

// Build bookings with unique references.
const bookings = [];
const byReference = new Map();
while (bookings.length < BOOKINGS) {
  const reference = newReference();
  if (byReference.has(reference)) continue;
  const booking = { reference, quantity: 1 };
  bookings.push(booking);
  byReference.set(reference, booking);
}

// Pick random references to look up.
const targets = [];
for (let i = 0; i < LOOKUPS; i++) {
  targets.push(bookings[Math.floor(Math.random() * BOOKINGS)].reference);
}

function time(label, fn) {
  const start = performance.now();
  let hits = 0;
  for (const ref of targets) if (fn(ref)) hits++;
  const ms = performance.now() - start;
  console.log(`${label.padEnd(12)} ${ms.toFixed(3).padStart(10)} ms   (${hits}/${LOOKUPS} found)`);
  return ms;
}

console.log(`${LOOKUPS} lookups among ${BOOKINGS.toLocaleString()} bookings\n`);
const slow = time('Array.find', (ref) => bookings.find((b) => b.reference === ref));
const fast = time('Map.get', (ref) => byReference.get(ref));
console.log(`\nMap was about ${Math.round(slow / fast).toLocaleString()}x faster.`);
console.log('Array.find is O(n): it may scan every booking. Map.get is O(1): the work does not grow with n.');
