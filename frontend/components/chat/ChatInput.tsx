"use client"
import React, { useEffect, useRef, useState } from "react";
import StreamingCursor from "./StreamingCursor";

type Props = {
  chatId: string | null;
  onStartStreaming: (chatId: string | null, message: string, controller: AbortController, attachments?: string[], grounding?: boolean, mode?: "text"|"image"|"video") => void;
  streaming: boolean;
  idToken?: string | null;
};

export default function ChatInput({ chatId, onStartStreaming, streaming, idToken }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [grounding, setGrounding] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"text"|"image"|"video">("text");

  useEffect(() => {
    if (!streaming && textareaRef.current) textareaRef.current.focus();
  }, [streaming]);

  return (
    <div className="p-4 border-t bg-slate-100 dark:bg-[#04101a]">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <textarea
          ref={textareaRef}
          className="flex-1 min-h-[60px] max-h-[200px] p-3 rounded border bg-white dark:bg-[#071422] text-black dark:text-white resize-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={streaming}
          placeholder={streaming ? "Generating..." : "Ask anything..."}
        />
            <div className="flex gap-2 mt-2 items-center">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={grounding} onChange={(e) => setGrounding(e.target.checked)} /> Use grounding
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm">Mode:</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="border rounded px-2 py-1">
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="px-2 py-1 bg-gray-200 rounded">Attach</button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => {
                const f = e.target.files;
                if (f && f.length) setFiles((s) => [...s, f[0]]);
              }} />
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-2 flex gap-2">
              {files.map((f, i) => (
                <div key={i} className="px-2 py-1 bg-slate-200 rounded flex items-center gap-2">
                  <span className="text-sm">{f.name}</span>
                  <button onClick={() => setFiles((s) => s.filter((_, idx) => idx !== i))} className="text-red-600">x</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
            <button
            className={`px-3 py-2 rounded ${streaming ? "bg-gray-400" : "bg-blue-600 text-white"}`}
            disabled={streaming || !value.trim()}
            onClick={() => {
              const c = new AbortController();
              // upload attachments first if any
              (async () => {
                let attachmentIds: string[] = [];
                try {
                  for (const f of files) {
                    const fd = new FormData();
                    fd.append("file", f, f.name);
                    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/files/upload`, {
                      method: "POST",
                      body: fd,
                      headers: { Authorization: `Bearer ${idToken || ""}` },
                    });
                    const j = await res.json();
                    if (j.ok && j.attachment_id) attachmentIds.push(j.attachment_id);
                  }
                } catch (e) {
                  // ignore upload errors here and proceed without attachments
                }
                onStartStreaming(chatId, value.trim(), c, attachmentIds, grounding, mode);
              })();
              setValue("");
              setFiles([]);
            }}
          >
            Send
          </button>
          {streaming && (
            <button
              onClick={() => {
                // signal abort via window event handled in parent
                window.dispatchEvent(new CustomEvent("chat-stop"));
              }}
              className="px-3 py-1 rounded bg-red-600 text-white text-sm"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
