import { useState, type ReactNode } from "react";
import "./TimerAppearance.css";
const choices = {
  layout: [
    ["ring", "Orbit"],
    ["minimal", "Minimal"],
    ["compact", "Compact"],
  ],
  font: [
    ["modern", "Modern"],
    ["mono", "Digital"],
    ["serif", "Classic"],
  ],
  background: [
    ["paper", "Paper"],
    ["fern", "Fern"],
    ["ocean", "Ocean"],
    ["lavender", "Lavender"],
  ],
} as const;
type Appearance = { layout: string; font: string; background: string };
const defaults: Appearance = {
  layout: "ring",
  font: "modern",
  background: "paper",
};
const storageKey = "dinofocus.timer-appearance.v1";
function readAppearance(): Appearance {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!value || typeof value !== "object") return { ...defaults };
    return Object.fromEntries(
      Object.entries(choices).map(([key, options]) => [
        key,
        options.some(([id]) => id === value[key])
          ? value[key]
          : defaults[key as keyof Appearance],
      ]),
    ) as Appearance;
  } catch {
    return { ...defaults };
  }
}
export default function TimerAppearance({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState(readAppearance);
  const [storageError, setStorageError] = useState(false);
  const selectionLabel = Object.entries(choices)
    .map(
      ([key, options]) =>
        options.find(([id]) => id === appearance[key as keyof Appearance])?.[1],
    )
    .join(" · ");
  function update(next: Appearance) {
    setAppearance(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <section
      className="card timer-card timer-personalized"
      data-layout={appearance.layout}
      data-font={appearance.font}
      data-background={appearance.background}
    >
      <details className="timer-customize">
        <summary>
          <span aria-hidden="true">✧</span> Customize{" "}
          <span className="appearance-hint">{selectionLabel}</span>
        </summary>
        <div className="appearance-options">
          <p>Choose your look. Changes apply to both timers immediately.</p>
          {(Object.keys(choices) as (keyof Appearance)[]).map((key) => (
            <fieldset key={key}>
              <legend>
                {key === "layout"
                  ? "Timer style"
                  : key === "font"
                    ? "Number font"
                    : "Background"}
              </legend>
              <div className={`appearance-choices appearance-choices-${key}`}>
                {choices[key].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={appearance[key] === id}
                    aria-label={label}
                    onClick={() => update({ ...appearance, [key]: id })}
                    data-font-preview={key === "font" ? id : undefined}
                  >
                    {key === "layout" && (
                      <span
                        className={`appearance-layout-preview preview-${id}`}
                        aria-hidden="true"
                      >
                        <span>25:00</span>
                      </span>
                    )}
                    {key === "font" && (
                      <span
                        className="appearance-font-preview"
                        aria-hidden="true"
                      >
                        25:00
                      </span>
                    )}
                    {key === "background" && (
                      <i
                        className={"appearance-swatch swatch-" + id}
                        aria-hidden="true"
                      />
                    )}
                    {label}
                    <span className="appearance-check" aria-hidden="true">
                      {appearance[key] === id ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="appearance-footer">
            <small role="status">
              {storageError
                ? "Changes apply now, but this browser could not save them."
                : "Your choices are saved in this browser."}
            </small>
            <button type="button" onClick={() => update({ ...defaults })}>
              Reset appearance
            </button>
          </div>
        </div>
      </details>
      {children}
    </section>
  );
}
