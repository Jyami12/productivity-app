import { useLayoutEffect, useRef } from "react";
import { FossilIllustration } from "./FossilSketch";
import type { ArtStyle } from "../data/fossilArtwork";

// A light outline previews the specimen; colored ink reveals saved progress.
// The surrounding UI supplies the accessible name and percentage.
export default function FossilReveal({
  id,
  percent,
  style = "sketch",
  className = "fm-art",
  centered = false,
}: {
  id: string;
  percent: number;
  style?: ArtStyle;
  className?: string;
  centered?: boolean;
}) {
  const value = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, percent))
    : 0;
  const ink = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const layer = ink.current;
    if (!layer) return;
    const update = () => {
      if (value === 0 || value === 100) {
        layer.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
        return;
      }
      // Reveal the specified fraction of the drawing, not its blank SVG margins.
      const drawing = layer.querySelector("[data-fossil-drawing]");
      const box = layer.getBoundingClientRect();
      const art = drawing?.getBoundingClientRect() ?? box;
      if (box.width > 0) {
        const right = Math.max(
          0,
          box.right - (art.left + (art.width * value) / 100),
        );
        layer.style.clipPath = `inset(0 ${right}px 0 0)`;
      }
    };
    update();
    const size = new ResizeObserver(update);
    size.observe(layer);
    const changes = new MutationObserver(update);
    changes.observe(layer, { childList: true, subtree: true });
    return () => {
      size.disconnect();
      changes.disconnect();
    };
  }, [id, style, value, centered]);
  return (
    <span className="fossil-reveal" data-reveal={value} aria-hidden="true">
      <span className="fossil-reveal-outline">
        <FossilIllustration
          id={id}
          style={style}
          className={className}
          centered={centered}
        />
      </span>
      <span
        ref={ink}
        className="fossil-reveal-ink"
        style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
      >
        <FossilIllustration
          id={id}
          style={style}
          className={className}
          centered={centered}
        />
      </span>
    </span>
  );
}
