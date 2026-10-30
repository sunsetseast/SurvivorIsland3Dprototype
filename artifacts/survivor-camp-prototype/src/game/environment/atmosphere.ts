import * as T from "three";

/** Linear-light inputs shared by the visible sky, sun, fog and ocean. Presets
 * are art/QA controls only; they never read or write gameplay time/save data. */
export const ATMOSPHERES = {
  midday: {
    sun: [-0.65, 0.76, -0.4],
    zenith: "#147bc8",
    horizon: "#9ac9e1",
    haze: "#92b9ca",
    sunlight: "#fff0d5",
    ambient: "#b9d9ed",
    bounce: "#77775b",
    sunIntensity: 2.8,
    ambientIntensity: 1.35,
    exposure: 0.96,
    cloudLight: "#fff9ec",
    cloudShade: "#93b2cb",
    cloudCoverage: 1,
    waterShallow: "#368d82",
    waterDeep: "#17495f",
  },
  afternoon: {
    sun: [-0.85, 0.5, -0.3],
    zenith: "#348acb",
    horizon: "#c2d6db",
    haze: "#a9bdc4",
    sunlight: "#ffe0b0",
    ambient: "#c3d9e8",
    bounce: "#776d54",
    sunIntensity: 2.65,
    ambientIntensity: 1.3,
    exposure: 0.96,
    cloudLight: "#fff0d4",
    cloudShade: "#a3b5c9",
    cloudCoverage: 1,
    waterShallow: "#438c80",
    waterDeep: "#254e62",
  },
  golden: {
    sun: [-0.95, 0.23, -0.2],
    zenith: "#548bb8",
    horizon: "#e2c8a9",
    haze: "#bdb6ae",
    sunlight: "#ffd092",
    ambient: "#b9c7df",
    bounce: "#6f634f",
    sunIntensity: 2.4,
    ambientIntensity: 1.15,
    exposure: 0.96,
    cloudLight: "#ffdcab",
    cloudShade: "#a6adbd",
    cloudCoverage: 1,
    waterShallow: "#587f73",
    waterDeep: "#344f61",
  },
} as const;
export type AtmosphereName = keyof typeof ATMOSPHERES;
export type Atmosphere = (typeof ATMOSPHERES)[AtmosphereName];
export function atmosphereName(search = ""): AtmosphereName {
  const q = new URLSearchParams(search),
    value = q.get("atmosphere");
  return q.get("devTravel") === "1" &&
    value &&
    Object.hasOwn(ATMOSPHERES, value)
    ? (value as AtmosphereName)
    : "midday";
}
export const sunDirection = (a: Atmosphere) =>
  new T.Vector3(...a.sun).normalize();
export function skyUniforms(a: Atmosphere) {
  return {
    uSun: { value: sunDirection(a) },
    uZenith: { value: new T.Color(a.zenith) },
    uHorizon: { value: new T.Color(a.horizon) },
    uCloudLight: { value: new T.Color(a.cloudLight) },
    uCloudShade: { value: new T.Color(a.cloudShade) },
    uCoverage: { value: a.cloudCoverage },
    uTime: { value: 0 },
  };
}
/** Reused by water for its Fresnel reflection: same linear-light gradient. */
export const SKY_GRADIENT_GLSL = `
vec3 tropicalSky(vec3 direction){
  float altitude=pow(clamp(direction.y,0.,1.),.34);
  vec3 c=mix(uHorizon,uZenith,altitude);
  float solar=max(0.,dot(direction,uSun));
  c+=vec3(1.,.78,.44)*pow(solar,44.)*.09;
  return c;
}`;
