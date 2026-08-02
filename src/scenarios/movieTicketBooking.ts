/**
 * Movie Ticket Booking — SCENARIOS.md's Level 1 "Foundations" scenario.
 *
 * The starting architecture is intentionally undersized (SCENARIOS.md §3
 * — "users should never begin with the ideal solution"): the database's
 * connection pool is the deliberate bottleneck, so running the scenario
 * unmodified immediately fails the success-rate constraint (~88%, verified
 * against the real engine at this seed) and gives the student something
 * to investigate. Only Client/APIServer/Database are used since those are
 * the only entity types the Simulator currently implements —
 * LoadBalancer/Cache aren't valid solutions here yet.
 */

import type { Scenario } from "./types";

export const movieTicketBooking: Scenario = {
  id: "movie-ticket-booking",
  title: "Movie Ticket Booking",
  difficulty: 2,
  story:
    "A movie theater chain is launching ticket sales for a blockbuster release. " +
    "Thousands of fans open the booking page the moment sales go live, all trying " +
    "to reserve seats for the same few showtimes within seconds of each other. " +
    "The booking service in front of you was built for ordinary weekday traffic " +
    "— it has never seen a release like this.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 160 },
      config: { requestRate: 80 },
    },
    {
      id: "api",
      type: "api",
      label: "API Server",
      position: { x: 360, y: 160 },
      config: { maxConcurrent: 8, maxQueueLength: 20, processingTimeMs: 10 },
    },
    {
      id: "database",
      type: "database",
      label: "Database",
      position: { x: 640, y: 160 },
      config: {
        maxConnections: 2,
        maxQueueLength: 3,
        processingTimeMs: 25,
        failureProbability: 0,
      },
    },
  ],
  startingConnections: [
    { source: "client", target: "api", latencyMs: 5 },
    { source: "api", target: "database", latencyMs: 5 },
  ],
  trafficPattern: { type: "constant", rate: 80 },
  durationMs: 10_000,
  seed: 100,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of booking requests succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 300,
      label: "95% of requests complete within 300ms",
      unit: "ms",
    },
  ],

  hints: [
    "Which component is rejecting the most requests right now — check its error count in the Inspector.",
    "What happens to a request once the database's connection pool is already full?",
    "If you give the API server more capacity, does the failure rate actually improve, or does it just move somewhere else?",
  ],

  learningGoals: [
    "A shared connection pool is a hard ceiling on throughput, no matter how fast the API server is.",
    "Scaling the wrong component doesn't remove a bottleneck — it just relocates it.",
    "Backpressure (queueing, then rejecting) is what a system does on purpose to protect itself from overload.",
  ],
};
