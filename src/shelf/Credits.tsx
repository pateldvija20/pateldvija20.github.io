import { useState } from "react";

/**
 * Credits for the third-party 3D models. Both are CC BY 4.0, which requires
 * the title, author, source, licence and a note that the work was changed.
 * The wording follows each model's license.txt. When the About book is built,
 * these lines move into it too.
 */
const MODELS = [
  {
    title: "Western Electric 500 Vintage Rotary Telephone",
    source: "https://sketchfab.com/3d-models/western-electric-500-vintage-rotary-telephone-4425a0d9629c420788cf6b0d072f4564",
    author: "Skyice",
    authorUrl: "https://sketchfab.com/vicky12218",
    changes: "recoloured red",
  },
  {
    title: "Coffee machine",
    source: "https://sketchfab.com/3d-models/coffee-machine-5aee9b1f39f3400f890040c710467fdf",
    author: "vervoortward",
    authorUrl: "https://sketchfab.com/vervoortward",
    changes: "brand badge removed",
  },
];

const LICENCE = "http://creativecommons.org/licenses/by/4.0/";

export default function Credits() {
  const [open, setOpen] = useState(false);
  return (
    <div className="shelf-credits">
      {open ? (
        <div className="shelf-credits-panel" id="shelf-credits-panel">
          <p className="shelf-credits-heading">3D model credits</p>
          {MODELS.map((m) => (
            <p key={m.source}>
              This work is based on "<a href={m.source} target="_blank" rel="noopener noreferrer">{m.title}</a>" by{" "}
              <a href={m.authorUrl} target="_blank" rel="noopener noreferrer">{m.author}</a>, licensed under{" "}
              <a href={LICENCE} target="_blank" rel="noopener noreferrer">CC-BY-4.0</a>. Changes: {m.changes}.
            </p>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="shelf-credits-toggle"
        aria-expanded={open}
        aria-controls="shelf-credits-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Credits"}
      </button>
    </div>
  );
}
