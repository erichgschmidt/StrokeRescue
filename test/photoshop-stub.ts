// Test-only stub for the "photoshop" UXP host module. Pure functions can load
// through this; anything that actually invokes a PS API throws loudly.
const trap = (name: string) => new Proxy({}, {
  get: (_t, k) => { throw new Error(`photoshop.${name}.${String(k)} called in test (no PS host)`); },
  apply: () => { throw new Error(`photoshop.${name} called in test (no PS host)`); },
});

export const app = trap("app");
export const action = trap("action");
export const core = trap("core");
export const imaging = trap("imaging");
export const constants = {};
