"use client"

import React, { useState } from "react";
import ErrorModal from "../ui/ErrorModal";

export default function GeminiLanding() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | undefined>(undefined);

  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  async function checkHealth() {
    try {
      const res = await fetch(`${base}/health`, { cache: "no-store" });
      if (!res.ok) throw new Error(`health check failed: ${res.status}`);
      const j = await res.json();
      return j;
    } catch (e: any) {
      // treat as backend unavailable
      return null;
    }
  }

  function showError(msg: string) {
    setModalMessage(msg);
    setModalOpen(true);
  }

  async function onAsk() {
    setResult(null);
    setLoading(true);
    try {
      const health = await checkHealth();
      if (!health) {
        showError("Backend unreachable or not configured. Showing a local preview response instead.");
        // local simulated response
        setResult("(Preview) Sure — try: build a smart note taker that summarizes meetings and extracts action items.");
        return;
      }

      // If backend health indicates Gemini enabled, try calling backend, else fallback to simulated
      if (health.checks && health.checks.gemini) {
        try {
          const res = await fetch(`${base}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: query }),
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Request failed: ${res.status}`);
          }
          const j = await res.json();
          // show server response if any, else fallback
          setResult(j.text || j.message || JSON.stringify(j));
        } catch (e: any) {
          showError(`Backend generation failed: ${e.message || e}`);
          // fallback preview
          setResult(`(Preview) ${query} — Example response: Try refining your prompt.`);
        }
      } else {
        showError("Gemini API not configured on backend. Showing a local preview response instead.");
        setResult(`(Preview) ${query} — Example response: Build a lightweight AI note-taker.`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onCreateImage() {
    setResult(null);
    setLoading(true);
    try {
      const health = await checkHealth();
      if (!health || !(health.checks && health.checks.nano_banana)) {
        showError("Image generation is not configured on the backend. Showing a local placeholder image.");
        setResult("[Local placeholder image generated] — gradient artwork");
        return;
      }
      try {
        const res = await fetch(`${base}/image/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: query }),
        });
        if (!res.ok) throw new Error(`Image endpoint failed: ${res.status}`);
        const j = await res.json();
        setResult(j.url || JSON.stringify(j));
      } catch (e: any) {
        showError(`Image generation failed: ${e.message || e}`);
        setResult("[Local placeholder image generated] — gradient artwork");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05060a] text-white flex">
      <ErrorModal open={modalOpen} title="Service Notice" message={modalMessage} onClose={() => setModalOpen(false)} />

      <aside className="w-80 bg-[#0b0f14] border-r border-[#111417] p-4 flex flex-col glass-strong">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Gemini</div>
          <div className="text-xs opacity-70">PRO</div>
        </div>

        <div className="mb-4">
          <button className="w-full text-left px-3 py-2 rounded-md bg-[#0f1720] hover:bg-[#111722] transition">New chat</button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="text-xs uppercase opacity-60 mb-2">My Stuff</div>
          <div className="space-y-2 mb-4">
            <div className="h-12 bg-gradient-to-br from-slate-800 to-slate-700 rounded-md p-2 flex items-center">Service Proposal</div>
            <div className="h-12 bg-gradient-to-br from-slate-800 to-slate-700 rounded-md p-2 flex items-center">Portfolio</div>
          </div>

          <div className="text-xs uppercase opacity-60 mb-2">Chats</div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} role="button" tabIndex={0} onClick={() => alert(`Open Chat ${i+1}`)} className="h-10 rounded-md bg-transparent hover:bg-[#081018] p-2 flex items-center cursor-pointer">Chat {i + 1}</div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs opacity-60">Settings & help</div>
      </aside>

      <main className="flex-1 p-12 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <h2 className="text-xl opacity-70">✨ Hi there</h2>
          <h1 className="text-4xl font-bold mt-2 mb-6">Happy New Year! Let’s make it your best yet</h1>

          <div className="bg-gradient-to-r from-[#081422aa] to-[#0b1632aa] rounded-3xl px-6 py-4 flex items-center gap-4 shadow-lg glass">
            <div className="flex-1">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask Gemini 3" className="bg-transparent w-full outline-none placeholder:opacity-60 text-lg" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => onAsk()} disabled={loading} className="glass-btn">Ask</button>
              <button onClick={() => onCreateImage()} disabled={loading} className="glass-btn">Create image</button>
            </div>
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <button onClick={() => onCreateImage()} className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-600 to-indigo-600 shadow hover:scale-105 transform transition">Create image</button>
            <button onClick={() => onAsk()} className="px-4 py-2 rounded-full glass-btn">Write anything</button>
            <button onClick={() => showError("Video generation requires backend configuration. Enable VEO_API_KEY to use this feature.")} className="px-4 py-2 rounded-full glass-btn">Create video</button>
            <button onClick={() => showError("Grounding/help features require backend configuration.")} className="px-4 py-2 rounded-full glass-btn">Help me learn</button>
          </div>

          <div className="mt-8">
            {loading && <div className="text-sm opacity-70">Working…</div>}
            {result && (
              <div className="mt-4 bg-white/6 p-4 rounded-md glass-strong">
                <div className="text-sm text-gray-200">Result</div>
                <div className="mt-2 text-white">{result}</div>
              </div>
            )}
          </div>

          <div className="mt-10 text-sm opacity-60">Explore the UI — authentication is optional for full functionality. If you enable API keys later, features will call your backend instead of showing previews.</div>
        </div>
      </main>
    </div>
  );
}
