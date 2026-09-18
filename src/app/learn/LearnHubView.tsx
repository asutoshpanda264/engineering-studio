"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Boxes, Compass, Shapes } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";
import { ReadingRoomBadge } from "@/components/readingRoom/ReadingRoomBadge";
import { getTrackAccent, TRACK_ACCENTS, TRACK_ACCENTS_DARK } from "@/components/foundations/trackAccent";

// A component reference (`LucideIcon`) can't cross the server->client props
// boundary (React rejects passing functions to Client Components — see
// `Card.tsx`'s own doc comment for the same constraint in the other
// direction). `page.tsx` (server) passes a plain `icon` key instead of the
// component itself; this client-only lookup resolves it locally.
const ROOM_ICONS = { BookOpen, Shapes, Boxes, Bot, Compass } satisfies Record<string, LucideIcon>;
type RoomIconKey = keyof typeof ROOM_ICONS;

interface Room {
  href: string;
  icon: RoomIconKey;
  title: string;
  outcome: string;
  meta: string;
}

/**
 * `/learn`'s body — a client component (needs `useTheme()` for per-room
 * accent color), unlike the old `page.tsx` this replaces (a server
 * component with a static grid, theme-blind). `page.tsx` stays server-side
 * purely for its `metadata` export and for reading the content arrays'
 * lengths, same split `FoundationsIndexView`/`AgenticIndexView`/etc.
 * already use.
 *
 * The hero used to end in a "Continue: <lesson>"/"Start with Foundations"
 * CTA driven by `useFoundationsProgress()` — dropped per direct feedback
 * that it read as an odd, unpaired button once `RoomPath` grew titles and
 * took over its old spot in the button row. Each room already has two
 * strong entry points below it (`RoomPath`'s own labeled icon, `RoomCard`'s
 * "Explore" chip), and the header's "Enter Workshop" button covers the
 * other cross-cutting action — a hub for five equal-weight rooms doesn't
 * need a sixth, Foundations-specific shortcut competing with them.
 */
export function LearnHubView({ rooms }: { rooms: Room[] }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <main className="relative isolate flex min-h-screen flex-col bg-workspace-bg">
      <AppHeader
        back={{ href: "/", label: "Engineering Studio" }}
        className="!bg-workspace-bg/90"
        right={
          <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
            Enter Workshop
          </LinkButton>
        }
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* `fixed`, not `absolute` — this div used to be sized to (and
            scroll away with) the hero+cards container below it, since
            `absolute inset-0` is just as tall as its positioned ancestor's
            own content. `main`'s own `isolate` (see its className) is what
            makes a `fixed -z-10` child here safe: without it, this would
            escape to the page's root stacking context and sink below
            `main`'s own opaque background fill instead of just below the
            page's content — see `FoundationsIndexView`'s identical `main`
            comment for the fuller reasoning this mirrors. */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <SystemMeshBackground />
        </div>

        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pt-16 pb-8 text-center sm:pt-20">
          <Badge variant="primary" className="!border-workspace-accent/50 !bg-workspace-accent/10 !text-workspace-accent">
            Five reading rooms
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-workspace-text sm:text-4xl">
            Learn systems design by building it
          </h1>
          <p className="max-w-xl text-balance text-workspace-text-muted">
            Read the theory here, then go prove it to yourself in the Workshop — five rooms,
            each one a different layer of the same skill.
          </p>
          <RoomPath rooms={rooms} isLight={isLight} />
        </section>

        <section className="relative z-10 mx-auto grid w-full max-w-5xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <RoomCard key={room.href} room={room} index={index} isLight={isLight} />
          ))}
        </section>
      </div>
    </main>
  );
}

/**
 * A miniature version of `ReadingRoomAtlas`'s `PhaseStepper` idea, sized for
 * a hero rather than a full progress bar — five room icons in course order,
 * each labeled with its title and joined by a hairline, each in that room's
 * own accent, each a real link. Not tied to completion state (unlike the
 * stepper it borrows the shape from) — there's no single "progress through
 * five independent rooms" the way there is through one room's sequential
 * tracks, so this is purely the "here's the order, here's how they connect"
 * cue the brief asked for. Sits where the hero's two buttons used to (the
 * "Open the Workshop" button was redundant with the header's own one; the
 * remaining CTA moved here briefly, then got dropped entirely — see this
 * file's own doc comment) — the room titles are worth surfacing at the top
 * of the page, not left implicit in five unlabeled dots, and this is now
 * the hero's one interactive element below the fold of the copy.
 */
function RoomPath({ rooms, isLight }: { rooms: Room[]; isLight: boolean }) {
  return (
    <div className="mt-2 flex items-start">
      {rooms.map((room, index) => {
        const accent = (isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[getTrackAccent(index)];
        const Icon = ROOM_ICONS[room.icon];
        return (
          <div key={room.href} className="flex items-start">
            <Link href={room.href} className="group flex flex-col items-center gap-2" aria-label={room.title}>
              <span
                className={`flex size-10 items-center justify-center rounded-full transition-transform duration-fast ease-standard group-hover:scale-110 ${accent.soft} ${accent.text}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="max-w-20 text-center font-mono text-[11px] font-semibold uppercase tracking-wide text-workspace-text sm:max-w-24">
                {room.title}
              </span>
            </Link>
            {index < rooms.length - 1 && (
              <span aria-hidden className={`mx-1.5 mt-5 h-px w-4 shrink-0 sm:w-8 ${accent.lineFaint}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoomCard({ room, index, isLight }: { room: Room; index: number; isLight: boolean }) {
  const accent = (isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[getTrackAccent(index)];
  const Icon = ROOM_ICONS[room.icon];

  return (
    <Link
      href={room.href}
      className="group relative flex flex-col gap-4 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-5 shadow-[var(--shadow-workspace-card)] transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-[var(--shadow-workspace-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <ReadingRoomBadge icon={Icon} accent={accent} />
        <span
          className={`inline-flex items-center rounded-md border border-white/25 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ${accent.solid}`}
        >
          {`Room ${String(index + 1).padStart(2, "0")}`}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="text-lg font-semibold text-workspace-text">{room.title}</h3>
        <p className="text-sm leading-relaxed text-workspace-text-muted">{room.outcome}</p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle">{room.meta}</span>
        {/* Always-visible (not hover-reveal, unlike `Card.tsx`'s equivalent
            arrow) — the brief's "strong entry action" per room, styled as
            a small filled chip rather than a second nested link/button
            (this whole card is already one `<Link>`; a real `<button>`
            or second `<a>` here would either nest interactive elements or
            need a stretched-link z-index workaround for no real benefit). */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${accent.soft} ${accent.text}`}
        >
          Explore
          <ArrowRight
            className="size-3 shrink-0 transition-transform duration-fast ease-standard group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}
