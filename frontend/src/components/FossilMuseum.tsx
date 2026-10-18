import { useEffect, useRef, useState } from "react";
import "./FossilMuseum.css";
import { FossilIllustration } from "./FossilSketch";
import { SOURCED_ART, type ArtStyle } from "../data/fossilArtwork";

type FossilDefinition = {
  id: string;
  name: string;
  group: string;
  target: number;
  color: string;
};

// Original stylized SVG illustrations, not scientific reconstructions.
// Targets are cumulative focus-minute milestones. Minutes are not spent.
const FOSSILS: FossilDefinition[] = [
  {
    id: "ammonite",
    name: "Ammonite",
    group: "Ocean collection",
    target: 15,
    color: "#ad794d",
  },
  {
    id: "trilobite",
    name: "Trilobite",
    group: "Ocean collection",
    target: 30,
    color: "#74876b",
  },
  {
    id: "stegosaurus",
    name: "Stegosaurus",
    group: "Dinosaur collection",
    target: 45,
    color: "#8c9568",
  },
  {
    id: "triceratops",
    name: "Triceratops",
    group: "Dinosaur collection",
    target: 60,
    color: "#ae8c65",
  },
  {
    id: "velociraptor",
    name: "Velociraptor",
    group: "Dinosaur collection",
    target: 90,
    color: "#8f8064",
  },
  {
    id: "trex",
    name: "Tyrannosaurus rex",
    group: "Dinosaur collection",
    target: 150,
    color: "#718b58",
  },
  {
    id: "brachiosaurus",
    name: "Brachiosaurus",
    group: "Dinosaur collection",
    target: 210,
    color: "#899d7a",
  },
  {
    id: "pteranodon",
    name: "Pteranodon",
    group: "Flying collection",
    target: 270,
    color: "#aa9575",
  },
  {
    id: "spinosaurus",
    name: "Spinosaurus",
    group: "Dinosaur collection",
    target: 360,
    color: "#9a856d",
  },
  {
    id: "ankylosaurus",
    name: "Ankylosaurus",
    group: "Dinosaur collection",
    target: 450,
    color: "#8e997c",
  },
  {
    id: "plesiosaurus",
    name: "Plesiosaurus",
    group: "Ocean collection",
    target: 600,
    color: "#75938b",
  },
  {
    id: "mammoth",
    name: "Mammoth",
    group: "Ice age collection",
    target: 750,
    color: "#a58a71",
  },
];

type Filter = "All" | "Collected" | "Excavating" | "Locked" | "Favorites";
const FILTERS: Filter[] = [
  "All",
  "Collected",
  "Excavating",
  "Locked",
  "Favorites",
];

