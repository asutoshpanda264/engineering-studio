/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { BoundedProcessor } from "../entities/BoundedProcessor";
import { createRequestRoutedEvent } from "../events/EventFactory";

function fakeArrival(id: string) {
  return createRequestRoutedEvent(0, "a", "b", id, {});
}

describe("BoundedProcessor", () => {
  it("starts work immediately while under maxConcurrent", () => {
    const processor = new BoundedProcessor(2, 5);
    expect(processor.admit(fakeArrival("r1"))).toBe("started");
    expect(processor.admit(fakeArrival("r2"))).toBe("started");
    expect(processor.activeRequests).toBe(2);
  });

  it("queues work once at capacity, then rejects once the queue is full", () => {
    const processor = new BoundedProcessor(1, 1);
    expect(processor.admit(fakeArrival("r1"))).toBe("started");
    expect(processor.admit(fakeArrival("r2"))).toBe("queued");
    expect(processor.admit(fakeArrival("r3"))).toBe("rejected");
    expect(processor.queueLength).toBe(1);
  });

  it("pulls the next queued item in FIFO order when work completes", () => {
    const processor = new BoundedProcessor(1, 5);
    processor.admit(fakeArrival("r1"));
    processor.admit(fakeArrival("r2"));
    processor.admit(fakeArrival("r3"));

    const next = processor.complete();
    expect(next?.requestId).toBe("r2");
    expect(processor.activeRequests).toBe(1);
    expect(processor.queueLength).toBe(1);
  });

  it("returns null from complete() when the backlog is empty", () => {
    const processor = new BoundedProcessor(2, 5);
    processor.admit(fakeArrival("r1"));
    expect(processor.complete()).toBeNull();
    expect(processor.activeRequests).toBe(0);
  });
});
