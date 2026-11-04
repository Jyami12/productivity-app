import { Bone } from "./FossilBone";

// Original decorative skeletal artwork, not a scientific reconstruction.
export default function VelociraptorBones() {
  return (
    <>
      <g data-bones="tail">
        {Array.from({ length: 25 }, (_, i) => {
          const x = 38 + i * 8.7,
            y = 190 - i * 1.6,
            w = 2.3 + i * 0.19;
          return (
            <path
              key={i}
              d={`M${x} ${y} l3 -${w} 5 -1 2 ${w} -2 ${w} -6 1Z M${x + 3} ${y - w} l0 -4 3 3`}
            />
          );
        })}
      </g>
      <g data-bones="spine">
        {Array.from({ length: 16 }, (_, i) => {
          const x = 260 + i * 8.3,
            y = 149 - Math.sin((i / 15) * Math.PI) * 13;
          return (
            <path
              key={i}
              d={`M${x} ${y} l2 -6 6 -1 2 6 -2 6 -6 1Z M${x + 3} ${y - 6} l-2 -10 4 -2 3 11`}
            />
          );
        })}
        {Array.from({ length: 9 }, (_, i) => {
          const x = 395 + i * 5,
            y = 145 - i * 7;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(-50)`}>
              <path d="M-4 -5L3 -7 7 -3 6 5 -2 7 -6 3Z M-1 -6L-3 -13 1 -15 3 -7" />
            </g>
          );
        })}
      </g>
      <g data-bones="ribs">
        {Array.from({ length: 12 }, (_, i) => {
          const x = 279 + i * 8.6,
            y = 151 - Math.sin((i / 11) * Math.PI) * 12,
            d = 34 + Math.sin((i / 11) * Math.PI) * 34;
          return (
            <path
              key={i}
              d={`M${x} ${y} C${x - 10} ${y + 22} ${x - 4} ${y + d - 5} ${x + 19} ${y + d} L${x + 23} ${y + d - 3} C${x + 4} ${y + d - 10} ${x} ${y + 21} ${x + 5} ${y + 2}Z`}
            />
          );
        })}
        <path d="M251 143L272 139 289 153 282 174 260 181 247 162Z M268 177L291 214 299 213 283 174Z M278 175L311 200 317 198 291 167Z" />
        <path
          className="fossil-etch"
          d="M257 150L269 156 262 166 M282 183L289 197"
        />
        <path d="M372 147L384 150 390 180 380 188 372 170Z" />
      </g>
      <g data-bones="limbs">
        <g
          opacity=".5"
          data-motion="step-back"
          style={{ transformOrigin: "275px 176px" }}
        >
          <Bone x={275} y={176} length={58} angle={50} width={8} />
          <Bone x={315} y={223} length={63} angle={106} width={5} />
          <Bone x={298} y={289} length={22} angle={25} width={3} />
          <path d="M316 299L343 305 347 310 320 309Z" />
        </g>
        <g data-motion="step" style={{ transformOrigin: "264px 178px" }}>
          <Bone x={264} y={178} length={59} angle={119} width={10} />
          <Bone x={232} y={234} length={64} angle={61} width={6} />
          <path d="M240 237L272 286 272 294 267 291 235 241Z" />
          <Bone x={264} y={295} length={26} angle={16} width={4} />
          <path d="M290 299L312 301 318 306 311 309 290 307Z M285 308L307 314 313 319 302 320 282 314Z M315 301L329 307 315 309Z M309 314L322 321 309 321Z" />
          <path d="M276 298C265 275 274 259 290 255L289 260C278 268 278 279 284 287L286 296Z" />
        </g>
        <Bone x={384} y={175} length={42} angle={51} width={5} />
        <Bone x={414} y={210} length={40} angle={-19} width={3} />
        <path d="M415 215L451 205 453 209 420 219Z" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${451 - i * 2} ${201 + i * 6} l19 ${4 + i * 2} 10 -4 -5 9 -8 1 -18 -6Z`}
          />
        ))}
      </g>
      <g data-bones="skull">
        <path d="M433 83L431 65 441 51 461 48 480 57 493 65 541 74 548 85 541 93 493 96 476 90 455 99 439 94Z" />
        <path
          className="fossil-cavity"
          d="M441 65L448 57 459 59 465 70 459 81 447 83 440 75Z M476 66L488 70 514 79 504 85 477 82Z M531 79L538 81 539 85 531 85Z"
        />
        <path
          data-motion="jaw"
          style={{ transformOrigin: "443px 101px" }}
          d="M443 101L459 97 478 101 540 98 535 107 489 112 460 111Z"
        />
        {Array.from({ length: 11 }, (_, i) => (
          <path key={i} d={`M${480 + i * 5.3} 96l2 6 2 -6Z`} />
        ))}
        <path className="fossil-etch" d="M466 51L469 59 M437 85L446 89" />
      </g>
    </>
  );
}