export default function FossilMuseum({
  totalMinutes,
  onFocus,
  storageScope = "default",
}: {
  totalMinutes: number;
  onFocus: () => void;
  storageScope?: string;
}) {
  const minutes = Number.isFinite(totalMinutes)
    ? Math.max(0, Math.floor(totalMinutes))
    : 0;
  const [query, setQuery] = useState("");
  const [artStyle, setArtStyle] = useState<ArtStyle>("sketch");
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<FossilDefinition | null>(null);
  const favoriteKey = `dinofocus.museum.favorites.${storageScope}.v1`;
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(favoriteKey) ?? "[]",
      );
      return Array.isArray(saved)
        ? saved.filter(
            (id): id is string =>
              typeof id === "string" && FOSSILS.some((f) => f.id === id),
          )
        : [];
    } catch {
      return [];
    }
  });
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const next = FOSSILS.find((f) => minutes < f.target);
  const collected = FOSSILS.filter((f) => minutes >= f.target).length;
  const status = (f: FossilDefinition) =>
    minutes >= f.target
      ? "Collected"
      : f.id === next?.id
        ? "Excavating"
        : "Locked";
  const percentage = (f: FossilDefinition) =>
    Math.min(100, Math.floor((minutes / f.target) * 100));
  const visible = FOSSILS.filter((f) => {
    const matchesQuery = `${f.name} ${f.group}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesFilter =
      filter === "All" ||
      (filter === "Favorites"
        ? favorites.includes(f.id)
        : status(f) === filter);
    return matchesQuery && matchesFilter;
  });
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [selected]);
  function toggleFavorite(id: string) {
    const nextFavorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(nextFavorites);
    try {
      localStorage.setItem(favoriteKey, JSON.stringify(nextFavorites));
      setMessage("");
    } catch {
      setMessage(
        "Favorites will last for this visit. Browser storage is unavailable.",
      );
    }
  }
  function closeDetails() {
    dialog.current?.close();
    setSelected(null);
  }
  return (
    <section className="fm" aria-label="Fossil collection">
      <header className="fm-heading">
        <div>
          <span className="fm-kicker">THE FOSSIL INDEX</span>
          <h2>Your collection</h2>
          <p>A little more history, uncovered.</p>
        </div>
        <div className="fm-count">
          <strong>
            {collected}
            <span> / {FOSSILS.length}</span>
          </strong>
          <span>fossils collected</span>
        </div>
      </header>
      <div className="fm-tools">
        <label className="fm-search">
          <span>Search fossils</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or collection…"
          />
        </label>
        <span className="fm-total">
          {minutes.toLocaleString()} focused minutes
        </span>
      </div>
      <div className="fm-art-controls">
        <label>
          Illustration style
          <select
            value={artStyle}
            onChange={(e) => setArtStyle(e.target.value as ArtStyle)}
          >
            <option value="sketch">Field sketches · offline</option>
            <option value="archive">Open collection · online</option>
          </select>
        </label>
        <p>
          {artStyle === "sketch"
            ? "Twelve original decorative studies, drawn to match your collection."
            : "Five freely licensed illustrations. Local sketches appear for other fossils or if an image cannot load."}
        </p>
      </div>
      <div className="fm-filters" role="group" aria-label="Filter fossils">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={filter === item}
            onClick={() => setFilter(item)}
          >
            {item}
            {item === "Collected" ? ` (${collected})` : ""}
          </button>
        ))}
      </div>
      {next ? (
        <div className="fm-next">
          <div>
            <span>YOUR NEXT DISCOVERY</span>
            <p>
              <strong>{next.name}</strong>
              <span>
                {next.target - minutes} more focused{" "}
                {next.target - minutes === 1 ? "minute" : "minutes"}
              </span>
            </p>
          </div>
          <button type="button" onClick={onFocus}>
            Continue focusing <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : (
        <div className="fm-next">
          <div>
            <span>COLLECTION COMPLETE</span>
            <p>
              All {FOSSILS.length} fossils uncovered. Keep building your focus
              habit.
            </p>
          </div>
          <button type="button" onClick={onFocus}>
            Start a session
          </button>
        </div>
      )}
      <p className="fm-results" role="status">
        {visible.length} {visible.length === 1 ? "fossil" : "fossils"}
        {filter !== "All" ? ` in ${filter.toLowerCase()}` : " in your index"}
      </p>
      <div className="fm-grid">
        {visible.map((f) => {
          const state = status(f);
          const index = FOSSILS.indexOf(f) + 1;
          return (
            <article className={`fm-card fm-${state.toLowerCase()}`} key={f.id}>
              <button
                className="fm-open"
                type="button"
                onClick={() => setSelected(f)}
                aria-label={`View ${f.name}, ${state}`}
              >
                <span className="fm-number">
                  #{String(index).padStart(3, "0")}
                </span>
                <span
                  className="fm-art-stage"
                  style={{ color: state === "Locked" ? "#b7beb0" : f.color }}
                >
                  <FossilIllustration
                    key={`${f.id}-${artStyle}`}
                    id={f.id}
                    style={artStyle}
                    className="fm-art"
                  />
                </span>
                <span className="fm-name">{f.name}</span>
                <span className="fm-group">{f.group}</span>
                <span className="fm-status">
                  {state === "Collected"
                    ? "✓ Collected"
                    : state === "Excavating"
                      ? `Excavating · ${percentage(f)}%`
                      : `Locked · ${f.target} min`}
                </span>
                {state === "Locked" ? (
                  <span className="fm-locked-line" />
                ) : (
                  <progress
                    max="100"
                    value={percentage(f)}
                    aria-label={`${f.name} collection progress`}
                  />
                )}
              </button>
              <button
                className="fm-star"
                type="button"
                aria-label={`Favorite ${f.name}`}
                aria-pressed={favorites.includes(f.id)}
                onClick={() => toggleFavorite(f.id)}
              >
                {favorites.includes(f.id) ? "★" : "☆"}
              </button>
            </article>
          );
        })}
      </div>
      {visible.length === 0 && (
        <div className="fm-empty">
          <h3>No fossils here yet</h3>
          <p>
            Try a different search or filter. Use a star to save a favorite.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("All");
            }}
          >
            Show all fossils
          </button>
        </div>
      )}
      <p className="fm-footnote">
        Fossils unlock at total focus-minute milestones. Your minutes are never
        spent.
      </p>
      <details className="fm-credits">
        <summary>About the illustrations & artwork credits</summary>
        <p>
          The field sketches are original decorative SVG illustrations, not
          scientific reconstructions. The open collection uses the sources
          below, fitted and tinted with CSS to match this site. Historical
          drawings may reflect outdated anatomy. The Spinosaurus display
          adaptation is CC BY-SA 3.0.
        </p>
        <ul>
          {Object.entries(SOURCED_ART).map(([id, art]) => (
            <li key={id}>
              <a href={art.source} target="_blank" rel="noreferrer">
                {art.title}
              </a>{" "}
              by {art.author}.{" "}
              <a href={art.licenseUrl} target="_blank" rel="noreferrer">
                {art.license}
              </a>
              . {art.note}
            </li>
          ))}
        </ul>
      </details>
      {message && (
        <p className="fm-footnote" role="status">
          {message}
        </p>
      )}
      <dialog
        className="fm-dialog"
        ref={dialog}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDetails();
        }}
        aria-labelledby="fm-detail-title"
      >
        {selected && (
          <div className="fm-detail">
            <button
              className="fm-close"
              type="button"
              onClick={closeDetails}
              aria-label="Close fossil details"
            >
              ×
            </button>
            <span className="fm-kicker">
              SPECIMEN #{String(FOSSILS.indexOf(selected) + 1).padStart(3, "0")}
            </span>
            <div className="fm-detail-art" style={{ color: selected.color }}>
              <FossilIllustration
                key={`${selected.id}-${artStyle}`}
                id={selected.id}
                style={artStyle}
                className="fm-art"
              />
            </div>
            <span className="fm-group">{selected.group}</span>
            <h2 id="fm-detail-title">{selected.name}</h2>
            <span className="fm-detail-status">{status(selected)}</span>
            <p>
              Unlocks at{" "}
              <strong>{selected.target} total focused minutes</strong>.
            </p>
            <progress
              max={selected.target}
              value={Math.min(minutes, selected.target)}
              aria-label={`${selected.name} unlock milestone`}
            />
            <p className="fm-detail-caption">
              {minutes >= selected.target
                ? "This fossil is part of your collection."
                : `${selected.target - minutes} more focused minutes until this milestone.`}
            </p>
            <button
              className="fm-focus-button"
              type="button"
              onClick={() => {
                closeDetails();
                onFocus();
              }}
            >
              {minutes >= selected.target
                ? "Start another session"
                : "Continue focusing"}
            </button>
          </div>
        )}
      </dialog>
    </section>
  );
}
