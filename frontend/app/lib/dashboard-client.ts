"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "./firebase";
import { AppError, type ErrorPayload, reportClientError } from "./errors";

interface DashboardState<T> { data?: T; loading: boolean; error?: ErrorPayload; }

export function useDashboardData<T>(endpoint: string): DashboardState<T> & { retry: () => void } {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<DashboardState<T>>(firebaseAuth ? { loading: true } : { loading: false, error: { errorCode: "FIREBASE_NOT_CONFIGURED", message: "Firebase is not configured. Add the public Firebase environment variables before signing in.", requestId: "px-config-firebase" } });
  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) return;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState({ loading: false, error: { errorCode: "AUTH_REQUIRED", message: "Sign in to view this workspace.", requestId: "px-auth-required" } });
        return;
      }
      void user.getIdToken().then(async (token) => {
        let response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (response.status === 401) {
          const refreshedToken = await user.getIdToken(true);
          response = await fetch(endpoint, { headers: { Authorization: `Bearer ${refreshedToken}` }, cache: "no-store" });
        }
        const payload = await response.json() as T | ErrorPayload;
        if (!response.ok) throw new AppError((payload as ErrorPayload).errorCode ?? "API_REQUEST_FAILED", (payload as ErrorPayload).message ?? "The dashboard could not be loaded.", response.status, { requestId: (payload as ErrorPayload).requestId });
        if (active) setState({ loading: false, data: payload as T });
      }).catch((error: unknown) => {
        if (!active) return;
        const detail = error instanceof AppError ? { errorCode: error.code, message: error.message, requestId: String(error.details?.requestId ?? "px-client-request") } : { errorCode: "API_REQUEST_FAILED" as const, message: "The dashboard could not be loaded.", requestId: "px-client-request" };
        setState({ loading: false, error: detail });
        if (error instanceof AppError && error.code === "AUTH_REQUIRED") void signOut(auth);
        void reportClientError(error, { route: endpoint, requestId: detail.requestId });
      });
    });
    return () => { active = false; unsubscribe(); };
  }, [endpoint, reloadKey]);

  return { ...state, retry };
}
