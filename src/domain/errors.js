// One error type for every rule violation. The code is for programs to read
// (VALIDATION, NOT_FOUND, SOLD_OUT, ...); the message is for humans.
export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

