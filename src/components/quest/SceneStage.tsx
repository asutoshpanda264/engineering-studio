import { useCallback, useReducer } from "react";

type SceneStageAction = { type: "advance" } | { type: "goTo"; index: number };

/**
 * A lesson's internal stage machine — advances linearly through a fixed
 * sequence of named beats (e.g. `["intro", "concept", "question"]`)
 * with local state only, no routing between them. Generic over the
 * stage names so each lesson defines its own sequence/length; this file
 * only owns "what stage am I on, how do I move forward."
 *
 * Named `SceneStage.tsx` (not `useSceneStage.ts`) to match the
 * component named in docs-game/CLAUDE.md's table — it's a hook, not a
 * rendered component, but it fills the same architectural role
 * documented there.
 */
export function useSceneStage<T extends string>(stages: readonly T[]) {
  const [index, dispatch] = useReducer((current: number, action: SceneStageAction) => {
    switch (action.type) {
      case "advance":
        return Math.min(current + 1, stages.length - 1);
      case "goTo":
        return Math.max(0, Math.min(action.index, stages.length - 1));
      default:
        return current;
    }
  }, 0);

  // `dispatch` is reference-stable by React's own guarantee; wrapping
  // these in `useCallback` too means a consumer can safely put
  // `scene.advance`/`scene.goTo` in a `useEffect` dependency array
  // without the effect re-firing on every unrelated render.
  const advance = useCallback(() => dispatch({ type: "advance" }), []);
  const goTo = useCallback(
    (target: T) => {
      const targetIndex = stages.indexOf(target);
      if (targetIndex !== -1) dispatch({ type: "goTo", index: targetIndex });
    },
    [stages]
  );

  return {
    stage: stages[index],
    index,
    isFirst: index === 0,
    isLast: index === stages.length - 1,
    advance,
    goTo,
  };
}
