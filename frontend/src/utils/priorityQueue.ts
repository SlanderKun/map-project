interface QueueElement<T> {
  priority: number;
  item: T;
}

export class PriorityQueue<T> {
  private heap: QueueElement<T>[] = [];

  public get length(): number {
    return this.heap.length;
  }

  public push(priority: number, item: T): void {
    this.heap.push({ priority, item });
    this._bubbleUp(this.heap.length - 1);
  }

  public pop(): QueueElement<T> | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop() as QueueElement<T>;
    this._sinkDown(0);
    return top;
  }

  private _bubbleUp(index: number): void {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = this.heap[parentIndex];
      if (element.priority >= parent.priority) break;
      this.heap[parentIndex] = element;
      this.heap[index] = parent;
      index = parentIndex;
    }
  }

  private _sinkDown(index: number): void {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      const leftChildIndex = (index << 1) + 1;
      const rightChildIndex = leftChildIndex + 1;
      let swapIndex: number | null = null;

      if (leftChildIndex < length) {
        if (this.heap[leftChildIndex].priority < element.priority) {
          swapIndex = leftChildIndex;
        }
      }
      if (rightChildIndex < length) {
        const rightPriority = this.heap[rightChildIndex].priority;
        if (
          (swapIndex === null && rightPriority < element.priority) ||
          (swapIndex !== null && rightPriority < this.heap[swapIndex].priority)
        ) {
          swapIndex = rightChildIndex;
        }
      }

      if (swapIndex === null) break;
      this.heap[index] = this.heap[swapIndex];
      this.heap[swapIndex] = element;
      index = swapIndex;
    }
  }
}