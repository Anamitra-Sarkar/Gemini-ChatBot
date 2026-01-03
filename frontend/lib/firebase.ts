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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Auth helpers
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function onIdTokenChange(callback: (user: User | null) => void) {
  return onIdTokenChanged(auth, callback);
}

export async function getIdToken(user: User): Promise<string> {
  return await user.getIdToken();
}

export async function signInAnonymous() {
  return await signInAnonymously(auth);
}

export async function signOut() {
  return await firebaseSignOut(auth);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function upgradeAnonymousWithEmail(user: User, email: string, password: string) {
  const credential = EmailAuthProvider.credential(email, password);
  return await linkWithCredential(user, credential);
}

export async function linkWithGoogle(user: User) {
  const provider = new GoogleAuthProvider();
  return await linkWithPopup(user, provider);
}
