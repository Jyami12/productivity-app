import { useEffect, useRef, useState } from "react";
import "./FossilMuseum.css";

type FossilDefinition = {
  id: string;
  name: string;
  group: string;
  target: number;
  color: string;
  drawing: string;
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
    drawing:
      "M149 92 C155 66 127 48 103 58 C75 70 74 108 101 124 C134 143 175 118 176 83 C177 44 139 21 104 29 C62 38 43 82 57 119 C75 162 127 168 164 141 L185 120 L174 101 M149 92 C144 107 122 111 113 97 C104 84 115 70 128 76 C138 79 137 92 129 94 M105 29 L109 56 M77 42 L88 66 M59 62 L80 78 M52 90 L78 94 M58 119 L84 111 M75 145 L94 124 M103 158 L111 132 M135 157 L132 134 M163 140 L150 123",
  },
  {
    id: "trilobite",
    name: "Trilobite",
    group: "Ocean collection",
    target: 30,
    color: "#74876b",
    drawing:
      "M120 24 C77 24 66 68 73 106 C77 137 93 157 120 162 C147 157 163 137 167 106 C174 68 163 24 120 24 Z M101 51 Q120 38 139 51 L136 131 Q120 151 104 131 Z M78 61 Q120 47 162 61 M74 77 Q120 64 166 77 M73 94 Q120 81 167 94 M76 111 Q120 98 164 111 M83 128 Q120 115 157 128 M95 144 Q120 133 145 144 M87 43 L78 28 M153 43 L162 28",
  },
  {
    id: "stegosaurus",
    name: "Stegosaurus",
    group: "Dinosaur collection",
    target: 45,
    color: "#8c9568",
    drawing:
      "M28 115 L64 99 Q100 76 161 93 L191 106 L209 104 L216 114 L203 124 L174 114 M64 99 L67 76 L82 88 L89 61 L104 81 L120 52 L134 80 L153 62 L165 94 M29 115 L20 96 M39 111 L36 90 M77 96 Q70 125 93 129 M99 89 Q88 122 111 131 M122 87 Q111 119 132 127 M144 91 Q135 116 153 124 M86 124 L77 150 L97 152 M109 128 L107 148 L126 151 M153 118 L150 145 L169 148 M177 114 L179 142 L196 144",
  },
  {
    id: "triceratops",
    name: "Triceratops",
    group: "Dinosaur collection",
    target: 60,
    color: "#ae8c65",
    drawing:
      "M22 112 L63 92 Q112 66 156 89 M66 94 Q57 123 83 133 M90 83 Q77 123 103 134 M114 82 Q103 117 124 129 M139 85 Q125 116 145 125 M80 128 L72 155 L95 155 M119 129 L112 153 L135 153 M155 90 L159 53 L174 64 L186 57 L198 86 L214 105 L226 115 L210 126 L184 119 L164 103 Z M198 88 L217 68 M191 94 L205 73 M218 110 L231 100 M176 117 L165 151 L187 152 M192 118 L189 142 L207 144",
  },
  {
    id: "velociraptor",
    name: "Velociraptor",
    group: "Dinosaur collection",
    target: 90,
    color: "#8f8064",
    drawing:
      "M20 113 Q62 106 87 88 Q112 69 145 78 L166 53 L183 44 L213 52 L220 63 L200 75 L176 70 L157 93 M93 87 Q88 112 111 119 M114 78 Q105 112 128 121 M136 79 Q128 107 148 110 M109 115 L92 144 L112 160 L133 157 M140 111 L157 137 L148 158 L168 157 L179 146 M158 92 L172 116 L190 120 L196 111 M166 85 L190 103 L205 98 M194 53 L197 54",
  },
  {
    id: "trex",
    name: "Tyrannosaurus rex",
    group: "Dinosaur collection",
    target: 150,
    color: "#718b58",
    drawing:
      "M19 126 Q65 123 88 89 Q118 62 157 86 L175 62 L175 37 L206 31 L226 49 L219 70 L191 68 L179 87 M181 71 L209 83 L221 74 M93 88 Q82 119 107 130 M114 80 Q104 121 130 131 M139 82 Q127 113 152 118 M107 126 L92 155 L111 173 L135 173 M147 117 L173 143 L161 169 L187 171 M168 81 L170 106 L188 114 M179 87 L189 103 L201 105 M205 46 L206 47",
  },
  {
    id: "brachiosaurus",
    name: "Brachiosaurus",
    group: "Dinosaur collection",
    target: 210,
    color: "#899d7a",
    drawing:
      "M17 129 L62 100 Q96 80 131 97 L156 49 L166 20 L190 18 L198 28 L184 38 L175 66 L157 110 M67 100 Q65 123 87 126 M89 93 Q83 121 108 131 M114 94 Q103 125 127 131 M134 98 Q128 121 150 126 M78 123 L65 159 L89 159 M103 128 L103 158 L123 158 M139 123 L151 159 L174 159 M156 110 L174 144 L192 147",
  },
  {
    id: "pteranodon",
    name: "Pteranodon",
    group: "Flying collection",
    target: 270,
    color: "#aa9575",
    drawing:
      "M117 78 L121 57 L132 45 L129 24 L151 47 L185 56 L147 63 L130 79 L121 111 L112 79 Z M115 78 L77 45 L23 44 L48 118 L99 108 M127 79 L164 42 L216 34 L198 111 L142 109 M77 45 L65 102 M164 42 L175 102 M113 109 L92 143 L98 160 M126 111 L142 142 L138 162 M117 86 L124 86 M115 96 L124 96 M116 105 L125 105",
  },
  {
    id: "spinosaurus",
    name: "Spinosaurus",
    group: "Dinosaur collection",
    target: 360,
    color: "#9a856d",
    drawing:
      "M16 131 Q52 124 79 96 Q113 86 147 101 L169 78 L200 76 L227 86 L220 96 L186 97 L171 109 M71 98 L82 69 L91 91 L103 41 L115 88 L128 29 L139 94 L153 51 L165 103 M83 98 Q78 126 100 132 M108 94 Q101 125 123 132 M135 98 Q123 123 145 127 M104 128 L87 155 L109 163 M145 127 L158 151 L153 166 L175 166 M169 106 L188 127 L203 126 M177 102 L200 117 L214 115",
  },
  {
    id: "ankylosaurus",
    name: "Ankylosaurus",
    group: "Dinosaur collection",
    target: 450,
    color: "#8e997c",
    drawing:
      "M32 115 L65 99 Q117 57 170 94 L196 108 L212 106 L222 119 L204 129 L179 115 M31 114 C10 91 6 128 24 137 C40 144 50 122 31 114 Z M70 95 L78 73 L94 79 L111 62 L128 73 L145 68 L160 83 L175 84 L182 104 M80 98 L92 89 L102 99 L115 86 L127 99 L143 89 L158 102 M78 100 Q76 126 95 130 M108 97 Q99 126 119 134 M139 99 Q132 127 152 130 M87 128 L77 154 L98 154 M122 131 L118 155 L139 155 M171 114 L166 148 L187 151",
  },
  {
    id: "plesiosaurus",
    name: "Plesiosaurus",
    group: "Ocean collection",
    target: 600,
    color: "#75938b",
    drawing:
      "M23 115 L73 96 Q97 72 140 89 Q162 65 178 43 L191 28 L215 31 L220 41 L203 48 L192 63 L163 103 M78 97 Q82 129 114 131 Q145 130 160 104 M89 87 Q85 113 104 127 M109 83 Q99 112 123 129 M130 88 Q119 112 140 122 M88 111 L53 153 L83 144 L106 125 M143 118 L175 155 L176 135 L158 108 M111 84 L79 54 L101 61 L132 87",
  },
  {
    id: "mammoth",
    name: "Mammoth",
    group: "Ice age collection",
    target: 750,
    color: "#a58a71",
    drawing:
      "M25 116 L52 97 Q84 58 133 78 L151 56 L174 52 L190 67 L196 94 L211 115 L215 146 L204 153 L197 127 L180 109 M161 61 L153 80 L161 100 L179 110 L192 98 M181 104 Q203 142 229 117 M170 108 Q184 145 209 137 M62 94 Q57 122 78 128 M83 82 Q72 121 98 131 M106 78 Q96 123 119 132 M132 83 Q119 120 141 128 M73 124 L65 157 L88 159 M104 128 L99 159 L121 159 M142 121 L151 157 L174 157 M170 109 L177 145 L192 145",
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

function FossilArt({ fossil }: { fossil: FossilDefinition }) {
  return (
    <svg className="fm-art" viewBox="0 0 240 190" aria-hidden="true">
      <path
        d={fossil.drawing}
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
                  <FossilArt fossil={f} />
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
              <FossilArt fossil={selected} />
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
