import { useEffect, useState, useSyncExternalStore } from "react";
import { dbg, input, clearInput } from "../state";
import { INTERESTS, nearbyInterest, tribalInteractions } from "./interactions";
import { tribalIntro } from "./intro";

export function TribalInteractions() {
  const state = useSyncExternalStore(
    tribalInteractions.subscribe,
    tribalInteractions.getSnapshot,
  );
  const [, tick] = useState(0),
    [name, setName] = useState("");
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 160);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!state.open) return;
    clearInput();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") tribalInteractions.close();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [state.open]);
  useEffect(() => {
    const update = () => {
      const height = window.visualViewport?.height ?? innerHeight;
      document.documentElement.style.setProperty(
        "--writing-height",
        `${height}px`,
      );
      document.documentElement.style.setProperty(
        "--game-height",
        state.open === "ballot" ? `${height}px` : "100%",
      );
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      document.documentElement.style.setProperty("--game-height", "100%");
    };
  }, [state.open]);
  const interest = INTERESTS.find((p) => p.id === state.open),
    near = nearbyInterest(dbg.x, dbg.z);
  return (
    <>
      {!interest && near && (
        <button
          className="btn tribal-context"
          data-testid="tribal-interact"
          onClick={() => {
            input.joyX = input.joyY = 0;
            const current = nearbyInterest(dbg.x, dbg.z);
            if (!current) return;
            if (current.id === "seat") tribalIntro.sit();
            else if (current.id === "last-walk") tribalIntro.rehearse();
            else tribalInteractions.open(current.id);
          }}
        >
          {near.action}
        </button>
      )}
      {interest && (
        <div
          className={`tribal-inspect-backdrop ${interest.id === "ballot" ? "writing-backdrop" : ""}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <section
            className={`chip tribal-inspect ${interest.id === "ballot" ? "writing-inspect" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tribal-inspect-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") tribalInteractions.close();
              e.stopPropagation();
            }}
            data-testid="tribal-inspect"
          >
            <h2 id="tribal-inspect-title">{interest.title}</h2>
            <p>
              {interest.id === "ballot"
                ? "Practice only · no season outcome changes."
                : interest.text}
            </p>
            {interest.id === "ballot" &&
              (!state.folded ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    tribalInteractions.fold(name);
                  }}
                >
                  <label htmlFor="practice-ballot">Name on the parchment</label>
                  <input
                    id="practice-ballot"
                    data-testid="practice-ballot"
                    value={name}
                    maxLength={32}
                    autoComplete="off"
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button
                    className="btn"
                    data-testid="fold-ballot"
                    disabled={!name.trim()}
                  >
                    Fold & deposit
                  </button>
                </form>
              ) : (
                <p data-testid="ballot-status">
                  {state.deposited
                    ? "Practice ballot deposited in the urn."
                    : "Folding and depositing your practice ballot…"}
                </p>
              ))}
            <button
              className="btn"
              data-testid="close-tribal-inspect"
              onClick={tribalInteractions.close}
            >
              Back to exploring
            </button>
          </section>
        </div>
      )}
    </>
  );
}
