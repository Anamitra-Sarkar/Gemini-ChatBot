"use client"

import React, { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAnonymous, upgradeAnonymousWithEmail, linkWithGoogle, isAuthAvailable } from "../../lib/firebase";
import { auth } from "../../lib/firebase";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const authEnabled = isAuthAvailable();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-[#0f1720] rounded-lg shadow-xl w-96 p-6">
        <h3 className="text-lg font-semibold">Sign in to Gemini Clone</h3>
        
        {!authEnabled && (
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-sm">
            Authentication is currently unavailable. Please configure Firebase environment variables to enable login.
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        <div className="mt-4 space-y-3">
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const current = auth?.currentUser;
                if (current && current.isAnonymous) {
                  await linkWithGoogle(current);
                } else {
                  await signInWithGoogle();
                }
                onClose();
              } catch (e: any) {
                console.error(e);
                setError(e.message || 'Failed to sign in with Google');
              } finally {
                setLoading(false);
              }
            }}
            disabled={!authEnabled || loading}
            className="w-full py-2 bg-white border rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/google.svg" alt="google" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="w-full border-t pt-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={!authEnabled || loading}
              className="w-full p-2 rounded border bg-transparent disabled:opacity-50"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              disabled={!authEnabled || loading}
              className="w-full p-2 rounded border bg-transparent mt-2 disabled:opacity-50"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    await signInWithEmail(email, password);
                    onClose();
                  } catch (e: any) {
                    console.error(e);
                    setError(e.message || 'Failed to sign in');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!authEnabled || loading}
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign in
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const current = auth?.currentUser;
                    if (current && current.isAnonymous) {
                      await upgradeAnonymousWithEmail(current, email, password);
                    } else {
                      await signUpWithEmail(email, password);
                    }
                    onClose();
                  } catch (e: any) {
                    console.error(e);
                    setError(e.message || 'Failed to create account');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!authEnabled || loading}
                className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create account
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await signInAnonymous();
                  onClose();
                } catch (e: any) {
                  console.error(e);
                  setError(e.message || 'Failed to sign in as guest');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!authEnabled || loading}
              className="w-full py-2 bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue as guest
            </button>
          </div>

          <div className="text-sm text-gray-500 mt-2">By continuing you agree to the Terms.</div>
          
          <button
            onClick={onClose}
            className="w-full py-2 mt-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
