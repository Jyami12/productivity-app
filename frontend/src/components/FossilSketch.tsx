import { useState } from "react";
import { SOURCED_ART, type ArtStyle } from "../data/fossilArtwork";

// Original decorative vector sketches, not scientific reconstructions.
// Rendered locally: no image service, API key, or new dependency is required.
type Point = [number, number];
const bone = "#fbf8ec";

function Bone({ a, b, width = 8 }: { a: Point; b: Point; width?: number }) {
  return (
    <g strokeLinecap="round">
      <path d={`M${a} L${b}`} stroke="currentColor" strokeWidth={width + 3} />
      <path d={`M${a} L${b}`} stroke={bone} strokeWidth={width} />
      {[a, b].map(([x, y], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx={width * 0.65}
          ry={width * 0.5}
          fill={bone}
          stroke="currentColor"
          strokeWidth="1.6"
        />
      ))}
    </g>
  );
}
function Spine({ points, size = 7 }: { points: Point[]; size?: number }) {
  const segments: { x: number; y: number; angle: number }[] = [];
  points.slice(1).forEach((p, i) => {
    const a = points[i],
      length = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const count = Math.max(1, Math.ceil(length / (size * 1.45)));
    for (let k = 0; k < count; k++)
      segments.push({
        x: a[0] + ((p[0] - a[0]) * k) / count,
        y: a[1] + ((p[1] - a[1]) * k) / count,
        angle: (Math.atan2(p[1] - a[1], p[0] - a[0]) * 180) / Math.PI,
      });
  });
  return (
    <g fill={bone} stroke="currentColor" strokeWidth="1.5">
      <polyline
        points={points.map((p) => p.join(",")).join(" ")}
        fill="none"
        strokeWidth="2"
      />
      {segments.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}>
          <path d={`M-2 -${size / 2} L0 -${size + 3} L3 -${size / 2}`} />
          <rect x={-size / 2} y={-size / 2} width={size} height={size} rx="2" />
          <path d={`M0 ${size / 2} L2 ${size}`} />
        </g>
      ))}
    </g>
  );
}
function Ribs({
  x = 260,
  y = 142,
  count = 11,
  width = 105,
  depth = 90,
}: {
  x?: number;
  y?: number;
  count?: number;
  width?: number;
  depth?: number;
}) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      {Array.from({ length: count }, (_, i) => {
        const px = x + (i * width) / count,
          py = y - Math.sin((i / count) * Math.PI) * 9;
        const d = depth * (0.55 + Math.sin((i / count) * Math.PI) * 0.45);
        return (
          <path
            key={i}
            d={`M${px} ${py} C${px - 20} ${py + d * 0.5},${px - 13} ${py + d},${px + 16} ${py + d} C${px - 5} ${py + d - 9},${px - 10} ${py + d * 0.5},${px + 4} ${py + 4}`}
            fill={bone}
          />
        );
      })}
    </g>
  );
}
function Foot({
  x,
  y,
  flipped = false,
}: {
  x: number;
  y: number;
  flipped?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flipped ? -1 : 1} 1)`}>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <Bone a={[0, -5]} b={[22 + i * 6, i * 6]} width={3} />
          <path
            d={`M${22 + i * 6} ${i * 6 - 2} l11 3 -10 3Z`}
            fill={bone}
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </g>
      ))}
    </g>
  );
}
function Skull({
  x,
  y,
  scale = 1,
  long = false,
}: {
  x: number;
  y: number;
  scale?: number;
  long?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke="currentColor"
      strokeWidth="2"
      fill={bone}
    >
      <path
        d={
          long
            ? "M0 10 Q20 -12 41 5 L112 18 117 30 34 33 9 40Z"
            : "M0 9 Q18 -12 48 -4 L76 9 81 30 48 38 15 34 1 44Z"
        }
      />
      <ellipse cx="21" cy="12" rx="10" ry="11" fill="currentColor" />
      <path
        d={long ? "M40 11 72 21 39 25Z" : "M43 8 66 16 42 25Z"}
        fill="currentColor"
      />
      <path
        d={long ? "M9 42 112 35 103 45 39 51Z" : "M8 42 78 32 67 46 28 53Z"}
      />
      {Array.from({ length: long ? 14 : 9 }, (_, i) => (
        <path key={i} d={`M${31 + i * 5} 33 l2 7 2 -7`} strokeWidth="1" />
      ))}
      <path
        d="M5 1 12 6 M30 -1 35 5 M8 28 14 31 M31 43 39 47"
        strokeWidth="1"
      />
    </g>
  );
}
function Theropod({ id }: { id: string }) {
  const raptor = id === "velociraptor",
    spino = id === "spinosaurus";
  return (
    <g>
      <Spine
        points={[
          [38, 219],
          [112, 202],
          [185, 174],
          [252, 137],
          [317, 133],
          [370, 149],
          [410, 120],
          [430, 80],
        ]}
      />
      {spino && (
        <g fill={bone} stroke="currentColor" strokeWidth="2">
          {Array.from({ length: 13 }, (_, i) => {
            const x = 226 + i * 12,
              top = 110 - Math.sin((i / 12) * Math.PI) * 82;
            return (
              <path
                key={i}
                d={`M${x} 143 L${x - 2} ${top} Q${x + 2} ${top - 9} ${x + 4} ${top} L${x + 6} 143Z`}
              />
            );
          })}
        </g>
      )}
      <Ribs x={270} y={143} width={100} depth={raptor ? 72 : 87} />
      <path
        d="M249 132 Q222 146 235 176 L266 187 288 157 270 139Z M247 170 L264 222 275 215 267 173"
        fill={bone}
        stroke="currentColor"
        strokeWidth="2"
      />
      <g opacity=".48">
        <Bone a={[259, 177]} b={[291, 235]} width={12} />
        <Bone a={[291, 235]} b={[264, 288]} width={7} />
        <Foot x={264} y={291} />
      </g>
      <Bone a={[244, 174]} b={[212, 231]} width={15} />
      <Bone a={[212, 231]} b={[236, 284]} width={9} />
      <Bone a={[226, 235]} b={[244, 280]} width={3} />
      <Foot x={236} y={294} />
      {raptor && (
        <path
          d="M256 291 Q262 263 277 269 Q262 278 268 295Z"
          fill={bone}
          stroke="currentColor"
          strokeWidth="2"
        />
      )}
      <Bone a={[365, 155]} b={[raptor ? 408 : 390, 195]} width={6} />
      <Bone
        a={[raptor ? 408 : 390, 195]}
        b={[raptor ? 446 : 418, 188]}
        width={4}
      />
      <path
        d="M418 188 l18 6 7 -5 M418 192 l15 9 6 -3 M414 195 l15 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <Skull x={421} y={64} scale={raptor ? 0.85 : 1.1} long={spino} />
    </g>
  );
}
function Quadruped({ id }: { id: string }) {
  const sauropod = id === "brachiosaurus",
    stego = id === "stegosaurus",
    anky = id === "ankylosaurus";
  return (
    <g>
      <g opacity=".45">
        <Bone a={[268, 198]} b={[258, 260]} width={10} />
        <Bone a={[258, 260]} b={[275, 292]} width={7} />
        <Foot x={275} y={295} />
        <Bone a={[389, 191]} b={[405, 246]} width={10} />
        <Bone a={[405, 246]} b={[399, 293]} width={7} />
        <Foot x={399} y={295} />
      </g>
      <Spine
        points={
          sauropod
            ? [
                [35, 231],
                [128, 183],
                [221, 146],
                [297, 134],
                [369, 144],
                [398, 108],
                [427, 55],
                [452, 25],
              ]
            : [
                [37, 218],
                [112, 188],
                [218, 140],
                [297, 132],
                [371, 145],
                [419, 176],
                [449, 181],
              ]
        }
      />
      {stego && (
        <g stroke="currentColor" strokeWidth="2" fill={bone}>
          {Array.from({ length: 10 }, (_, i) => {
            const x = 134 + i * 27,
              y = 174 - Math.sin((i / 10) * Math.PI) * 41,
              h = 24 + Math.sin((i / 10) * Math.PI) * 48;
            return (
              <path
                key={i}
                d={`M${x} ${y} l-9 -${h * 0.7} 16 -${h * 0.3} 15 ${h * 0.65} -9 ${h * 0.35}Z M${x + 9} ${y - 8} l-2 -${h * 0.55}`}
              />
            );
          })}
          <path d="M65 206 40 170 79 201 M95 194 84 151 110 188" />
        </g>
      )}
      {anky && (
        <g fill={bone} stroke="currentColor" strokeWidth="2">
          <path d="M28 210 C0 184 0 230 21 237 C45 244 59 219 28 210Z" />
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d={`M${201 + (i % 8) * 25} ${143 + Math.floor(i / 8) * 22} l10 -15 14 15 -12 8Z`}
            />
          ))}
        </g>
      )}
      <Ribs x={245} y={145} width={134} depth={82} />
      <path
        d="M232 140 213 159 224 184 251 192 266 169 250 145Z M368 151 355 187 369 208 385 181Z"
        fill={bone}
        stroke="currentColor"
        strokeWidth="2"
      />
      <Bone a={[230, 182]} b={[213, 243]} width={14} />
      <Bone a={[213, 243]} b={[224, 290]} width={9} />
      <Foot x={224} y={294} />
      <Bone a={[374, 190]} b={[366, 244]} width={12} />
      <Bone a={[366, 244]} b={[377, 290]} width={8} />
      <Foot x={377} y={294} />
      {id === "triceratops" ? (
        <g fill={bone} stroke="currentColor" strokeWidth="2">
          <path d="M421 177 Q390 111 430 111 Q461 111 466 155 L508 182 514 200 484 213 446 201Z" />
          <path d="M448 157 481 112 467 171 M464 169 502 134 481 180 M498 184 525 161 515 195 M482 210 511 202" />
          <ellipse cx="460" cy="184" rx="8" ry="9" fill="currentColor" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M${414 + i * 8} ${125 + i * 4} l8 21`}
              strokeWidth="1"
            />
          ))}
        </g>
      ) : (
        <Skull
          x={sauropod ? 449 : 447}
          y={sauropod ? 18 : 169}
          scale={sauropod ? 0.48 : 0.6}
        />
      )}
    </g>
  );
}
function SeaLife({ id }: { id: string }) {
  if (id === "ammonite")
    return (
      <g transform="translate(315 174)" fill="none" stroke="currentColor">
        <path
          d="M105 45 C159 -61 69 -137 -26 -115 C-119 -94 -147 21 -93 100 C-40 178 91 150 143 67 L102 39 C68 111 -21 119 -58 65 C-96 10 -72 -62 -19 -75 C40 -90 85 -47 65 2 C48 42 3 54 -23 26 C-45 3 -27 -31 -2 -27 C16 -24 24 -6 9 5"
          fill={bone}
          strokeWidth="3"
        />
        {Array.from({ length: 31 }, (_, i) => {
          const t = (i / 31) * Math.PI * 1.88 - 1.9;
          const r = 105 + i * 0.7;
          return (
            <path
              key={i}
              d={`M${Math.cos(t) * r} ${Math.sin(t) * r} Q${Math.cos(t + 0.08) * (r - 18)} ${Math.sin(t + 0.08) * (r - 18)} ${Math.cos(t + 0.12) * (r - 36)} ${Math.sin(t + 0.12) * (r - 36)}`}
              strokeWidth="1.5"
            />
          );
        })}
      </g>
    );
  if (id === "trilobite")
    return (
      <g fill={bone} stroke="currentColor" strokeWidth="2">
        <path d="M320 41 C239 37 225 109 237 203 Q247 285 320 310 Q393 285 403 203 C415 109 401 37 320 41Z" />
        {Array.from({ length: 15 }, (_, i) => {
          const y = 91 + i * 13,
            w = 76 - Math.max(0, i - 7) * 7;
          return (
            <path
              key={i}
              d={`M${320 - w} ${y} Q320 ${y - 14} ${320 + w} ${y} M${320 - w} ${y} l-10 10 M${320 + w} ${y} l10 10 M304 ${y - 5} Q320 ${y - 13} 336 ${y - 5} l-2 11 Q320 ${y + 4} 306 ${y + 6}Z`}
            />
          );
        })}
        <path d="M255 91 Q320 30 385 91 M297 68 Q320 50 343 68 L340 85 300 85Z" />
        <ellipse cx="274" cy="81" rx="8" ry="11" fill="currentColor" />
        <ellipse cx="366" cy="81" rx="8" ry="11" fill="currentColor" />
      </g>
    );
  return (
    <g>
      <Spine
        points={[
          [38, 240],
          [141, 211],
          [228, 168],
          [311, 149],
          [381, 166],
          [423, 125],
          [451, 68],
          [477, 47],
        ]}
        size={6}
      />
      <Ribs x={245} y={161} width={133} depth={65} />
      <Skull x={474} y={34} scale={0.55} />
      {[
        [260, 179, 182, 270],
        [343, 188, 402, 278],
        [267, 162, 204, 86],
        [341, 156, 385, 91],
      ].map(([x, y, tx, ty], i) => (
        <g key={i}>
          <Bone a={[x, y]} b={[(x + tx) / 2, (y + ty) / 2]} width={9} />
          {[0, 1, 2, 3, 4].map((j) => (
            <Bone
              key={j}
              a={[(x + tx) / 2, (y + ty) / 2]}
              b={[tx + j * 5, ty + j * 3]}
              width={3}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
function FlyingReptile() {
  return (
    <g>
      <Spine
        points={[
          [313, 240],
          [320, 186],
          [322, 128],
          [337, 98],
        ]}
        size={6}
      />
      <Ribs x={302} y={157} width={38} depth={42} count={6} />
      <g fill={bone} stroke="currentColor" strokeWidth="2">
        <path d="M332 94 315 41 354 79 399 100 348 106Z" />
        <circle cx="348" cy="92" r="4" fill="currentColor" />
      </g>
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(320 165) scale(${side} 1)`}>
          <Bone a={[4, 0]} b={[75, -38]} width={7} />
          <Bone a={[75, -38]} b={[136, -63]} width={5} />
          <Spine
            points={[
              [136, -63],
              [205, -58],
              [272, -31],
            ]}
            size={5}
          />
          <path
            d="M137 -62 Q117 42 28 63 M205 -58 Q176 43 28 63"
            fill="none"
            stroke="currentColor"
            strokeDasharray="4 6"
            opacity=".35"
          />
          <Bone a={[2, 54]} b={[28, 96]} width={5} />
          <Bone a={[28, 96]} b={[23, 133]} width={4} />
          <Foot x={23} y={135} />
        </g>
      ))}
    </g>
  );
}
function Mammoth() {
  return (
    <g>
      <Quadruped id="mammoth-body" />
      <g fill={bone} stroke="currentColor" strokeWidth="2">
        <path d="M412 170 Q396 100 436 85 Q484 87 489 145 L476 188 452 199 421 182Z" />
        <ellipse cx="451" cy="139" rx="12" ry="15" fill="currentColor" />
        <path d="M470 176 C508 252 553 230 544 192 C542 218 516 227 481 171Z M453 186 C474 267 535 265 549 230 C517 253 483 230 463 182Z" />
      </g>
    </g>
  );
}
export default function FossilSketch({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 360"
      aria-hidden="true"
      focusable="false"
    >
      <g opacity=".14" stroke="currentColor" strokeWidth="1" fill="none">
        <path d="M30 42V24H48 M592 24h18v18 M30 318v18h18 M592 336h18v-18 M77 319H563" />
        {Array.from({ length: 25 }, (_, i) => (
          <path key={i} d={`M${80 + i * 20} 319v${i % 5 === 0 ? 8 : 4}`} />
        ))}
      </g>
      <g>
        {["trex", "velociraptor", "spinosaurus"].includes(id) ? (
          <Theropod id={id} />
        ) : [
            "stegosaurus",
            "triceratops",
            "brachiosaurus",
            "ankylosaurus",
          ].includes(id) ? (
          <Quadruped id={id} />
        ) : id === "pteranodon" ? (
          <FlyingReptile />
        ) : id === "mammoth" ? (
          <Mammoth />
        ) : (
          <SeaLife id={id} />
        )}
      </g>
    </svg>
  );
}

export function FossilIllustration({
  id,
  style = "sketch",
  className = "",
}: {
  id: string;
  style?: ArtStyle;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const art = SOURCED_ART[id];
  if (style !== "archive" || !art || failed)
    return <FossilSketch id={id} className={className} />;
  return (
    <img
      className={`${className} fm-archive-image`}
      src={art.url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
