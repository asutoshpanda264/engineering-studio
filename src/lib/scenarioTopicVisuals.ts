import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Bot,
  Copy,
  Database,
  Gauge,
  GitBranch,
  Globe,
  Network,
  Route,
  Scale,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  Waves,
  Wrench,
} from "lucide-react";
import { SCENARIO_TOPIC_LABEL } from "@/scenarios";
import type { ScenarioTopic } from "@/scenarios";
import { getTrackAccent, TRACK_ACCENTS, TRACK_ACCENTS_DARK, type TrackAccentClasses } from "@/components/foundations/trackAccent";

/**
 * One plain icon per topic, purely decorative (a card's accent chip) — same
 * "one icon per group" restraint `readingRoom/types.ts` documents for its
 * own per-category icons rather than a bespoke glyph per scenario.
 *
 * Originally lived only in `/problems`' `page.tsx`; pulled out here once the
 * landing page needed the same "topic -> icon -> track color" mapping for
 * its scenario teaser cards — a second hand-copied 16-entry table would
 * have drifted from this one the first time a topic was added.
 */
export const TOPIC_ICON: Record<ScenarioTopic, LucideIcon> = {
  "load-balancing": Scale,
  caching: Database,
  cdn: Globe,
  "rate-limiting": Gauge,
  "circuit-breakers": ShieldAlert,
  "message-queues": ArrowLeftRight,
  kafka: Waves,
  replication: Copy,
  "reverse-proxy": Route,
  "system-design": Network,
  "tool-use": Wrench,
  "human-in-the-loop": UserCheck,
  retrieval: Search,
  "multi-agent-orchestration": Users,
  "model-routing": GitBranch,
  "agentic-system-design": Bot,
};

const ALL_TOPICS = Object.keys(SCENARIO_TOPIC_LABEL) as ScenarioTopic[];

/**
 * Resolved icon-chip classes for a scenario's primary topic, keyed off that
 * topic's fixed position in `SCENARIO_TOPIC_LABEL` and cycled through the
 * five-hue `trackAccent` palette — the same "one color per index" convention
 * `/learn`'s `RoomCard` and `/problems`' `ScenarioCard` already use, so a
 * given topic reads as the same color everywhere it shows up.
 */
export function getTopicAccentClasses(topic: ScenarioTopic, isLight: boolean): TrackAccentClasses {
  const accent = getTrackAccent(ALL_TOPICS.indexOf(topic));
  return (isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[accent];
}
