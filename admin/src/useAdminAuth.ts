import { useEffect, useState } from "react";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export type AdminAccount = {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
};

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAccount(null);
        setLoading(false);
        return;
      }
      try {
        const idToken = await firebaseUser.getIdToken();
        const res = await fetch("/api/account", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error("failed to fetch account");
        const data = await res.json();
        setUser(firebaseUser);
        setAccount(data.account);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "auth failed");
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error("auth not configured");
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!data.account?.isAdmin) {
        setError("this account is not an admin.");
        return;
      }
      setUser(cred.user);
      setAccount(data.account);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "login failed";
      const map: Record<string, string> = {
        "auth/wrong-password": "incorrect password.",
        "auth/user-not-found": "no account found.",
        "auth/invalid-credential": "incorrect email or password.",
        "auth/too-many-requests": "too many attempts. wait a minute.",
      };
      setError(map[raw] || raw);
    }
  };

  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) throw new Error("auth not configured");
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!data.account?.isAdmin) {
        setError("this Google account is not an admin.");
        return;
      }
      setUser(cred.user);
      setAccount(data.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    }
  };

  const logout = async () => {
    if (!auth) return;
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    setUser(null);
    setAccount(null);
  };

  const getToken = async () => {
    if (!user) return null;
    return await user.getIdToken();
  };

  const uploadAvatar = async (file: File) => {
    const token = await getToken();
    if (!token) return;
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch("/api/admin/avatar", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("upload failed");
    const data = await res.json();
    // Update account state with new avatar URL
    setAccount((prev) => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev);
    return data.avatarUrl;
  };

  return { user, account, loading, error, loginWithEmail, loginWithGoogle, logout, getToken, uploadAvatar, firebaseEnabled: !!auth };
}
