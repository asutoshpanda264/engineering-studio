import { create } from "zustand";

interface QuestProgressState {
  completedLessonIds: string[];
  markLessonComplete: (lessonId: string) => void;
}

/**
 * Which Quest lessons have been completed *this session* — nothing
 * more. In-memory only, no persistence middleware: a reload resets it,
 * same as the rest of the prototype's constraints (no persistent XP,
 * no DB-backed progress — see docs-game/CLAUDE.md §2). Introduced now,
 * not earlier, because milestone 8 (completion marking the map) is the
 * first point session-wide state across `/quest/*` routes is actually
 * needed — see §7's own note that this store shouldn't exist before
 * that's true.
 */
export const useQuestProgressStore = create<QuestProgressState>((set) => ({
  completedLessonIds: [],
  markLessonComplete: (lessonId) =>
    set((state) =>
      state.completedLessonIds.includes(lessonId)
        ? state
        : { completedLessonIds: [...state.completedLessonIds, lessonId] }
    ),
}));
