import { randomInt, randomUUID } from 'node:crypto';

// No 0/O, 1/I/L: every character is safe to read aloud or write down.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 6;

export function newId() {
  return randomUUID();
}

export function newReference() {
  let ref = '';
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    ref += ALPHABET[randomInt(ALPHABET.length)];
  }
  return ref;
}


