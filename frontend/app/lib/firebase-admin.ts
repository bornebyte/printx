import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { AppError } from "./errors";

function getAdminAuth() {
  const credentials = readAdminCredentials();
  const { projectId, clientEmail, privateKey } = credentials;
  if (!projectId || !clientEmail || !privateKey) throw new AppError("FIREBASE_ADMIN_NOT_CONFIGURED", "Firebase Admin configuration is missing. Add the server-only Firebase Admin environment variables.", 503);
  try {
    const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return getAuth(app);
  } catch (error) {
    const providerCode = getProviderCode(error);
    console.error(JSON.stringify({ source: "server", subsystem: "firebase-admin", errorCode: "FIREBASE_ADMIN_NOT_CONFIGURED", providerCode, message: error instanceof Error ? error.message : String(error) }));
    throw new AppError("FIREBASE_ADMIN_NOT_CONFIGURED", "Firebase Admin credentials could not be initialized. Check the server-only project, client email, and private key values.", 503, { providerCode });
  }
}

function readAdminCredentials(): { projectId?: string; clientEmail?: string; privateKey?: string } {
  let projectId = cleanEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID);
  let clientEmail = cleanEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  let privateKey = cleanEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (privateKey?.startsWith("{")) {
    try {
      const serviceAccount = JSON.parse(privateKey) as { project_id?: string; client_email?: string; private_key?: string };
      projectId ||= serviceAccount.project_id;
      clientEmail ||= serviceAccount.client_email;
      privateKey = serviceAccount.private_key;
    } catch {
      throw new AppError("FIREBASE_ADMIN_NOT_CONFIGURED", "FIREBASE_ADMIN_PRIVATE_KEY contains invalid service-account JSON or PEM data.", 503);
    }
  }

  return { projectId, clientEmail, privateKey: privateKey?.replace(/\\n/g, "\n") };
}

function cleanEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  return trimmed;
}

export async function requireFirebaseUser(request: Request): Promise<{ uid: string; email?: string; name?: string }> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new AppError("AUTH_REQUIRED", "Sign in is required to access this workspace.", 401);
  const adminAuth = getAdminAuth();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch (error) {
    const providerCode = getProviderCode(error);
    console.error(JSON.stringify({ source: "server", subsystem: "firebase-admin", errorCode: "AUTH_REQUIRED", providerCode, message: error instanceof Error ? error.message : String(error) }));
    throw new AppError("AUTH_REQUIRED", "Your session is invalid or has expired. Please sign in again.", 401, { providerCode });
  }
}

function getProviderCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") return error.code;
  return "unknown";
}
