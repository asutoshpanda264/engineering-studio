import type { MascotSkinProps, MascotState } from "../mascotStates";

/*
 * "Sparky" — the prototype mascot skin.
 *
 * An original silhouette (rounded body, two ears with dark tips, cheek
 * marks, a tail) inspired by the brief's Pikachu-style reference without
 * reproducing actual Pokémon artwork — see docs-game/CLAUDE.md §6.1 for
 * the reasoning and the open question on whether to lean more literal.
 * `Mascot` only ever reaches this file through the `MascotSkin` contract
 * in `../mascotStates` — nothing outside this file/folder knows the
 * character's shape is drawn as SVG shapes with an expression table.
 */

type EyeStyle = "dot" | "happy-arc" | "wide" | "star";
type MouthStyle = "smile" | "open-smile" | "flat" | "wavy" | "o" | "cheer";
type BrowStyle = "none" | "raised" | "worried" | "asymmetric";
type AccessoryStyle =
  | "none"
  | "thought-dots"
  | "sparkles"
  | "question-mark"
  | "sweat-drop"
  | "exclamation";

interface Expression {
  eyes: EyeStyle;
  mouth: MouthStyle;
  brow: BrowStyle;
  accessory: AccessoryStyle;
}

/** One row per `MascotState` — the whole face is a lookup, not eight
    hand-drawn SVGs, so adding/tweaking an expression means editing data
    here rather than markup below. */
const EXPRESSIONS: Record<MascotState, Expression> = {
  idle: { eyes: "dot", mouth: "smile", brow: "none", accessory: "none" },
  explaining: { eyes: "dot", mouth: "open-smile", brow: "raised", accessory: "none" },
  thinking: { eyes: "wide", mouth: "flat", brow: "none", accessory: "thought-dots" },
  excited: { eyes: "star", mouth: "cheer", brow: "raised", accessory: "sparkles" },
  happy: { eyes: "happy-arc", mouth: "smile", brow: "none", accessory: "none" },
  confused: { eyes: "dot", mouth: "wavy", brow: "asymmetric", accessory: "question-mark" },
  celebrating: { eyes: "happy-arc", mouth: "cheer", brow: "raised", accessory: "sparkles" },
  warning: { eyes: "wide", mouth: "o", brow: "worried", accessory: "exclamation" },
};

const LEFT_EYE = { x: 78, y: 98 };
const RIGHT_EYE = { x: 122, y: 98 };
const INK = "var(--quest-ink)";

/** Generates an N-pointed star's `points` attribute — used for the
    "star" eye style and the "sparkles" accessory, so both come from one
    shape instead of two separately hand-plotted polygons. */
function starPoints(cx: number, cy: number, outerR: number, innerR: number, spikes = 4): string {
  const points: string[] = [];
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    angle += step;
  }
  return points.join(" ");
}

