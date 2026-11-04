import { useLayoutEffect, useRef } from "react";
import FossilPlate from "./FossilPlate";

// A light outline previews the specimen; colored ink reveals saved progress.
// The surrounding UI supplies the accessible name and percentage.
export default function FossilReveal({
  id,
  percent,
  className = "fm-art",
  centered = false,
  animateReveal = false,
}: {
  id: string;
  percent: number;
  className?: string;
  centered?: boolean;
  animateReveal?: boolean;
}) {
  const value = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, percent))
    : 0;
  const ink = useRef<HTMLSpanElement>(null);
  const brush = useRef<HTMLSpanElement>(null);
  const previous = useRef<{ id: string; count: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const layer = ink.current;
    if (!layer) return;
    const update = () => {
      const drawing = layer.querySelector("[data-fossil-drawing]");
      const box = layer.getBoundingClientRect();
      const bones = drawing
        ? Array.from(
            drawing.querySelectorAll<SVGGraphicsElement>(
              "path, rect, ellipse, circle, polygon, polyline",
            ),
          )
            .filter((bone) => !bone.classList.contains("fossil-etch"))
            .sort(
              (a, b) =>
                a.getBoundingClientRect().left - b.getBoundingClientRect().left,
            )
        : [];
      if (bones.length) {
        layer.style.clipPath = "none";
        // Whole bones appear in a stable tail-to-head order; the next bone fades in gradually.
        const amount = (value / 100) * bones.length;
        const count = Math.floor(amount);
        bones.forEach((bone, index) => {
          bone.style.opacity = String(Math.max(0, Math.min(1, amount - index)));
        });
        drawing
          ?.querySelectorAll<SVGGraphicsElement>(".fossil-etch")
          .forEach((etch) => {
            etch.style.opacity = value === 100 ? "1" : "0";
          });
        const last = previous.current;
        if (
          animateReveal &&
          last?.id === id &&
          count > last.count &&
          brush.current &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          const target =
            bones[
              Math.min(count - 1, bones.length - 1)
            ].getBoundingClientRect();
          brush.current.style.left = `${target.left - box.left + target.width / 2}px`;
          brush.current.style.top = `${target.top - box.top + target.height / 2}px`;
          brush.current
            .getAnimations()
            .forEach((animation) => animation.cancel());
          brush.current.animate(
            [
              {
                opacity: 0,
                transform: "translate(-28px, -24px) rotate(-25deg)",
              },
              {
                opacity: 0.85,
                offset: 0.25,
                transform: "translate(-12px, -18px) rotate(-12deg)",
              },
              {
                opacity: 0.7,
                offset: 0.65,
                transform: "translate(8px, -8px) rotate(12deg)",
              },
              { opacity: 0, transform: "translate(20px, -16px) rotate(25deg)" },
            ],
            { duration: 800, easing: "ease-out" },
          );
        }
        previous.current = { id, count };
      } else {
        // Use a simple reveal until SVG geometry is available.
        layer.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
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
  }, [id, value, centered, animateReveal]);
  return (
    <span className="fossil-reveal" data-reveal={value} aria-hidden="true">
      <span className="fossil-reveal-outline">
        <FossilPlate
          id={id}
          className={className}
        />
      </span>
      <span
        ref={ink}
        className="fossil-reveal-ink"
        style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
      >
        <FossilPlate
          id={id}
          className={className}
        />
      </span>
      <span className="excavation-brush" ref={brush}>
        <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
          <path d="M27 6L33 10 23 29 17 25Z" fill="#6d5438" />
          <path d="M17 23L25 28 21 34 13 29Z" fill="#909582" />
          <path d="M13 29L21 34 15 43 3 35Z" fill="#c9b386" />
          <path d="M12 32L7 37 M15 34L10 39 M18 36L13 41" stroke="#9c8257" />
          <circle cx="25" cy="40" r="1.5" fill="#b7a079" />
          <circle cx="31" cy="35" r="1" fill="#b7a079" />
        </svg>
      </span>
    </span>
  );
}
