/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { PlaybackController } from "../playback/PlaybackController";
import type { PlaybackScheduler } from "../playback/PlaybackController";
import { collectMetrics } from "../metrics/MetricsCollector";
import {
  createEvent,
  createRequestCompletedEvent,
  createRequestStartedEvent,
} from "../events/EventFactory";
import type { SimulationEvent } from "../events/types";
import type { SimulationResult } from "../types";

/** Deterministic stand-in for requestAnimationFrame, driven manually by tests. */
class FakeScheduler implements PlaybackScheduler {
  private pending: ((nowMs: number) => void) | null = null;
  private time = 0;
  private nextHandle = 1;

  requestFrame(callback: (nowMs: number) => void): number {
    this.pending = callback;
    return this.nextHandle++;
  }

  cancelFrame(): void {
    this.pending = null;
  }

  hasPendingFrame(): boolean {
    return this.pending !== null;
  }

  /** Advances fake wall-clock time and fires the pending frame, if any. */
  tick(deltaMs: number): void {
    this.time += deltaMs;
    const callback = this.pending;
    this.pending = null;
    callback?.(this.time);
  }
}

function buildResult(): SimulationResult {
  const events: SimulationEvent[] = [
    createEvent("SIMULATION_STARTED", 0, null, null, null),
    createRequestStartedEvent(0, "client1", "req_1"),
    createRequestCompletedEvent(50, "api1", "client1", "req_1", 50),
    createRequestStartedEvent(100, "client1", "req_2"),
    createRequestCompletedEvent(200, "api1", "client1", "req_2", 100),
    createEvent("SIMULATION_FINISHED", 200, null, null, null),
  ];

  return {
    events,
    metrics: collectMetrics(events, ["client1", "api1"], 200, ["client1"]),
    duration: 200,
    warnings: [],
    errors: [],
    clientIds: ["client1"],
    metadata: { seed: 1, version: "0.1.0", generatedAt: new Date().toISOString() },
  };
}

describe("PlaybackController", () => {
  it("starts idle at time zero", () => {
    const controller = new PlaybackController(buildResult(), new FakeScheduler());
    expect(controller.getState()).toEqual({
      currentTime: 0,
      duration: 200,
      speed: 1,
      playing: false,
    });
  });

  it("seek clamps to [0, duration]", () => {
    const controller = new PlaybackController(buildResult(), new FakeScheduler());

    controller.seek(-50);
    expect(controller.getState().currentTime).toBe(0);

    controller.seek(9999);
    expect(controller.getState().currentTime).toBe(200);
  });

  it("only reveals events up to the current time, and derives metrics from that slice", () => {
    const controller = new PlaybackController(buildResult(), new FakeScheduler());

    controller.seek(50);
    const visible = controller.getVisibleEvents();

    expect(visible.map((e) => e.type)).toEqual([
      "SIMULATION_STARTED",
      "REQUEST_STARTED",
      "REQUEST_COMPLETED",
    ]);
    expect(controller.getMetrics().totalRequests).toBe(1);
    expect(controller.getMetrics().successfulRequests).toBe(1);
  });

  it("produces identical content whether a point in time is reached by playing or by seeking", () => {
    const scheduler = new FakeScheduler();
    const result = buildResult();
    const played = new PlaybackController(result, scheduler);

    played.play();
    scheduler.tick(16); // warm-up frame: establishes baseline, contributes 0
    scheduler.tick(16);
    scheduler.tick(16);
    scheduler.tick(16);
    expect(played.getState().currentTime).toBe(48);

    const seeked = new PlaybackController(result, new FakeScheduler());
    seeked.seek(48);

    expect(played.getVisibleEvents()).toEqual(seeked.getVisibleEvents());
    expect(played.getMetrics()).toEqual(seeked.getMetrics());
  });

  it("scales the per-frame advance by the playback speed", () => {
    const scheduler = new FakeScheduler();
    const controller = new PlaybackController(buildResult(), scheduler);
    controller.setSpeed(2);

    controller.play();
    scheduler.tick(16); // warm-up
    scheduler.tick(16); // += 16 * 2

    expect(controller.getState().currentTime).toBe(32);
  });

  it("clamps speed to [0.5x, 4x]", () => {
    const controller = new PlaybackController(buildResult(), new FakeScheduler());

    controller.setSpeed(10);
    expect(controller.getState().speed).toBe(4);

    controller.setSpeed(0.01);
    expect(controller.getState().speed).toBe(0.5);
  });

  it("auto-pauses at the end instead of overshooting", () => {
    const scheduler = new FakeScheduler();
    const controller = new PlaybackController(buildResult(), scheduler);

    controller.play();
    scheduler.tick(0); // warm-up
    scheduler.tick(500); // far past duration=200

    expect(controller.getState().currentTime).toBe(200);
    expect(controller.getState().playing).toBe(false);
    expect(scheduler.hasPendingFrame()).toBe(false);
  });

  it("replays from the beginning when play() is called again after finishing", () => {
    const scheduler = new FakeScheduler();
    const controller = new PlaybackController(buildResult(), scheduler);

    controller.play();
    scheduler.tick(0);
    scheduler.tick(500); // runs to completion, auto-pauses

    controller.play();
    expect(controller.getState().currentTime).toBe(0);
    expect(controller.getState().playing).toBe(true);
  });

  it("pause stops scheduling further frames", () => {
    const scheduler = new FakeScheduler();
    const controller = new PlaybackController(buildResult(), scheduler);

    controller.play();
    scheduler.tick(16);
    controller.pause();

    expect(scheduler.hasPendingFrame()).toBe(false);
    expect(controller.getState().playing).toBe(false);
  });

  it("restart resets to time zero without forcing a play/pause state", () => {
    const controller = new PlaybackController(buildResult(), new FakeScheduler());

    controller.seek(150);
    controller.restart();

    expect(controller.getState().currentTime).toBe(0);
    expect(controller.getState().playing).toBe(false);
  });

  it("notifies subscribers on state changes, and stops after unsubscribing", () => {
    const controller = new PlaybackController(buildResult(), new FakeScheduler());
    const calls: number[] = [];
    const unsubscribe = controller.subscribe((state) => calls.push(state.currentTime));

    controller.seek(10);
    expect(calls).toEqual([10]);

    unsubscribe();
    controller.seek(20);
    expect(calls).toEqual([10]);
  });

  it("dispose cancels any pending frame and clears listeners", () => {
    const scheduler = new FakeScheduler();
    const controller = new PlaybackController(buildResult(), scheduler);
    const calls: number[] = [];
    controller.subscribe((state) => calls.push(state.currentTime));

    controller.play(); // notifies once immediately, with currentTime still 0
    expect(scheduler.hasPendingFrame()).toBe(true);
    expect(calls).toEqual([0]);

    controller.dispose();
    expect(scheduler.hasPendingFrame()).toBe(false);

    controller.seek(75);
    expect(calls).toEqual([0]);
  });
});
