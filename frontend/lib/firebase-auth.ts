const SESSION_KEY = "printx.firebase.session";

export type AuthSession = {
  email: string;
  displayName: string;
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

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

function getFirebaseApiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}

async function requestFirebaseAuth(endpoint: string, email: string, password: string) {
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
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
  } satisfies AuthSession;
}

async function requestFirebaseProviderAuth(accessToken: string) {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    throw new Error("Firebase Authentication is not configured. Add NEXT_PUBLIC_FIREBASE_API_KEY to frontend/.env.local.");
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody: `access_token=${encodeURIComponent(accessToken)}&providerId=google.com`,
      requestUri: window.location.origin,
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  });
  const data = await response.json() as FirebaseAuthResponse & { error?: { message?: string } };

  if (!response.ok || !data.idToken) {
    throw new Error(firebaseErrorMessage(data.error?.message));
  }

  return {
    email: data.email,
    displayName: data.displayName ?? data.email.split("@")[0],
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
    case "WEAK_PASSWORD : Password should be at least 6 characters": return "Use a password with at least 6 characters.";
    default: return "Firebase Authentication could not complete that request.";
  }
}

export function signInWithFirebase(email: string, password: string) {
  return requestFirebaseAuth("accounts:signInWithPassword", email.trim(), password);
}

export function signUpWithFirebase(email: string, password: string) {
  return requestFirebaseAuth("accounts:signUp", email.trim(), password);
}

export function signInWithGoogle() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to frontend/.env.local.");
  if (typeof window === "undefined" || !window.google?.accounts?.oauth2) {
    throw new Error("Google sign-in is still loading. Please try again in a moment.");
  }

  return new Promise<AuthSession>((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error("Google sign-in was cancelled or could not be completed."));
          return;
        }
        void requestFirebaseProviderAuth(response.access_token).then(resolve).catch(reject);
      },
    });
    tokenClient?.requestAccessToken({ prompt: "select_account" });
  });
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
    return JSON.parse(stored) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}
