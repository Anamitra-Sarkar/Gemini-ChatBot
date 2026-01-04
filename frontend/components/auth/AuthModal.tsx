"use client"

import React, { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAnonymous, upgradeAnonymousWithEmail, linkWithGoogle } from "../../lib/firebase";
import { auth } from "../../lib/firebase";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-[#0f1720] rounded-lg shadow-xl w-96 p-6">
        <h3 className="text-lg font-semibold">Sign in to Gemini Clone</h3>
        <div className="mt-4 space-y-3">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const current = auth?.currentUser;
                if (current && current.isAnonymous) {
                  await linkWithGoogle(current);
                } else {
                  await signInWithGoogle();
                }
                onClose();
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            }}
            className="w-full py-2 bg-white border rounded-md flex items-center justify-center gap-2"
          >
            <img src="/google.svg" alt="google" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="w-full border-t pt-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-2 rounded border bg-transparent"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full p-2 rounded border bg-transparent mt-2"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await signInWithEmail(email, password);
                    onClose();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Sign in
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const current = auth?.currentUser;
                    if (current && current.isAnonymous) {
                      await upgradeAnonymousWithEmail(current, email, password);
                    } else {
                      await signUpWithEmail(email, password);
                    }
                    onClose();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-2 border rounded"
              >
                Create account
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await signInAnonymous();
                  onClose();
                } catch (e) {
                  console.error(e);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2 bg-gray-100 rounded"
            >
              Continue as guest
            </button>
          </div>

          <div className="text-sm text-gray-500 mt-2">By continuing you agree to the Terms.</div>
        </div>
      </div>
    </div>
  );
}
