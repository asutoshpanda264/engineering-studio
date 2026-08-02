import type { Scenario } from "./types";
import { movieTicketBooking } from "./movieTicketBooking";
import { urlShortener } from "./urlShortener";
import { flashSale } from "./flashSale";

export type { Scenario, ScenarioConstraint, ScenarioEntity, ScenarioMetric } from "./types";
export type { ConstraintResult, ScenarioEvaluation } from "./validator";
export { evaluateConstraint, evaluateScenario } from "./validator";

/** Catalogue of every scenario, ordered by difficulty — more as SCENARIOS.md's catalogue is built out. */
export const SCENARIOS: Scenario[] = [urlShortener, movieTicketBooking, flashSale];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
