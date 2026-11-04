import { Bone } from "./FossilBone";
import VelociraptorBones from "./VelociraptorBones";
import { useId } from "react";
import "./FossilPlate.css";

export default function FossilPlate({
  className = "",
  id = "brachiosaurus",
}: {
  className?: string;
  id?: string;
}) {
  const uid = useId();
  return (
    <svg
      className={`fossil-plate ${className}`}
      viewBox="0 0 640 360"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={uid} x2="0.4" y2="1">
          <stop stopColor="#f7e8c8" />
          <stop offset="1" stopColor="#bda078" />
        </linearGradient>
      </defs>
      <path
        className="fossil-strata"
        d="M30 294L94 279 128 287 187 269 266 278 356 266 419 281 522 274 609 291 M40 309L129 301 199 311 296 296 411 306 496 294 600 312"
      />
      <g
        data-fossil-drawing="true"
        className="fossil-bones"
        fill={`url(#${uid})`}
      >
        {id === "velociraptor" ? (
          <VelociraptorBones />
        ) : (
          <>
            <g data-bones="tail">
              {Array.from({ length: 20 }, (_, i) => {
                const x = 48 + i * 9,
                  y = 242 - i * 2.4,
                  w = 3 + i * 0.23;
                return (
                  <path
                    key={i}
                    d={`M${x} ${y} l4 -${w} 5 1 1 ${w + 2} -5 3 -4 -1Z M${x + 4} ${y - w} l1 -5 3 5`}
                  />
                );
              })}
            </g>
            <g data-bones="neck">
              {Array.from({ length: 15 }, (_, i) => {
                const x = 229 + i * 9,
                  y = 190 - Math.sin((i / 14) * Math.PI) * 13;
                return (
                  <path
                    key={i}
                    d={`M${x} ${y} l2 -7 6 -1 3 7 -2 7 -7 1Z M${x + 3} ${y - 7} l-1 -10 4 -3 2 12`}
                  />
                );
              })}
              {Array.from({ length: 15 }, (_, i) => {
                const x = 363 + i * 5.5,
                  y = 182 - i * 8.6;
                return (
                  <g key={i} transform={`translate(${x} ${y}) rotate(-54)`}>
                    <path d="M-5 -7L2 -9 7 -5 7 4 1 8 -6 5Z M-1 -8L-4 -17 0 -19 4 -8" />
                    <path className="fossil-etch" d="M-3 -2L4 1" />
                  </g>
                );
              })}
            </g>
            <g data-bones="ribs">
              {Array.from({ length: 11 }, (_, i) => {
                const x = 257 + i * 8,
                  y = 185 - Math.sin((i / 10) * Math.PI) * 8,
                  d = 42 + Math.sin((i / 10) * Math.PI) * 27;
                return (
                  <path
                    key={i}
                    d={`M${x} ${y} C${x - 20} ${y + 20} ${x - 17} ${y + d - 8} ${x + 7} ${y + d} L${x + 12} ${y + d - 2} C${x - 8} ${y + d - 12} ${x - 10} ${y + 24} ${x + 5} ${y + 3}Z`}
                  />
                );
              })}
              <path d="M229 185L217 200 222 219 240 229 258 211 253 191 241 183Z M345 191L331 218 338 242 351 226 358 204Z" />
              <path
                className="fossil-etch"
                d="M229 195L240 209 230 216 M344 204L339 222"
              />
            </g>
            <g data-bones="limbs">
              <g opacity=".55">
                <Bone x={248} y={222} length={49} angle={69} width={7} />
                <Bone x={266} y={273} length={38} angle={85} width={5} />
                <Bone x={355} y={231} length={40} angle={72} width={7} />
                <Bone x={368} y={275} length={36} angle={86} width={5} />
              </g>
              <Bone x={229} y={222} length={47} angle={104} width={10} />
              <Bone x={216} y={274} length={36} angle={79} width={6} />
              <Bone x={341} y={235} length={35} angle={90} width={9} />
              <Bone x={340} y={277} length={34} angle={84} width={6} />
              <path d="M228 275L232 302 229 309 225 303Z M350 277L355 304 352 311 348 305Z" />
              {[224, 270, 344, 374].map((x) => (
                <g key={x}>
                  {[0, 1, 2].map((i) => (
                    <path
                      key={i}
                      d={`M${x + i * 6} 314l5 -1 6 7 -1 4 -10 -1 -3 -4Z`}
                    />
                  ))}
                </g>
              ))}
            </g>
            <g data-bones="skull">
              <path d="M441 48L449 34 470 29 490 36 504 49 502 62 480 67 466 61 450 65 439 58Z" />
              <path
                className="fossil-cavity"
                d="M451 44L457 38 465 40 463 51 454 53Z M476 40L487 43 493 51 477 54Z"
              />
              <path d="M449 68L466 65 481 72 500 67 495 77 473 80 453 74Z" />
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M${477 + i * 5} 65l2 6 2 -7`} />
              ))}
              <path
                className="fossil-etch"
                d="M470 32L469 39 M442 55L450 58 M482 75L489 73"
              />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
