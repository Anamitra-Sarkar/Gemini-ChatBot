"use client"

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, onAuthChange, onIdTokenChange, getIdToken, signInAnonymous, signOut } from "../lib/firebase";
import type { User } from "firebase/auth";
import axios from "axios";

type AuthUser = {
  uid: string;
  email?: string | null;
  isAnonymous?: boolean;
  provider?: string | null;
} | null;

type AuthContextType = {
  user: AuthUser;
  firebaseUser: User | null;
  idToken: string | null;
  loading: boolean;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setFirebaseUser(u);
      if (!u) {
        setUser(null);
        setIdToken(null);
        setLoading(false);
        return;
      }
      const token = await getIdToken(u as User);
      setIdToken(token);
      // Let backend verify token and return normalized user
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:8000"}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
      } catch (e) {
        // If backend verification fails, still set minimal state
        setUser({ uid: u.uid, email: u.email, isAnonymous: u.isAnonymous, provider: u.providerId as any });
      }
      setLoading(false);
    });
    const unsubToken = onIdTokenChange(async (u) => {
      if (!u) return setIdToken(null);
      const token = await getIdToken(u as User);
      setIdToken(token);
    });

    // Auto sign-in anonymous if no user
    (async () => {
      if (auth && !auth.currentUser) {
        try {
          await signInAnonymous();
        } catch (e) {
          // ignore
        }
      }
    })();

    return () => {
      unsub();
      unsubToken();
    };
  }, []);

  async function _signOut() {
    await signOut();
    setUser(null);
    setFirebaseUser(null);
    setIdToken(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, idToken, loading, signInAnonymously: async () => { await signInAnonymous(); }, signOut: _signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}
