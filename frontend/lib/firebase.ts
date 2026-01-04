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

// Check if Firebase config is valid (has required keys)
function isFirebaseConfigValid(): boolean {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== '' &&
    firebaseConfig.projectId && 
    firebaseConfig.projectId !== ''
  );
}

// Initialize Firebase only on client side and only if config is valid
let app;
let auth: ReturnType<typeof getAuth> | undefined;
let isFirebaseEnabled = false;

if (typeof window !== 'undefined' && isFirebaseConfigValid()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence);
    isFirebaseEnabled = true;
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    isFirebaseEnabled = false;
  }
} else if (typeof window !== 'undefined') {
  console.warn('Firebase config is incomplete. Auth features will be disabled. Please add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.');
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
  if (!auth) {
    console.warn('Firebase Auth not available');
    return '';
  }
  return await user.getIdToken();
}

export async function signInAnonymous() {
  if (!auth) {
    console.warn('Firebase Auth not available - cannot sign in anonymously');
    return null;
  }
  return await signInAnonymously(auth);
}

export async function signOut() {
  if (!auth) {
    console.warn('Firebase Auth not available');
    return;
  }
  return await firebaseSignOut(auth);
}

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please configure Firebase environment variables.');
  }
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please configure Firebase environment variables.');
  }
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please configure Firebase environment variables.');
  }
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function upgradeAnonymousWithEmail(user: User, email: string, password: string) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please configure Firebase environment variables.');
  }
  const credential = EmailAuthProvider.credential(email, password);
  return await linkWithCredential(user, credential);
}

export async function linkWithGoogle(user: User) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Please configure Firebase environment variables.');
  }
  const provider = new GoogleAuthProvider();
  return await linkWithPopup(user, provider);
}

export function isAuthAvailable(): boolean {
  return isFirebaseEnabled && Boolean(auth);
}
