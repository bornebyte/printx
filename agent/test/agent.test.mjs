import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("agent contains the cross-platform worker and local dashboard entrypoints", async () => {
  const source = await readFile(new URL("../agent.mjs", import.meta.url), "utf8");
  assert.match(source, /createServer/);
  assert.match(source, /PRINTX_BACKEND_URL/);
  assert.match(source, /X-PrintX-Local-Key/);
  assert.match(source, /\/api\/agent\/jobs/);
});

test("agent isolates printer behavior behind an adapter", async () => {
  const source = await readFile(new URL("../printer-adapter.mjs", import.meta.url), "utf8");
  assert.match(source, /printDocument/);
  assert.match(source, /process\.platform/);
});
