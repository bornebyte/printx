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
  assert.match(source, /createFirestoreStore/);
  assert.match(source, /PRINTX_STORAGE/);
  assert.match(source, /ensureBackendReady/);
  assert.match(source, /already registered as a/);
  assert.doesNotMatch(source, /const firestoreStore = storageMode/);
});

test("Firestore adapter keeps service-account configuration server-side", async () => {
  const source = await readFile(new URL("../firestore.mjs", import.meta.url), "utf8");
  assert.match(source, /FIREBASE_SERVICE_ACCOUNT_FILE/);
  assert.match(source, /oauth2\.googleapis\.com\/token/);
  assert.match(source, /firestore\.googleapis\.com/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT/);
});
