export function Bone({
  x,
  y,
  length,
  angle,
  width = 10,
}: {
  x: number;
  y: number;
  length: number;
  angle: number;
  width?: number;
}) {
  const w = width;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path
        d={`M0 ${-w} L8 ${-w - 2} L15 ${-w / 2} L${length - 15} ${-w / 2} L${length - 8} ${-w} L${length} ${-w + 2} L${length + 2} ${w - 2} L${length - 7} ${w + 1} L${length - 15} ${w / 2} L15 ${w / 2} L7 ${w + 2} L-2 ${w - 1}Z`}
      />
      <path
        className="fossil-etch"
        d={`M18 -2 L${length - 18} -2 M7 ${-w} l3 5 -4 4 M${length - 8} 0 l-4 4 3 4`}
      />
    </g>
  );
}
