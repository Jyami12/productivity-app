import { Bone } from "./FossilBone";

type Point = [number, number];
// Original stylized studies. Geometry is shared where bones have similar forms;
// each specimen has its own silhouette and identifying structures.
function Vertebrae({ points, size = 6 }: { points: Point[]; size?: number }) {
  return (
    <>
      {points.slice(1).flatMap((b, i) => {
        const a = points[i],
          distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const count = Math.max(1, Math.round(distance / (size * 1.6)));
        const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        return Array.from({ length: count }, (_, j) => (
          <g
            key={`${i}-${j}`}
            transform={`translate(${a[0] + ((b[0] - a[0]) * j) / count} ${a[1] + ((b[1] - a[1]) * j) / count}) rotate(${angle})`}
          >
            <path
              d={`M${-size / 2} ${-size / 2} L2 ${-size * 0.7} ${size * 0.7} -1 ${size / 2} ${size / 2} -2 ${size * 0.7} ${-size * 0.7} 1Z M0 ${-size * 0.7} l-2 -${size} 3 -2 3 ${size + 1}`}
            />
          </g>
        ));
      })}
    </>
  );
}
function RibCage({
  x,
  y,
  width = 110,
  depth = 85,
  count = 12,
}: {
  x: number;
  y: number;
  width?: number;
  depth?: number;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const px = x + (i * width) / count,
          py = y - Math.sin((i / count) * Math.PI) * 8,
          d = depth * (0.5 + 0.5 * Math.sin((i / count) * Math.PI));
        return (
          <path
            key={i}
            d={`M${px} ${py} C${px - 18} ${py + 25} ${px - 9} ${py + d - 7} ${px + 19} ${py + d} L${px + 24} ${py + d - 3} C${px} ${py + d - 13} ${px - 8} ${py + 24} ${px + 5} ${py + 3}Z`}
          />
        );
      })}
    </>
  );
}
function Toes({ x, y }: { x: number; y: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${x + i * 7} ${y} l7 -2 13 6 2 5 -13 1 -10 -4Z`} />
      ))}
    </>
  );
}
function Skull({
  x,
  y,
  long = false,
  scale = 1,
}: {
  x: number;
  y: number;
  long?: boolean;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g data-bones="skull">
        <path
          d={
            long
              ? "M0 14L9 1 29 -2 43 8 100 19 109 28 103 38 43 39 22 34 5 43 -3 30Z"
              : "M0 14L8 0 35 -6 62 5 77 22 74 43 49 48 28 42 9 52 -4 32Z"
          }
        />
        <path
          className="fossil-cavity"
          d="M8 15L17 6 27 8 31 20 24 30 12 29 7 22Z"
        />
        <path
          className="fossil-cavity"
          d={long ? "M42 15L81 24 87 29 43 31Z" : "M41 9L59 16 66 29 42 34Z"}
        />
        <path
          d={
            long
              ? "M9 46L30 40 52 45 104 42 99 51 47 56 17 54Z"
              : "M12 56L31 48 52 54 72 49 66 61 35 66 16 63Z"
          }
        />
        {Array.from({ length: long ? 12 : 7 }, (_, i) => (
          <path key={i} d={`M${35 + i * 5} ${long ? 40 : 47} l2 6 2 -6Z`} />
        ))}
        <path className="fossil-etch" d="M31 0L34 7 M3 34L11 38 M25 53L31 58" />
      </g>
    </g>
  );
}
function Theropod({ spino = false }: { spino?: boolean }) {
  return (
    <>
      <Vertebrae
        points={[
          [45, 225],
          [130, 199],
          [217, 163],
          [279, 137],
          [343, 139],
          [389, 154],
          [419, 126],
          [435, 92],
        ]}
      />
      {spino &&
        Array.from({ length: 14 }, (_, i) => {
          const x = 228 + i * 11,
            h = 28 + 75 * Math.sin((i / 13) * Math.PI);
          return (
            <path
              key={i}
              d={`M${x} 144L${x - 3} ${144 - h} ${x + 1} ${139 - h} ${x + 5} ${144 - h} ${x + 6} 144Z`}
            />
          );
        })}
      <RibCage x={277} y={147} width={103} depth={83} />
      <path d="M244 138L266 130 286 146 281 173 257 184 239 164Z M266 174L290 222 299 219 283 174Z" />
      <g opacity=".5">
        <Bone x={270} y={180} length={59} angle={63} width={10} />
        <Bone x={297} y={237} length={53} angle={107} width={6} />
        <Toes x={282} y={295} />
      </g>
      <Bone x={252} y={181} length={63} angle={118} width={13} />
      <Bone x={218} y={241} length={57} angle={65} width={8} />
      <Toes x={244} y={298} />
      <path d="M226 242L252 285 252 294 246 289 220 246Z" />
      <Bone x={382} y={162} length={spino ? 39 : 25} angle={60} width={5} />
      <Bone
        x={spino ? 404 : 395}
        y={spino ? 199 : 188}
        length={spino ? 41 : 25}
        angle={-15}
        width={3}
      />
      <path
        d={
          spino
            ? "M444 189l19 3 7 -5 -4 11 -24 -3Z M441 198l18 9 7 -3 -5 10 -22 -9Z"
            : "M421 181l13 3 5 -4 -2 9 -16 -2Z M418 190l13 8 5 -2 -4 8 -16 -8Z"
        }
      />
      <Skull
        x={430}
        y={spino ? 59 : 48}
        scale={spino ? 1 : 1.25}
        long={spino}
      />
    </>
  );
}
function Quadruped({ id }: { id: string }) {
  const stego = id === "stegosaurus",
    anky = id === "ankylosaurus",
    mammoth = id === "mammoth";
  return (
    <>
      <Vertebrae
        points={
          mammoth
            ? [
                [161, 218],
                [213, 147],
                [270, 112],
                [332, 121],
                [387, 152],
                [424, 168],
              ]
            : [
                [45, 232],
                [130, 204],
                [217, 161],
                [283, 145],
                [350, 150],
                [409, 177],
                [444, 196],
              ]
        }
      />
      {stego &&
        Array.from({ length: 10 }, (_, i) => {
          const x = 143 + i * 27,
            y = 192 - 43 * Math.sin((i / 9) * Math.PI),
            h = 20 + 49 * Math.sin((i / 9) * Math.PI);
          return (
            <g key={i}>
              <path
                d={`M${x} ${y} l-8 -${h * 0.7} 12 -${h * 0.3} 16 ${h * 0.6} -6 ${h * 0.4}Z`}
              />
              <path
                className="fossil-etch"
                d={`M${x + 4} ${y - 7}l-1 -${h * 0.55}`}
              />
            </g>
          );
        })}
      {stego && <path d="M67 219L37 179 78 215Z M101 208L84 163 115 202Z" />}
      {anky && (
        <>
          <path d="M42 223L26 210 9 216 5 230 16 245 35 246 51 232Z" />
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              d={`M${212 + (i % 8) * 24} ${154 + Math.floor(i / 8) * 22} l9 -14 15 12 -10 10Z`}
            />
          ))}
        </>
      )}
      <RibCage
        x={246}
        y={mammoth ? 130 : 160}
        width={137}
        depth={mammoth ? 111 : 72}
      />
      <path d="M222 158L244 150 262 170 250 196 227 199 213 180Z M376 171L363 198 373 222 387 194Z" />
      <g opacity=".5">
        <Bone x={248} y={197} length={55} angle={77} width={8} />
        <Bone x={262} y={255} length={43} angle={82} width={6} />
        <Toes x={268} y={302} />
        <Bone x={393} y={207} length={46} angle={70} width={8} />
        <Bone x={409} y={255} length={43} angle={94} width={6} />
        <Toes x={404} y={302} />
      </g>
      <Bone x={230} y={200} length={54} angle={108} width={11} />
      <Bone x={212} y={258} length={42} angle={80} width={7} />
      <Toes x={220} y={303} />
      <Bone x={373} y={220} length={35} angle={97} width={9} />
      <Bone x={369} y={261} length={39} angle={80} width={7} />
      <Toes x={376} y={303} />
      {id === "triceratops" ? (
        <>
          <path d="M423 193L407 162 411 129 429 116 449 122 465 152 468 181 514 207 520 225 495 238 459 224 440 207Z" />
          <path d="M451 178L485 120 467 189Z M470 192L510 143 487 202Z M508 211L534 184 521 224Z" />
          <path
            className="fossil-cavity"
            d="M450 193L459 187 468 196 462 207 452 205Z"
          />
          <path d="M465 230L490 243 513 231 504 247 481 252 466 242Z" />
          <path
            className="fossil-etch"
            d="M420 143L439 176 M431 132L449 167 M443 137L457 173"
          />
        </>
      ) : mammoth ? (
        <>
          <path d="M422 177L408 141 416 102 438 80 465 83 487 109 489 145 477 178 449 190Z" />
          <path
            className="fossil-cavity"
            d="M445 130L458 120 471 130 467 146 451 150 441 142Z"
          />
          <path d="M464 178C487 258 548 272 571 214C554 242 513 245 477 174Z M447 184C457 261 516 291 551 253C516 276 474 242 459 181Z" />
          <path d="M431 187L443 201 468 199 474 185 464 209 444 217 431 207Z" />
        </>
      ) : (
        <Skull x={443} y={189} scale={anky ? 0.73 : 0.64} />
      )}
    </>
  );
}
function Ammonite() {
  const point = (t: number, r: number) => [
    320 + Math.cos(t) * r,
    177 + Math.sin(t) * r,
  ];
  return (
    <>
      {Array.from({ length: 56 }, (_, i) => {
        const t = i * 0.24,
          n = t + 0.215,
          r = 12 + i * 2.15,
          rn = r + 1.93;
        const a = point(t, r),
          b = point(n, rn),
          c = point(n, Math.max(3, rn - 22)),
          d = point(t, Math.max(3, r - 22));
        return <path key={i} d={`M${a}L${b} ${c} ${d}Z`} />;
      })}
      <path d="M425 235L461 245 468 266 444 293 412 303 392 291Z" />
      <path
        className="fossil-etch"
        d="M432 248L449 260 430 282 M418 267L431 274"
      />
    </>
  );
}
function Trilobite() {
  return (
    <>
      <path d="M230 106L239 73 270 44 320 32 370 44 401 73 410 106 386 121 351 106 289 106 254 121Z" />
      <path d="M292 94L293 63 308 49 332 49 347 63 348 94Z" />
      <path
        className="fossil-cavity"
        d="M260 80L270 71 281 79 277 93 266 96Z M359 79L370 71 380 80 374 96 363 93Z"
      />
      {Array.from({ length: 14 }, (_, i) => {
        const y = 111 + i * 11,
          w = 78 - i * 2.1;
        return (
          <g key={i}>
            <path
              d={`M303 ${y}L${320 - w} ${y + 3} ${310 - w} ${y + 13} ${320 - w} ${y + 10} 303 ${y + 8}Z M337 ${y}L${320 + w} ${y + 3} ${330 + w} ${y + 13} ${320 + w} ${y + 10} 337 ${y + 8}Z`}
            />
            <path
              d={`M306 ${y - 2}L334 ${y - 2} 337 ${y + 5} 332 ${y + 9} 308 ${y + 9} 303 ${y + 5}Z`}
            />
          </g>
        );
      })}
      <path d="M263 270L287 263 353 263 377 270 361 292 337 309 320 316 303 309 279 292Z" />
      <path
        className="fossil-etch"
        d="M284 275L308 300 M299 270L315 303 M356 275L332 300 M341 270L325 303"
      />
    </>
  );
}
function Pteranodon() {
  return (
    <>
      <Vertebrae
        points={[
          [320, 258],
          [317, 211],
          [320, 165],
          [326, 124],
          [341, 96],
        ]}
        size={6}
      />
      <RibCage x={304} y={158} width={35} depth={47} count={6} />
      <path d="M331 94L302 39 342 73 389 91 426 107 357 108 340 105Z M347 113L403 112 377 120 348 121Z" />
      <path
        className="fossil-cavity"
        d="M339 88L346 83 352 90 349 98 342 98Z"
      />
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(320 171) scale(${side} 1)`}>
          <g data-bones="wing">
            <Bone x={9} y={0} length={70} angle={-30} width={7} />
            <Bone x={74} y={-38} length={62} angle={-18} width={5} />
            <Bone x={138} y={-59} length={77} angle={14} width={4} />
            <Bone x={217} y={-40} length={63} angle={26} width={2.5} />
            <path d="M128 -60L133 -76 139 -79 138 -71 135 -58Z M133 -56L146 -68 152 -68 145 -60 137 -52Z" />
          </g>
          <Bone x={7} y={73} length={40} angle={52} width={5} />
          <Bone x={35} y={108} length={39} angle={96} width={3} />
          <Toes x={27} y={152} />
        </g>
      ))}
    </>
  );
}
function Plesiosaurus() {
  return (
    <>
      <Vertebrae
        points={[
          [55, 219],
          [129, 202],
          [218, 181],
          [289, 171],
          [351, 174],
          [401, 149],
          [443, 105],
          [489, 77],
        ]}
        size={6}
      />
      <RibCage x={240} y={181} width={111} depth={65} />
      <Skull x={486} y={59} scale={0.65} long />
      {[
        [250, 200, 202, 282],
        [329, 211, 390, 285],
        [260, 181, 206, 105],
        [331, 178, 385, 108],
      ].map(([x, y, tx, ty], i) => {
        const angle = (Math.atan2(ty - y, tx - x) * 180) / Math.PI;
        return (
          <g key={i}>
            <Bone x={x} y={y} length={39} angle={angle} width={8} />
            {Array.from({ length: 5 }, (_, j) => (
              <g
                key={j}
                transform={`translate(${(x + tx) / 2 + j * 3} ${(y + ty) / 2}) rotate(${angle + j * 5 - 10})`}
              >
                {[0, 1, 2, 3].map((k) => (
                  <path key={k} d={`M${k * 10} -3l7 -1 2 4 -2 3 -7 -1Z`} />
                ))}
              </g>
            ))}
          </g>
        );
      })}
    </>
  );
}
export default function CollectionBones({ id }: { id: string }) {
  if (id === "ammonite") return <Ammonite />;
  if (id === "trilobite") return <Trilobite />;
  if (id === "pteranodon") return <Pteranodon />;
  if (id === "plesiosaurus") return <Plesiosaurus />;
  if (id === "trex" || id === "spinosaurus")
    return <Theropod spino={id === "spinosaurus"} />;
  return <Quadruped id={id} />;
}
