import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import url from "../../assets/sanctuary/voting-props.glb?url";
import { VOTING } from "./votingAnchors";
import { tribalInteractions } from "./interactions";

/** One urn, one set of props. No duplicate host vessel or hidden advantage random draw. */
export function VotingProps() {
  const [kit, setKit] = useState<T.Group | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false,
      loaded: T.Group | undefined;
    const dispose = (root: T.Object3D) => {
      const materials = new Set<T.Material>(),
        textures = new Set<T.Texture>();
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      materials.forEach((m) => {
        Object.values(m).forEach((v) => {
          if (v instanceof T.Texture) textures.add(v);
        });
        m.dispose();
      });
      textures.forEach((t) => {
        t.dispose();
        (t.source.data as { close?: () => void })?.close?.();
      });
    };
    new GLTFLoader().load(
      url,
      (g) => {
        loaded = g.scene;
        if (cancelled) {
          dispose(loaded);
          return;
        }
        for (const [name, anchor] of Object.entries({
          voting_pen: VOTING.pen,
          voting_urn: VOTING.urn,
          shot_dark_bag: VOTING.bag,
          parchment: VOTING.parchment,
        })) {
          const object = g.scene.getObjectByName(name)!;
          object.position.set(anchor.x, anchor.y, anchor.z);
          if (name === "voting_pen") object.rotation.y = -0.35;
          object.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
        }
        g.scene.name = "voting-props-ready";
        setKit(g.scene);
      },
      undefined,
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      if (loaded) dispose(loaded);
    };
  }, []);
  return (
    <group
      name={failed ? "voting-station-props-fallback" : "voting-station-props"}
    >
      {kit && <primitive object={kit} dispose={null} />}
      {!kit && <FallbackProps />}
      <BallotPresentation kit={kit} />
      <mesh
        name="camera-voting-urn"
        position={[VOTING.urn.x, VOTING.urn.y + 0.4, VOTING.urn.z]}
        visible={false}
        userData={{ cameraBlocker: true }}
      >
        <boxGeometry args={[0.8, 0.82, 0.8]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
function FallbackProps() {
  // Network failure leaves a usable hollow urn and the same anchors/interactions.
  return (
    <group name="voting-props-fallback">
      <mesh position={[VOTING.urn.x, VOTING.urn.y + 0.36, VOTING.urn.z]}>
        <cylinderGeometry args={[0.29, 0.34, 0.72, 24, 1, true]} />
        <meshStandardMaterial color="#735134" side={T.DoubleSide} />
      </mesh>
      <mesh
        position={[VOTING.bag.x, VOTING.bag.y + 0.2, VOTING.bag.z]}
        scale={[1, 0.9, 0.8]}
      >
        <sphereGeometry args={[0.25, 16, 12]} />
        <meshStandardMaterial color="#26292a" roughness={1} />
      </mesh>
      <mesh
        position={[VOTING.pen.x, VOTING.pen.y, VOTING.pen.z]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.045, 0.06, 0.58, 12]} />
        <meshStandardMaterial color="#3b2618" />
      </mesh>
      <mesh
        position={[VOTING.parchment.x, VOTING.parchment.y, VOTING.parchment.z]}
      >
        <boxGeometry args={[0.77, 0.008, 0.52]} />
        <meshStandardMaterial color="#d0b98a" />
      </mesh>
    </group>
  );
}
function BallotPresentation({ kit }: { kit: T.Group | null }) {
  const state = useSyncExternalStore(
    tribalInteractions.subscribe,
    tribalInteractions.getSnapshot,
  );
  const root = useRef<T.Group>(null),
    sheet = useRef<T.Mesh>(null),
    time = useRef(0);
  const ink = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, 512, 256);
    g.fillStyle = "#21180f";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 54px cursive";
    g.fillText(state.ballot, 256, 128, 470);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }, [state.ballot]);
  useEffect(() => () => ink.dispose(), [ink]);
  useEffect(() => {
    time.current = 0;
  }, [state.folded]);
  useFrame((_, dt) => {
    const paper = kit?.getObjectByName("parchment");
    if (paper) paper.visible = !state.folded;
    if (!root.current || !sheet.current) return;
    root.current.visible = state.folded && !state.deposited;
    if (!state.folded || state.deposited) return;
    time.current += Math.min(dt, 0.05);
    const t = time.current;
    // First fold on the table, then lift, cross to the opening and lower inside.
    const fold = T.MathUtils.smoothstep(t, 0.15, 0.8);
    sheet.current.scale.set(1 - 0.54 * fold, 1, 1 - 0.52 * fold);
    const travel = T.MathUtils.smoothstep(t, 1, 2.15),
      drop = T.MathUtils.smoothstep(t, 2.25, 2.9);
    root.current.position.set(
      T.MathUtils.lerp(VOTING.parchment.x, VOTING.urn.x, travel),
      VOTING.parchment.y +
        Math.sin((travel * Math.PI) / 2) * 1.04 -
        drop * 0.79,
      T.MathUtils.lerp(VOTING.parchment.z, VOTING.urn.z, travel),
    );
    root.current.rotation.y = travel * 0.3;
    if (t >= 2.95) tribalInteractions.deposit();
  });
  return (
    <>
      {state.ballot && !state.folded && (
        <mesh
          position={[
            VOTING.parchment.x,
            VOTING.parchment.y + 0.009,
            VOTING.parchment.z,
          ]}
          rotation={[-Math.PI / 2, 0, Math.PI]}
        >
          <planeGeometry args={[0.7, 0.46]} />
          <meshBasicMaterial map={ink} transparent depthWrite={false} />
        </mesh>
      )}
      <group
        ref={root}
        name="folded-practice-ballot"
        visible={state.folded && !state.deposited}
      >
        <mesh ref={sheet}>
          <boxGeometry args={[0.77, 0.014, 0.52]} />
          <meshStandardMaterial color="#d7c095" roughness={1} />
          <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, Math.PI]}>
            <planeGeometry args={[0.7, 0.46]} />
            <meshBasicMaterial map={ink} transparent depthWrite={false} />
          </mesh>
        </mesh>
      </group>
    </>
  );
}
