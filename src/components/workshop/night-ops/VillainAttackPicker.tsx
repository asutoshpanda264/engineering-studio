"use client";

import { Skull } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useWorkshopStore } from "@/store/workshopStore";
import { VILLAIN_ATTACKS, getVillainAttack, type VillainAttackId } from "@/content/workshop/villainAttacks";

function isVillainAttackId(value: string): value is VillainAttackId {
  return VILLAIN_ATTACKS.some((attack) => attack.id === value);
}

/**
 * "Batman Mode" (`night-ops`)-only control that loads one of the three
 * villain attacks (see content/workshop/villainAttacks.ts) onto the next
 * `runSimulation()` call — a Batman-flavored reskin of load/chaos
 * testing: pick an attack, hit Run, see whether the architecture holds
 * up under it. `workshopStore.runSimulation` reads `activeVillainAttackId`
 * directly, so this component only ever writes that one field — it
 * doesn't touch the canvas or the run itself.
 *
 * Self-contained (reads theme + store directly, like ThemeToggle and
 * TimedChallengeBar) so WorkshopHeader doesn't need a new prop threaded
 * through WorkshopShell just for this. Renders nothing outside night-ops.
 */
export function VillainAttackPicker() {
  const { theme } = useTheme();
  const activeVillainAttackId = useWorkshopStore((s) => s.activeVillainAttackId);
  const setVillainAttack = useWorkshopStore((s) => s.setVillainAttack);

  if (theme !== "night-ops") return null;

  const armed = activeVillainAttackId !== null;
  const activeAttack = activeVillainAttackId ? getVillainAttack(activeVillainAttackId) : null;

  return (
    <div className="relative shrink-0">
      <select
        value={activeVillainAttackId ?? ""}
        onChange={(event) => {
          const { value } = event.target;
          setVillainAttack(value && isVillainAttackId(value) ? value : null);
        }}
        aria-label="Load a villain attack onto the next run"
        title={activeAttack ? `${activeAttack.name} — ${activeAttack.description}` : "Load a villain attack onto the next run"}
        className={`h-8 appearance-none border bg-bg-elevated py-0 pl-7 pr-3 text-xs font-medium uppercase tracking-wide transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          armed
            ? "border-signal text-signal"
            : "border-signal/40 text-text-muted hover:border-signal hover:text-signal"
        }`}
      >
        <option value="">No Attack</option>
        {VILLAIN_ATTACKS.map((attack) => (
          <option key={attack.id} value={attack.id}>
            {attack.name} — {attack.tag}
          </option>
        ))}
      </select>
      <Skull
        className={`pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 ${armed ? "text-signal" : "text-signal/60"}`}
        aria-hidden
      />
    </div>
  );
}
