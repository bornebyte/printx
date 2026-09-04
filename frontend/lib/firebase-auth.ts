const SESSION_KEY = "printx.firebase.session";

export type AuthSession = {
  email: string;
  displayName: string;
  role: "user" | "owner";
  idToken: string;
  refreshToken: string;
  localId: string;
};

type FirebaseAuthResponse = {
  email: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  localId: string;
};

type FirebaseUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  refreshToken?: string;
  getIdToken: () => Promise<string>;
};

type FirebaseAuthInstance = {
  signInWithPopup: (provider: unknown) => Promise<{ user: FirebaseUser }>;
};

type FirebaseCompat = {
  apps: unknown[];
  initializeApp: (config: Record<string, string | undefined>) => void;
  auth: (() => FirebaseAuthInstance) & { GoogleAuthProvider: new () => unknown };
};

declare global {
  interface Window {
    firebase?: FirebaseCompat;
  }
}

function getFirebaseApiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}

function getFirebaseWebConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

async function requestFirebaseAuth(endpoint: string, email: string, password: string, role: AuthSession["role"]) {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    throw new Error("Firebase Authentication is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY to frontend/.env.local.");
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await response.json() as FirebaseAuthResponse & { error?: { message?: string } };

  if (!response.ok || !data.idToken) {
    throw new Error(firebaseErrorMessage(data.error?.message));
  }

  return {
    email: data.email,
    displayName: data.displayName ?? data.email.split("@")[0],
    role,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
  } satisfies AuthSession;
}

function firebaseErrorMessage(code?: string) {
  switch (code) {
    case "EMAIL_EXISTS": return "An account already exists for this email.";
    case "EMAIL_NOT_FOUND": return "No PrintX account was found for this email.";
    case "INVALID_PASSWORD": return "The password is incorrect.";
    case "INVALID_LOGIN_CREDENTIALS": return "The email or password is incorrect.";
    case "INVALID_EMAIL": return "Enter a valid email address.";
    case "USER_DISABLED": return "This Firebase account has been disabled.";
    case "OPERATION_NOT_ALLOWED": return "This sign-in provider is disabled. Enable it in Firebase Console → Authentication → Sign-in method.";
    case "INVALID_API_KEY": return "The Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in frontend/.env.local.";
    case "INVALID_IDP_RESPONSE": return "Google did not return a valid sign-in response. Check the Google OAuth client and authorized origins.";
    case "INVALID_PROVIDER_ID": return "Google sign-in is not configured for this Firebase project.";
    case "TOO_MANY_ATTEMPTS_TRY_LATER": return "Too many attempts. Wait a little and try again.";
    default:
      if (code?.startsWith("WEAK_PASSWORD")) return "Use a password with at least 6 characters.";
      return `Firebase Authentication returned ${code ?? "an unknown error"}. Check the Firebase provider and authorized-domain settings.`;
  }
}

function googleErrorMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  switch (code) {
    case "auth/popup-closed-by-user": return "Google sign-in was cancelled.";
    case "auth/popup-blocked": return "Your browser blocked the Google sign-in popup. Allow popups for PrintX and try again.";
    case "auth/unauthorized-domain": return "This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed": return "Google sign-in is disabled. Enable Google under Firebase Authentication → Sign-in method.";
    case "auth/account-exists-with-different-credential": return "An account already exists with another sign-in method. Sign in with email first.";
    default: return code ? `Google sign-in returned ${code}. Check the Firebase Google provider settings.` : "Google sign-in could not be completed.";
  }
}

export function signInWithFirebase(email: string, password: string, role: AuthSession["role"] = "user") {
  return requestFirebaseAuth("accounts:signInWithPassword", email.trim(), password, role);
}

export function signUpWithFirebase(email: string, password: string, role: AuthSession["role"] = "user") {
  return requestFirebaseAuth("accounts:signUp", email.trim(), password, role);
}

export function signInWithGoogle(role: AuthSession["role"] = "user") {
  if (typeof window === "undefined" || !window.firebase) throw new Error("Firebase Google sign-in is still loading. Please try again in a moment.");
  const firebase = window.firebase;
  const config = getFirebaseWebConfig();
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) throw new Error("Firebase web config is incomplete. Add NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, and APP_ID to frontend/.env.local.");

  return (async () => {
    try {
      if (firebase.apps.length === 0) firebase.initializeApp(config);
      const auth = firebase.auth();
      const result = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      const user = result.user;
      const idToken = await user.getIdToken();
      if (!user.email) throw new Error("Google did not return an email address.");
      return {
        email: user.email,
        displayName: user.displayName ?? user.email.split("@")[0],
        role,
        idToken,
        refreshToken: user.refreshToken ?? "",
        localId: user.uid,
      } satisfies AuthSession;
    } catch (error) {
      if (error instanceof Error && error.message === "Google did not return an email address.") throw error;
      throw new Error(googleErrorMessage(error));
    }
  })();
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as Partial<AuthSession>;
    if (!session.email || !session.idToken || !session.localId) return null;
    return { ...session, role: session.role === "owner" ? "owner" : "user" } as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}
