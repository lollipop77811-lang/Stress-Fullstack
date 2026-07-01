import { useEffect, useState, useCallback, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider, firebaseEnabled } from "@/lib/firebase";

/* ---------- types ---------- */

export type AccountData = {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  provider: "google" | "password";
  confessionIds: string[];
  createdAt?: string;
  lastLoginAt?: string;
};

export type AuthState = {
  user: FirebaseUser | null;
  account: AccountData | null;
  loading: boolean;
  error: string | null;
};

/* ---------- API helpers ---------- */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

async function verifyAccount(idToken: string, username?: string): Promise<AccountData> {
  const res = await fetch(`${API_URL}/auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.account;
}

async function fetchAccount(idToken: string): Promise<AccountData | null> {
  try {
    const res = await fetch(`${API_URL}/account`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.account;
  } catch {
    return null;
  }
}

async function syncConfessions(idToken: string, confessionIds: string[]): Promise<string[]> {
  const res = await fetch(`${API_URL}/account/sync-confessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ confessionIds }),
  });
  if (!res.ok) throw new Error("sync failed");
  const data = await res.json();
  return data.confessionIds;
}

/* ---------- hook ---------- */

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    account: null,
    loading: true,
    error: null,
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!firebaseEnabled || !auth) {
      setState({ user: null, account: null, loading: false, error: null });
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMountedRef.current) return;

      if (!firebaseUser) {
        setState({ user: null, account: null, loading: false, error: null });
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        const account = await fetchAccount(idToken);
        setState({ user: firebaseUser, account, loading: false, error: null });
      } catch (err) {
        setState({
          user: firebaseUser,
          account: null,
          loading: false,
          error: err instanceof Error ? err.message : "failed to load account",
        });
      }
    });

    return () => {
      isMountedRef.current = false;
      unsub();
    };
  }, []);

  /* --- Sign up with email --- */
  const signUpWithEmail = useCallback(
    async (email: string, password: string, username: string) => {
      if (!auth) throw new Error("auth not configured");
      if (!email.toLowerCase().endsWith("@gmail.com")) {
        throw new Error("only @gmail.com addresses are allowed.");
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        // Check username availability first
        const checkRes = await fetch(
          `${API_URL}/auth/check-username?username=${encodeURIComponent(username)}`
        );
        const checkData = await checkRes.json();
        if (!checkData.available) {
          throw new Error(checkData.reason === "reserved" ? "that username is reserved." : "that username is taken.");
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });

        // Send email verification
        await sendEmailVerification(cred.user);

        // Create account on our backend
        const idToken = await cred.user.getIdToken();
        const account = await verifyAccount(idToken, username);

        setState({ user: cred.user, account, loading: false, error: null });
        return account;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "signup failed";
        setState((s) => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    []
  );

  /* --- Sign in with email --- */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("auth not configured");

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const account = await verifyAccount(idToken);

      setState({ user: cred.user, account, loading: false, error: null });
      return account;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "login failed";
      setState((s) => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  }, []);

  /* --- Sign in with Google --- */
  const signInWithGoogle = useCallback(async () => {
    if (!auth || !googleProvider) throw new Error("auth not configured");

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      const account = await verifyAccount(idToken);

      setState({ user: cred.user, account, loading: false, error: null });
      return account;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setState((s) => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  }, []);

  /* --- Forgot password --- */
  const resetPassword = useCallback(async (email: string) => {
    if (!auth) throw new Error("auth not configured");
    await sendPasswordResetEmail(auth, email);
  }, []);

  /* --- Sign out --- */
  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    setState({ user: null, account: null, loading: false, error: null });
  }, []);

  /* --- Sync confessions to account --- */
  const syncMyConfessions = useCallback(async (confessionIds: string[]) => {
    if (!state.user) return;
    try {
      const idToken = await state.user.getIdToken();
      const synced = await syncConfessions(idToken, confessionIds);

      // Update account state with merged list
      setState((s) => ({
        ...s,
        account: s.account ? { ...s.account, confessionIds: synced } : s.account,
      }));

      return synced;
    } catch (err) {
      console.warn("[useAuth] sync failed:", err);
    }
  }, [state.user]);

  return {
    ...state,
    firebaseEnabled,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    resetPassword,
    logout,
    syncMyConfessions,
  };
}
