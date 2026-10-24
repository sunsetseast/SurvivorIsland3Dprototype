/** Lightweight browser checks through Chromium's DevTools Protocol. */
export async function connectBrowser() {
  const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
  const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  return { call, evaluate, errors, close: () => ws.close() };
}
export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
