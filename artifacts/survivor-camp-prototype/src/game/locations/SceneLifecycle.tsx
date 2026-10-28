import { Component, useEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { worldTravel } from "./travel";
import type { LocationId } from "./registry";

type Resource = T.BufferGeometry | T.Material | T.Texture | T.RenderTarget;
export const lifecycle = {
  mounts: 0,
  unmounts: 0,
  active: 0,
  peakActive: 0,
  disposals: { geometry: 0, material: 0, texture: 0, target: 0 },
  releases: [] as unknown[],
  samples: [] as unknown[],
};
let releasePending: Promise<void> = Promise.resolve();
export const waitForSceneRelease = () => releasePending;
const kind = (r: Resource) =>
  r instanceof T.Texture
    ? "texture"
    : r instanceof T.Material
      ? "material"
      : r instanceof T.RenderTarget
        ? "target"
        : "geometry";
// Every scene owns its assets today. Explicit shared resources can opt out; never sweep a live destination.
export function SceneLifecycle({
  id,
  token,
  children,
}: {
  id: LocationId;
  token: number;
  children: ReactNode;
}) {
  const state = useThree();
  const { scene, gl, camera } = state,
    root = useRef<T.Group>(null),
    owned = useRef(
      new Map<Resource, { disposed: boolean; listener: () => void }>(),
    ),
    ready = useRef(false),
    frames = useRef(0);
  const collect = () => {
    root.current?.traverse((o) => {
      const m = o as T.Mesh;
      const add = (r: Resource | undefined) => {
        if (
          !r ||
          ("userData" in r && r.userData?.shared) ||
          owned.current.has(r)
        )
          return;
        const entry = {
          disposed: false,
          listener: () => {
            if (!entry.disposed) {
              entry.disposed = true;
              lifecycle.disposals[kind(r)]++;
            }
          },
        };
        r.addEventListener("dispose", entry.listener);
        owned.current.set(r, entry);
      };
      const shadow = (o as T.DirectionalLight).shadow;
      if (shadow) {
        add(shadow.map ?? undefined);
        add(shadow.mapPass ?? undefined);
      }
      add(m.geometry);
      for (const mat of [m.material].flat().filter(Boolean)) {
        add(mat);
        for (const value of Object.values(mat))
          if (value instanceof T.Texture) add(value);
        for (const value of mat.userData.textureResources ?? []) add(value);
        const uniforms = (mat as T.ShaderMaterial).uniforms;
        if (uniforms)
          for (const u of Object.values(uniforms))
            if (u.value instanceof T.Texture) add(u.value);
      }
    });
  };
  useEffect(() => {
    lifecycle.mounts++;
    lifecycle.active++;
    lifecycle.peakActive = Math.max(lifecycle.peakActive, lifecycle.active);
    gl.shadowMap.autoUpdate = true;
    camera.far = id === "railay_trails" ? 6500 : 200;
    camera.updateProjectionMatrix();
    const w = window as any;
    w.__WORLD_RENDER__ = {
      state,
      scene,
      gl,
      camera,
      lifecycle,
      stats: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        ...gl.info.memory,
        programs: gl.info.programs?.length,
      }),
    };
    collect();
    return () => {
      lifecycle.unmounts++;
      lifecycle.active--;
      delete w.__WORLD_RENDER__;
      const resources = owned.current;
      // R3F also disposes on idle. A previously disposed resource can have been
      // uploaded again during asynchronous replacement; finish with an
      // idempotent release of EVERY observed scene-owned resource. Destinations
      // wait for this promise and shared resources were excluded by collect().
      releasePending = new Promise<void>((resolve) =>
        setTimeout(() => {
          let swept = 0;
          for (const [r, e] of resources) {
            if (!e.disposed) {
              swept++;
            }
            r.dispose();
            r.removeEventListener("dispose", e.listener);
          }
          resources.clear();
          gl.renderLists.dispose();
          lifecycle.releases.push({ id, swept, ...gl.info.memory });
          resolve();
        }, 80),
      );
    };
  }, [id, gl, scene, camera]);
  useFrame(() => {
    frames.current++;
    if (frames.current % 10 === 0) collect();
    if (ready.current || frames.current < 3) return;
    let assets = true;
    if (id === "railay_trails") {
      assets =
        !!scene.getObjectByName("railay-geology-ready") &&
        !!scene.getObjectByName("tonsai-karsts-ready");
      let rockReady = false;
      scene.traverse((o) => {
        for (const m of [(o as T.Mesh).material].flat().filter(Boolean))
          if (
            m.name === "tonsai-mineral-limestone" &&
            m.userData.assetReady === true
          )
            rockReady = true;
      });
      assets = assets && rockReady;
    } else if (id === "camp_tribe_a")
      assets =
        !!scene.getObjectByName("camp-assets-ready") ||
        !!scene.getObjectByName("camp-assets-degraded");
    else if (id === "tribal_council")
      assets = !!scene.getObjectByName("sanctuary-assets-ready");
    if (assets) {
      collect();
      ready.current = true;
      worldTravel.ready(token);
    }
  });
  return (
    <group ref={root} name={`location-${id}`}>
      {children}
    </group>
  );
}
export class LocationErrorBoundary extends Component<
  { token: number; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    worldTravel.fail(this.props.token, error.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
