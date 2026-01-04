"use client"

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, onAuthChange, onIdTokenChange, getIdToken, signInAnonymous, signOut, isAuthAvailable } from "../lib/firebase";
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
  isAuthEnabled: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthEnabled, setIsAuthEnabled] = useState(false);

  useEffect(() => {
    // Check if auth is available
    const authEnabled = isAuthAvailable();
    setIsAuthEnabled(authEnabled);

    if (!authEnabled) {
      console.log('Firebase Auth is not configured. App will run without authentication.');
      setLoading(false);
      return;
    }

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
          console.warn('Failed to sign in anonymously:', e);
          setLoading(false);
        }
      }
    })();

    return () => {
      unsub();
      unsubToken();
    };
  }, []);

  async function _signOut() {
    if (!isAuthEnabled) {
      console.warn('Auth is not enabled');
      return;
    }
    await signOut();
    setUser(null);
    setFirebaseUser(null);
    setIdToken(null);
  }

  async function _signInAnonymously() {
    if (!isAuthEnabled) {
      console.warn('Auth is not enabled');
      return;
    }
    await signInAnonymous();
  }

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        firebaseUser, 
        idToken, 
        loading, 
        signInAnonymously: _signInAnonymously, 
        signOut: _signOut,
        isAuthEnabled 
      }}
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
