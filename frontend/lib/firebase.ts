"use client"

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  linkWithCredential,
  EmailAuthProvider,
  linkWithPopup,
  browserLocalPersistence,
  setPersistence,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};

// Initialize Firebase only on client side
let app;
let auth: ReturnType<typeof getAuth> | undefined;

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence);
}

export { auth };

// Auth helpers
export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export function onIdTokenChange(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  return onIdTokenChanged(auth, callback);
}

export async function getIdToken(user: User): Promise<string> {
  return await user.getIdToken();
}

export async function signInAnonymous() {
  if (!auth) throw new Error('Auth not initialized');
  return await signInAnonymously(auth);
}

export async function signOut() {
  if (!auth) throw new Error('Auth not initialized');
  return await firebaseSignOut(auth);
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Auth not initialized');
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  if (!auth) throw new Error('Auth not initialized');
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  if (!auth) throw new Error('Auth not initialized');
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function upgradeAnonymousWithEmail(user: User, email: string, password: string) {
  if (!auth) throw new Error('Auth not initialized');
  const credential = EmailAuthProvider.credential(email, password);
  return await linkWithCredential(user, credential);
}

export async function linkWithGoogle(user: User) {
  if (!auth) throw new Error('Auth not initialized');
  const provider = new GoogleAuthProvider();
  return await linkWithPopup(user, provider);
}