function Eyes({ style }: { style: EyeStyle }) {
  switch (style) {
    case "happy-arc":
      return (
        <>
          {[LEFT_EYE, RIGHT_EYE].map((eye, i) => (
            <path
              key={i}
              d={`M ${eye.x - 9} ${eye.y + 3} Q ${eye.x} ${eye.y - 8} ${eye.x + 9} ${eye.y + 3}`}
              stroke={INK}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </>
      );
    case "wide":
      return (
        <>
          {[LEFT_EYE, RIGHT_EYE].map((eye, i) => (
            <g key={i}>
              <circle cx={eye.x} cy={eye.y} r={9} fill="white" stroke={INK} strokeWidth={3} />
              <circle cx={eye.x} cy={eye.y - 1} r={4} fill={INK} />
            </g>
          ))}
        </>
      );
    case "star":
      return (
        <>
          {[LEFT_EYE, RIGHT_EYE].map((eye, i) => (
            <polygon key={i} points={starPoints(eye.x, eye.y, 10, 4)} fill={INK} />
          ))}
        </>
      );
    case "dot":
    default:
      return (
        <>
          {[LEFT_EYE, RIGHT_EYE].map((eye, i) => (
            <g key={i}>
              <circle cx={eye.x} cy={eye.y} r={7} fill={INK} />
              <circle cx={eye.x - 2} cy={eye.y - 2} r={2} fill="white" />
            </g>
          ))}
        </>
      );
  }
}

function Mouth({ style }: { style: MouthStyle }) {
  switch (style) {
    case "open-smile":
      return <path d="M 80 142 Q 100 164 120 142 Q 100 152 80 142 Z" fill={INK} />;
    case "flat":
      return <line x1={85} y1={148} x2={115} y2={148} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case "wavy":
      return (
        <path
          d="M 82 146 Q 90 152 98 146 Q 106 140 114 146"
          stroke={INK}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      );
    case "o":
      return <circle cx={100} cy={148} r={7} fill={INK} />;
    case "cheer":
      return <path d="M 76 140 Q 100 172 124 140 Q 100 156 76 140 Z" fill={INK} />;
    case "smile":
    default:
      return (
        <path d="M 82 142 Q 100 158 118 142" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
      );
  }
}

function Brows({ style }: { style: BrowStyle }) {
  if (style === "none") return null;
  if (style === "raised") {
    return (
      <>
        {[LEFT_EYE, RIGHT_EYE].map((eye, i) => (
          <path
            key={i}
            d={`M ${eye.x - 10} ${eye.y - 14} Q ${eye.x} ${eye.y - 20} ${eye.x + 10} ${eye.y - 14}`}
            stroke={INK}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </>
    );
  }
  if (style === "worried") {
    return (
      <>
        <line x1={LEFT_EYE.x - 10} y1={LEFT_EYE.y - 10} x2={LEFT_EYE.x + 8} y2={LEFT_EYE.y - 18} stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <line x1={RIGHT_EYE.x + 10} y1={RIGHT_EYE.y - 10} x2={RIGHT_EYE.x - 8} y2={RIGHT_EYE.y - 18} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      </>
    );
  }
  // asymmetric — one neutral brow, one skeptically raised; reads as
  // "wait, what?" confusion without needing a swirly cartoon eye.
  return (
    <>
      <line x1={LEFT_EYE.x - 9} y1={LEFT_EYE.y - 14} x2={LEFT_EYE.x + 8} y2={LEFT_EYE.y - 14} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <line x1={RIGHT_EYE.x - 9} y1={RIGHT_EYE.y - 11} x2={RIGHT_EYE.x + 9} y2={RIGHT_EYE.y - 21} stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </>
  );
}

function Accessory({ style }: { style: AccessoryStyle }) {
  switch (style) {
    case "thought-dots":
      return (
        <>
          <circle cx={142} cy={72} r={3.5} fill="var(--quest-cream)" stroke={INK} strokeWidth={2} />
          <circle cx={156} cy={56} r={5} fill="var(--quest-cream)" stroke={INK} strokeWidth={2} />
          <circle cx={172} cy={38} r={7} fill="var(--quest-cream)" stroke={INK} strokeWidth={2} />
        </>
      );
    case "sparkles":
      return (
        <>
          <polygon points={starPoints(32, 42, 7, 3)} fill="var(--quest-yellow)" stroke={INK} strokeWidth={1.5} />
          <polygon points={starPoints(168, 36, 6, 2.5)} fill="var(--quest-blue)" stroke={INK} strokeWidth={1.5} />
          <polygon points={starPoints(150, 158, 5, 2)} fill="var(--quest-coral)" stroke={INK} strokeWidth={1.5} />
        </>
      );
    case "question-mark":
      return (
        <text x={144} y={50} fontSize={34} fontWeight={700} fill={INK} style={{ fontFamily: "var(--quest-font-display)" }}>
          ?
        </text>
      );
    case "exclamation":
      return (
        <text x={150} y={50} fontSize={34} fontWeight={700} fill="var(--quest-coral)" style={{ fontFamily: "var(--quest-font-display)" }}>
          !
        </text>
      );
    case "sweat-drop":
      return (
        <path
          d="M 156 34 C 156 34 148 48 148 56 a 8 8 0 1 0 16 0 c 0 -8 -8 -22 -8 -22 Z"
          fill="var(--quest-blue)"
          stroke={INK}
          strokeWidth={2}
        />
      );
    case "none":
    default:
      return null;
  }
}

export function SparkySkin({ state, className }: MascotSkinProps) {
  const expression = EXPRESSIONS[state];
  return (
    <svg viewBox="0 0 200 200" className={className} width="100%" height="100%">
      {/* tail — drawn first so the head paints over its base */}
      <path
        d="M 150 150 C 175 150 185 120 178 95 C 190 110 195 140 175 160 C 168 168 156 166 150 150 Z"
        fill="var(--quest-yellow)"
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {/* ears — same reason, tips protrude above the head silhouette */}
      <polygon points="60,70 35,15 78,50" fill="var(--quest-yellow)" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <polygon points="40,26 35,15 51,33" fill={INK} />
      <polygon points="140,70 165,15 122,50" fill="var(--quest-yellow)" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <polygon points="160,26 165,15 149,33" fill={INK} />
      {/* head/body */}
      <circle cx={100} cy={112} r={62} fill="var(--quest-yellow)" stroke={INK} strokeWidth={6} />
      {/* cheeks */}
      <circle cx={66} cy={130} r={11} fill="var(--quest-coral)" />
      <circle cx={134} cy={130} r={11} fill="var(--quest-coral)" />
      <Brows style={expression.brow} />
      <Eyes style={expression.eyes} />
      <Mouth style={expression.mouth} />
      <Accessory style={expression.accessory} />
    </svg>
  );
}
