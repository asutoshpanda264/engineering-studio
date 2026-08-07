"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useFailureDemoStore } from "@/store/failureDemoStore";

/** Same shape as the Workshop's PlaybackControls.tsx, bound to useFailureDemoStore instead. */
const SPEED_OPTIONS = [0.5, 1, 2, 4];

export function FailureDemoPlaybackBar() {
  const playbackState = useFailureDemoStore((s) => s.playbackState);
  const simulationError = useFailureDemoStore((s) => s.simulationError);
  const play = useFailureDemoStore((s) => s.play);
  const pause = useFailureDemoStore((s) => s.pause);
  const seek = useFailureDemoStore((s) => s.seek);
  const setPlaybackSpeed = useFailureDemoStore((s) => s.setPlaybackSpeed);

  if (!playbackState || simulationError) return null;

  const { currentTime, duration, speed, playing } = playbackState;

  return (
    <div className="flex flex-1 items-center gap-3 border-r border-border px-4">
      <button
        type="button"
        onClick={() => (playing ? pause() : play())}
        aria-label={playing ? "Pause" : "Play"}
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-panel text-text transition-colors duration-fast ease-standard hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>

      <button
        type="button"
        onClick={() => seek(0)}
        aria-label="Restart playback"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-fast ease-standard hover:bg-bg-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
      >
        <RotateCcw className="size-4" aria-hidden />
      </button>

      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-text-subtle">
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={1}
        value={currentTime}
        disabled={duration === 0}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Playback position"
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        className="h-1.5 flex-1 accent-primary disabled:opacity-50"
      />

      <span className="w-14 shrink-0 text-xs tabular-nums text-text-subtle">
        {formatTime(duration)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Playback speed">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPlaybackSpeed(option)}
            aria-pressed={speed === option}
            className={`rounded-md px-1.5 py-1 text-xs font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated ${
              speed === option
                ? "bg-primary/15 text-primary"
                : "text-text-subtle hover:bg-bg-panel hover:text-text"
            }`}
          >
            {option}x
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
