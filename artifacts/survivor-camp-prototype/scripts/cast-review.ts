import {
  AmbientLight, AnimationMixer, Box3, Color, DirectionalLight, Group, HemisphereLight,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

type Entry = { id: number; name: string; url: string };

export async function renderCast(entries: Entry[], pilot: boolean, benchmark = false) {
  const columns = benchmark ? 7 : pilot ? 6 : Math.min(entries.length, 6);
  const width = 220, height = 282, labelHeight = 34;
  const sheet = document.createElement("canvas");
  sheet.width = width * columns;
  sheet.height = (height + labelHeight) * (pilot ? entries.length : Math.ceil(entries.length / columns));
  const ctx = sheet.getContext("2d")!;
  ctx.fillStyle = "#102628";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = "600 13px system-ui";
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(new Color("#344746"));
  const scene = new Scene();
  const key = new DirectionalLight("#fff2d8", 2.2);
  key.position.set(2.8, 4.2, 5);
  const rim = new DirectionalLight("#9fcfff", 1.5);
  rim.position.set(-3, 2, -3);
  scene.add(new AmbientLight("#fff0e0", 0.55), new HemisphereLight("#ecf7ff", "#787563", 1.25), key, rim);
  const camera = new PerspectiveCamera(30, width / height, 0.05, 20);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const metrics = [];
  try {
    for (const [index, entry] of entries.entries()) {
      const { scene: actor, animations } = await loader.loadAsync(entry.url);
      const root = new Group();
      root.add(actor);
      scene.add(root);
      const mixer = new AnimationMixer(actor);
      const box = new Box3();
      const modelHead = actor.getObjectByName("Head")!;
      actor.traverse((node) => {
        if (!("isSkinnedMesh" in node) || !node.isSkinnedMesh) return;
        const { geometry } = node as import("three").SkinnedMesh;
        const position = geometry.getAttribute("position");
        const skin = geometry.getAttribute("skinWeight");
        const indices = geometry.index!;
        for (let i = 0; i < indices.count; i++) {
          if (indices.getX(i) >= position.count) throw new Error(`${entry.name} has an invalid triangle index`);
        }
        for (let i = 0; i < position.count; i++) {
          if (![position.getX(i), position.getY(i), position.getZ(i)].every(Number.isFinite)) throw new Error(`${entry.name} has a nonfinite vertex`);
          if (Math.abs(skin.getX(i) + skin.getY(i) + skin.getZ(i) + skin.getW(i) - 1) > 0.04) {
            throw new Error(`${entry.name} has a malformed skin weight`);
          }
        }
      });
      const views = benchmark
        ? [["Front portrait", 0, "idle"], ["Profile portrait", Math.PI / 2, "idle"],
           ["Three-quarter portrait", 0.52, "idle"], ["Body front", 0, "idle"],
           ["Body side", Math.PI / 2, "idle"], ["Walk", -0.62, "walk"], ["Run", 0.68, "run"]] as const
        : pilot
        ? [["Front", 0, "idle"], ["Profile", Math.PI / 2, "idle"], ["Three-quarter", 0.52, "idle"],
           ["Walk", -0.62, "walk"], ["Run", 0.68, "run"], ["Sit", -0.54, "sit"]] as const
        : [["Three-quarter", 0.35, "idle"]] as const;
      for (const [j, [label, angle, motion]] of views.entries()) {
        mixer.stopAllAction();
        const clip = animations.find((item) => item.name === motion) ?? (entry.id === 0 && motion === "sit" ? animations.find((item) => item.name === "idle") : undefined);
        if (!clip) throw new Error(`${entry.name} is missing ${motion}`);
        const action = mixer.clipAction(clip).reset().play();
        mixer.update(0);
        const hip = actor.getObjectByName("Hips")!;
        const thigh = actor.getObjectByName("LeftUpLeg")!;
        const initialPose = [...hip.position.toArray(), ...thigh.quaternion.toArray()];
        action.time = clip.duration * (motion === "walk" ? 0.25 : motion === "run" ? 0.29 : 0.35);
        mixer.update(0);
        if ((motion === "walk" || motion === "run") && initialPose.every((v, k) =>
          Math.abs(v - [...hip.position.toArray(), ...thigh.quaternion.toArray()][k]!) < 0.00001)) {
          throw new Error(`${entry.name} has a frozen ${motion} clip`);
        }
        root.updateMatrixWorld(true);
        box.setFromObject(root, true);
        const target = box.getCenter(new Vector3());
        if (benchmark && j < 3) {
          const head = modelHead.getWorldPosition(new Vector3());
          head.y += 0.07;
          camera.position.set(head.x + Math.sin(angle) * 0.78, head.y + 0.025, head.z + Math.cos(angle) * 0.78);
          camera.lookAt(head);
        } else {
          camera.position.set(Math.sin(angle) * 4.35, target.y + 0.08, Math.cos(angle) * 4.35);
          camera.lookAt(0, target.y, 0);
        }
        renderer.render(scene, camera);
        const tile = pilot ? index * columns + j : index;
        const x = tile % columns * width, y = Math.floor(tile / columns) * (height + labelHeight);
        if (j === 0) metrics.push({ id: entry.id, name: entry.name, textures: renderer.info.memory.textures, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, height: box.max.y - box.min.y });
        if (pilot) ctx.drawImage(renderer.domElement, x, y, width, height);
        else {
          ctx.drawImage(renderer.domElement, 46, 0, 128, height, x, y, 123, height);
          const head = modelHead.getWorldPosition(new Vector3());
          head.y += 0.07;
          camera.position.set(head.x + 0.34, head.y + 0.045, head.z + 1.20);
          camera.lookAt(head);
          renderer.render(scene, camera);
          ctx.drawImage(renderer.domElement, 43, 45, 134, 179, x + 124, y + 25, 94, 126);
        }
        ctx.fillStyle = "#e9dfc8";
        ctx.fillText(pilot ? `${entry.name} · ${label}` : `${entry.id} · ${entry.name}`, x + 9, y + height + 21, width - 18);
      }
      mixer.stopAllAction();
      mixer.uncacheRoot(actor);
      scene.remove(root);
      const disposed = new Set();
      actor.traverse((node) => {
        if (!("isMesh" in node) || !node.isMesh) return;
        const mesh = node as import("three").SkinnedMesh;
        if (mesh.skeleton && !disposed.has(mesh.skeleton)) {
          mesh.skeleton.dispose();
          disposed.add(mesh.skeleton);
        }
        mesh.geometry.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (disposed.has(material)) continue;
          disposed.add(material);
          for (const texture of Object.values(material)) {
            if (texture?.isTexture && !disposed.has(texture)) {
              disposed.add(texture);
              texture.dispose();
            }
          }
          material.dispose();
        }
      });
    }
    return { image: sheet.toDataURL("image/jpeg", 0.89).split(",")[1], metrics };
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
