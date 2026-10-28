#!/usr/bin/env node
/**
 * `npm run dev` — servidor de desarrollo + generador de tokens en modo watch.
 *
 * Genera los tokens una vez (si tokens.yml no es válido, no arranca), luego
 * lanza el watcher y `next dev` en paralelo. Al guardar tokens.yml el watcher
 * reescribe tokens.generated.css y Turbopack lo recarga en caliente.
 * Si `next dev` termina, el watcher termina con él.
 */

import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = resolve(ROOT, "scripts/generate-tokens.mjs");

const first = spawnSync(process.execPath, [TOKENS], { cwd: ROOT, stdio: "inherit" });
if (first.status !== 0) process.exit(first.status ?? 1);

const watcher = spawn(process.execPath, [TOKENS, "--watch"], { cwd: ROOT, stdio: "inherit" });

const next = spawn("next", ["dev", "--turbopack", ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NEXT_DIST_DIR: ".next-dev" },
});

next.on("exit", (code, signal) => {
  watcher.kill();
  process.exit(code ?? (signal ? 1 : 0));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    watcher.kill(signal);
    next.kill(signal);
  });
}
