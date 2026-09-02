import type { Scenario } from "./types";
import { movieTicketBooking } from "./movieTicketBooking";
import { urlShortener } from "./urlShortener";
import { flashSale } from "./flashSale";
import { parkingReservationPlatform } from "./parkingReservationPlatform";
import { priceAlertNotifications } from "./priceAlertNotifications";
import { internalAdminDashboard } from "./internalAdminDashboard";
import { trendingHashtagsFeed } from "./trendingHashtagsFeed";
import { iotSensorIngestion } from "./iotSensorIngestion";
import { concertTicketDrop } from "./concertTicketDrop";
import { slowSearchEndpoint } from "./slowSearchEndpoint";
import { viralVideoComments } from "./viralVideoComments";
import { adAuctionBidding } from "./adAuctionBidding";
import { checkoutTimeoutMystery } from "./checkoutTimeoutMystery";
import { recipeOfTheDay } from "./recipeOfTheDay";
import { newsletterSendConfirmations } from "./newsletterSendConfirmations";
import { weatherForecastApi } from "./weatherForecastApi";
import { warehouseInventorySync } from "./warehouseInventorySync";
import { liveSportsScoreboard } from "./liveSportsScoreboard";
import { rideHailingLocationPings } from "./rideHailingLocationPings";
import { flightStatusPushUpdates } from "./flightStatusPushUpdates";
import { globalLeaderboardUpdates } from "./globalLeaderboardUpdates";
import { couponCodeRedemption } from "./couponCodeRedemption";
import { fitnessTrackerStepSync } from "./fitnessTrackerStepSync";
import { apiGatewaySlowdown } from "./apiGatewaySlowdown";
import { wildfireAlertBroadcast } from "./wildfireAlertBroadcast";
import { trendingProductSearch } from "./trendingProductSearch";
import { publicTransitTrackerApi } from "./publicTransitTrackerApi";
import { customerSupportAgent } from "./customerSupportAgent";
import { codingAgent } from "./codingAgent";
import { researchAssistant } from "./researchAssistant";
import { autonomousOpsAgent } from "./autonomousOpsAgent";
import { costConstrainedEdgeAssistant } from "./costConstrainedEdgeAssistant";

export type {
  CapacityEstimate,
  OptimalSolution,
  Scenario,
  ScenarioConstraint,
  ScenarioEntity,
  ScenarioMetric,
  ScenarioReflection,
  ScenarioTopic,
} from "./types";
export { resolveReflection, SCENARIO_TOPIC_LABEL } from "./types";
export type { ConstraintResult, ScenarioEvaluation } from "./validator";
export { evaluateConstraint, evaluateScenario } from "./validator";

/** Catalogue of every scenario, ordered by difficulty — more as SCENARIOS.md's catalogue is built out. */
export const SCENARIOS: Scenario[] = [
  internalAdminDashboard,
  urlShortener,
  recipeOfTheDay,
  newsletterSendConfirmations,
  movieTicketBooking,
  trendingHashtagsFeed,
  iotSensorIngestion,
  concertTicketDrop,
  priceAlertNotifications,
  weatherForecastApi,
  warehouseInventorySync,
  adAuctionBidding,
  slowSearchEndpoint,
  checkoutTimeoutMystery,
  publicTransitTrackerApi,
  flashSale,
  parkingReservationPlatform,
  liveSportsScoreboard,
  rideHailingLocationPings,
  viralVideoComments,
  flightStatusPushUpdates,
  couponCodeRedemption,
  fitnessTrackerStepSync,
  apiGatewaySlowdown,
  trendingProductSearch,
  globalLeaderboardUpdates,
  wildfireAlertBroadcast,
  // docs/Agentic_AI.md Part 4 — the agentic domain's own scenario set.
  customerSupportAgent,
  codingAgent,
  researchAssistant,
  autonomousOpsAgent,
  costConstrainedEdgeAssistant,
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
