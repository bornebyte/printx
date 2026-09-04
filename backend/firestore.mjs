import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function encodeJwtPart(value) {
  return base64Url(JSON.stringify(value));
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: "NULL_VALUE" };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value) {
  if (!value) return null;
  if (Object.hasOwn(value, "nullValue")) return null;
  if (Object.hasOwn(value, "booleanValue")) return value.booleanValue;
  if (Object.hasOwn(value, "integerValue")) return Number(value.integerValue);
  if (Object.hasOwn(value, "doubleValue")) return value.doubleValue;
  if (Object.hasOwn(value, "stringValue")) return value.stringValue;
  if (Object.hasOwn(value, "timestampValue")) return value.timestampValue;
  if (Object.hasOwn(value, "bytesValue")) return value.bytesValue;
  if (Object.hasOwn(value, "referenceValue")) return value.referenceValue;
  if (Object.hasOwn(value, "geoPointValue")) return value.geoPointValue;
  if (Object.hasOwn(value, "arrayValue")) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if (Object.hasOwn(value, "mapValue")) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, fromFirestoreValue(item)]));
  return null;
}

function readServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    try { return JSON.parse(inline); } catch { throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON."); }
  }
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (encoded) {
    try { return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")); } catch { throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 must contain valid base64-encoded service-account JSON."); }
  }
  return null;
}

export async function createFirestoreStore() {
  const inlineAccount = readServiceAccount();
  let fileAccount = null;
  if (!inlineAccount && process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
    try {
      fileAccount = JSON.parse(await readFile(resolve(process.env.FIREBASE_SERVICE_ACCOUNT_FILE), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") throw new Error(`Firebase service-account file was not found: ${process.env.FIREBASE_SERVICE_ACCOUNT_FILE}`);
      if (error instanceof SyntaxError) throw new Error("FIREBASE_SERVICE_ACCOUNT_FILE must contain valid service-account JSON.");
      throw error;
    }
  }
  const account = inlineAccount ?? fileAccount;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? account?.project_id;
  if (!account?.client_email || !account?.private_key || !projectId) throw new Error("Firestore is enabled but credentials are missing. Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_FILE, FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_SERVICE_ACCOUNT_BASE64.");

  const privateKey = account.private_key.replace(/\\n/g, "\n");
  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/printx/state`;
  let cachedToken = null;

  async function accessToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encodeJwtPart({ alg: "RS256", typ: "JWT" })}.${encodeJwtPart({ iss: account.client_email, scope: FIRESTORE_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3_600 })}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    const assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;
    const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error(`Google service-account token request failed (${response.status}).`);
    cachedToken = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3_600) * 1_000 };
    return cachedToken.value;
  }

  async function request(method, url, body) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Firestore ${method} failed (${response.status}): ${data.error?.message ?? "Unknown Firestore error."}`);
    return data;
  }

  return {
    mode: "firestore",
    async load() {
      try {
        const data = await request("GET", root);
        return fromFirestoreValue(data.fields?.state);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Firestore GET failed (404)")) return null;
        throw error;
      }
    },
    save(value) {
      return request("PATCH", `${root}?updateMask.fieldPaths=state`, { fields: { state: firestoreValue(value) } });
    },
  };
}
