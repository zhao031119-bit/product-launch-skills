// Lets `node --test` run the vitest-style tests under skills/ without
// installing vitest: "vitest" resolves to the shim next to this file, and an
// extensionless relative import falls back to its .ts file.
import { registerHooks } from 'node:module';

const shim = new URL('./vitest-shim.mjs', import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'vitest') return nextResolve(shim, context);
    if (!specifier.startsWith('.')) return nextResolve(specifier, context);
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
