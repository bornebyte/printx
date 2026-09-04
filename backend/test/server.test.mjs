import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("backend exposes the expected API entrypoints", async () => {
  const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");
  assert.match(source, /createServer/);
  assert.match(source, /\/health/);
  assert.match(source, /\/api\/me\/printers/);
  assert.match(source, /\/api\/print-jobs/);
  assert.match(source, /\/api\/agent\/jobs/);
  assert.match(source, /agentToken/);
});
