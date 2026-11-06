declare const __BUILD_REVISION__: string;
/** Public source revision only; no environment values or account information. */
export const BUILD_REVISION = typeof __BUILD_REVISION__ === "string" ? __BUILD_REVISION__ : "unknown";
