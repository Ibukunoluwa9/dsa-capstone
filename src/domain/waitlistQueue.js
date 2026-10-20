// First-in-first-out queue as a singly linked list.
// Keeping both a head (remove here) and a tail (add here) makes every
// operation O(1). Array.shift() would be O(n) because it moves every item.
export class Queue {
  #head = null;
  #tail = null;
  #size = 0;

  enqueue(value) {
    const node = { value, next: null };
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
    this.#size++;
  }

  dequeue() {
    if (!this.#head) return undefined;
    const { value } = this.#head;
    this.#head = this.#head.next;
    if (!this.#head) this.#tail = null;
    this.#size--;
    return value;
  }

  peek() {
    return this.#head ? this.#head.value : undefined;
  }

  get size() {
    return this.#size;
  }

  // O(n): for display and debugging only.
  toArray() {
    const out = [];
    for (let n = this.#head; n; n = n.next) out.push(n.value);
    return out;
  }
}


