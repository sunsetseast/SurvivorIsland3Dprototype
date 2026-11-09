import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import { cast } from "./cast";
import { PlayableSurvivor } from "./PlayableSurvivor";
import { castModel, type SurvivorModel } from "./survivorModels";
import "./survivorSelection.css";

const genders = [...new Set(cast.map(({ source }) => source.gender))];
const traits = [...new Set(cast.map(({ source }) => source.traitClass))];
const stats = ["strength", "speed", "endurance", "dexterity", "focus", "connections"] as const;

function Preview({ model, onStatus }: { model: SurvivorModel; onStatus: (value: "ready" | "error") => void }) {
  const motion = useRef({ speed: 0, distance: 0, running: false });
  return (
    <Canvas dpr={[1, 1.4]} camera={{ position: [1.62, 0.23, 3.65], fov: 32, near: 0.1, far: 14 }}>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#f5f6ff", "#627d71", 1.4]} />
      <directionalLight position={[2, 3, 4]} color="#fff2d9" intensity={2.3} />
      <directionalLight position={[-3, 1, -3]} color="#77cbd7" intensity={1.2} />
      <group position={[0, -0.94, 0]}>
        <PlayableSurvivor model={model} motion={motion} onLoadState={onStatus} />
      </group>
    </Canvas>
  );
}

export function SurvivorSelection({ initial, onConfirm, onBack }: {
  initial?: number;
  onConfirm: (survivorId: number) => void;
  onBack: () => void;
}) {
  const [gender, setGender] = useState("");
  const [trait, setTrait] = useState("");
  const [selected, setSelected] = useState<number | undefined>(initial);
  const [load, setLoad] = useState<{ id: number; status: "ready" | "error" }>();
  const eligible = cast.filter(({ source }) => (!gender || source.gender === gender) && (!trait || source.traitClass === trait));
  const active = eligible.find(({ source }) => source.id === selected) ?? eligible[0];
  const person = active?.source;
  const model = castModel(person?.id);
  const status = load?.id === person?.id ? load?.status : undefined;
  return (
    <main className="survivor-draft" data-testid="survivor-selection">
      <header>
        <button onClick={onBack}>← Welcome</button>
        <div><p>Survivor Island</p><h1>Choose your survivor</h1></div>
        <span>{eligible.length} / {cast.length}</span>
      </header>
      <div className="survivor-draft-grid">
        <section className="survivor-draft-browser" aria-label="Cast">
          <div className="survivor-draft-filters">
            <select aria-label="Gender" value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">All genders</option>
              {genders.map((item) => <option key={item} value={item}>{item === "male" ? "Men" : item === "female" ? "Women" : item}</option>)}
            </select>
            <select aria-label="Trait class" value={trait} onChange={(event) => setTrait(event.target.value)}>
              <option value="">All traits</option>
              {traits.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="survivor-draft-list">
            {eligible.map(({ source }) => (
              <button key={source.id} data-testid={`select-survivor-${source.id}`} aria-pressed={source.id === person?.id} onClick={() => setSelected(source.id)}>
                <strong>{source.name}</strong><small>{source.season}</small>
              </button>
            ))}
            {!eligible.length && <p>No survivors match these filters.</p>}
          </div>
        </section>
        <section className="survivor-draft-preview" aria-label="3D survivor preview" data-model-id={status === "ready" ? person?.id : undefined}>
          {model && person && <Preview key={person.id} model={model} onStatus={(next) => setLoad({ id: person.id, status: next })} />}
          {person && status !== "ready" && (
            <p role="status">{!model || status === "error" ? "3D preview unavailable" : "Preparing survivor…"}</p>
          )}
        </section>
        <section className="survivor-draft-detail" aria-label="Survivor attributes">
          {person && <>
            <p className="survivor-draft-season">{person.season}</p>
            <h2>{person.name}</h2>
            <p className="survivor-draft-style">{person.traitClass} · {person.gameplayStyle}</p>
            <dl>{stats.map((stat) => (
              <div key={stat}>
                <dt>{stat}</dt><dd><meter min={0} max={10} value={person[stat]} aria-label={stat} /><b>{person[stat]}</b></dd>
              </div>
            ))}</dl>
          </>}
        </section>
      </div>
      <footer>
        <button data-testid="confirm-survivor" disabled={!person || status !== "ready"} onClick={() => person && onConfirm(person.id)}>
          Start with {person?.firstName ?? "a survivor"} →
        </button>
      </footer>
    </main>
  );
}
