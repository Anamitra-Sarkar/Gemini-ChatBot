"use client"
import React, { useEffect, useState, useRef } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import ChatInput from "./ChatInput";
import { useAuth } from "../../context/AuthContext";
type Message = { id: string; role: string; content: string };

export default function ChatLayout() {
  const { user, idToken } = useAuth();
  const uid = user?.uid || "guest";
  const [chats, setChats] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const [inFlightRequest, setInFlightRequest] = useState<string | null>(null);
  const serverChatIdRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // initial load: fetch settings and chats
    (async () => {
      if (!idToken) return;
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!base) {
        setError("NEXT_PUBLIC_BACKEND_URL not configured");
        setSettingsLoaded(true);
        return;
      }
      try {
        setError(null);
        const sres = await fetch(`${base}/settings`, { headers: { Authorization: `Bearer ${idToken}` } });
        if (!sres.ok) throw new Error("Failed to load settings");
        const sjson = await sres.json();
        const lastActive = sjson?.settings?.lastActiveChat;
        const defModel = sjson?.settings?.defaultModel;
        setDefaultModel(defModel || null);

        try {
          const mres = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${idToken}` } });
          if (mres.ok) {
            const mj = await mres.json();
            setAvailableModels(mj.models || []);
          }
        } catch (e) {
          // ignore
        }

        const cres = await fetch(`${base}/history/chats`, { headers: { Authorization: `Bearer ${idToken}` } });
        if (!cres.ok) throw new Error("Failed to load chats");
        const cjson = await cres.json();
        const list = cjson?.chats || [];
        setChats(list);
        if (lastActive && list.find((c: any) => c.id === lastActive)) {
          setActiveId(lastActive);
        } else if (list.length) {
          setActiveId(list[0].id);
        }
        setSettingsLoaded(true);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to contact backend");
        setChats([]);
        setActiveId(null);
        setSettingsLoaded(true);
      }
    })();
  }, [idToken]);

  useEffect(() => {
    // load messages when active chat changes
    (async () => {
      if (!idToken || !activeId) {
        setMessages([]);
        return;
      }
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!base) {
        setError("NEXT_PUBLIC_BACKEND_URL not configured");
        return;
      }
      try {
        setError(null);
        const res = await fetch(`${base}/history/chats/${activeId}`, { headers: { Authorization: `Bearer ${idToken}` } });
        if (!res.ok) throw new Error("Failed to load messages");
        const json = await res.json();
        setMessages(json.messages || []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to contact backend");
        setMessages([]);
      }
    })();
  }, [activeId, idToken]);

  useEffect(() => {
    const onStop = () => {
      controllerRef.current?.abort();
    };
    window.addEventListener("chat-stop", onStop as any);
    return () => window.removeEventListener("chat-stop", onStop as any);
  }, []);

  function newChat() {
    // create chat server-side
    (async () => {
      if (!idToken) return;
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!base) {
        setError("NEXT_PUBLIC_BACKEND_URL not configured");
        return;
      }
      try {
        const res = await fetch(`${base}/history/chats`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New chat", model: defaultModel || undefined }),
        });
        const j = await res.json();
        if (j.ok && j.chat_id) {
          // refresh chat list
          const cres = await fetch(`${base}/history/chats`, { headers: { Authorization: `Bearer ${idToken}` } });
          const cjson = await cres.json();
          setChats(cjson.chats || []);
          setActiveId(j.chat_id);
          // persist active in settings
          await fetch(`${base}/settings`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ lastActiveChat: j.chat_id }),
          });
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to create chat");
      }
    })();
  }

  const retry = async () => {
    setError(null);
    // re-run initial load
    if (idToken) {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!base) {
        setError("NEXT_PUBLIC_BACKEND_URL not configured");
        return;
      }
      try {
        const cres = await fetch(`${base}/history/chats`, { headers: { Authorization: `Bearer ${idToken}` } });
        if (!cres.ok) throw new Error("Failed to load chats");
        const cjson = await cres.json();
        setChats(cjson.chats || []);
        if (cjson.chats && cjson.chats.length) setActiveId(cjson.chats[0].id);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Retry failed");
      }
    }
  }

  function selectChat(id: string) {
    setActiveId(id);
    // persist active chat to server settings
    (async () => {
      if (!idToken) return;
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!base) return;
      try {
        await fetch(`${base}/settings`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ lastActiveChat: id }),
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }

  async function onStartStreaming(chatId: string | null, message: string, ctrl: AbortController, attachments: string[] = [], grounding: boolean = false, mode: "text" | "image" | "video" = "text") {
    if (!idToken) {
      console.error("Auth required");
      return;
    }
    const dev = process.env.NODE_ENV !== "production";
    const startTime = dev ? performance.now() : 0;
    // prevent double-send: abort previous and mark in-flight
    controllerRef.current?.abort();
    controllerRef.current = ctrl;
    const request_id = (typeof crypto !== "undefined" && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    setInFlightRequest(request_id);
    setStreaming(true);
    // handle modes: text (chat streaming), image (background generation), video (async job)
    if (mode === "image") {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!base) {
          setError("NEXT_PUBLIC_BACKEND_URL not configured");
          setStreaming(false);
          setInFlightRequest(null);
          return;
        }
        const res = await fetch(`${base}/image/generate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: message, chat_id: chatId, request_id, model: defaultModel || "gemini-2.0-flash" }),
          signal: ctrl.signal,
        });
        const j = await res.json();
        if (j.ok) {
          // refresh chat list and messages to show generating message
          const cres = await fetch(`${base}/history/chats`, { headers: { Authorization: `Bearer ${idToken}` } });
          const cjson = await cres.json();
          setChats(cjson.chats || []);
          setActiveId(j.chat_id);
          serverChatIdRef.current = j.chat_id;
          setCurrentAssistantId(j.message_id);
          const chatRes = await fetch(`${base}/history/chats/${j.chat_id}`, { headers: { Authorization: `Bearer ${idToken}` } });
          const chatJson = await chatRes.json();
          setMessages(chatJson.messages || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setStreaming(false);
        setInFlightRequest(null);
        if (dev) console.log("image generation duration_ms:", performance.now() - startTime);
      }
      return;
    }

    if (mode === "video") {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!base) {
          setError("NEXT_PUBLIC_BACKEND_URL not configured");
          setStreaming(false);
          setInFlightRequest(null);
          return;
        }
        const res = await fetch(`${base}/video/generate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: message, chat_id: chatId, request_id, model: defaultModel || "gemini-2.0-flash" }),
          signal: ctrl.signal,
        });
        const j = await res.json();
        if (j.ok) {
          const cres = await fetch(`${base}/history/chats`, { headers: { Authorization: `Bearer ${idToken}` } });
          const cjson = await cres.json();
          setChats(cjson.chats || []);
          setActiveId(j.chat_id);
          serverChatIdRef.current = j.chat_id;
          setCurrentAssistantId(j.message_id);
          const chatRes = await fetch(`${base}/history/chats/${j.chat_id}`, { headers: { Authorization: `Bearer ${idToken}` } });
          const chatJson = await chatRes.json();
          setMessages(chatJson.messages || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setStreaming(false);
        setInFlightRequest(null);
      }
      return;
    }

    // default: text streaming chat
    // Do NOT create optimistic messages. Server will create user and assistant messages
    // and return a meta event with chat_id and message_id. We wait for meta and then
    // read SSE token stream to update UI.

    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!base) {
      setError("NEXT_PUBLIC_BACKEND_URL not configured");
      setStreaming(false);
      setInFlightRequest(null);
      return;
    }

    const resp = await fetch(`${base}/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, message, model: defaultModel || "gemini-2.0-flash", attachments: attachments || [], request_id, grounding }),
      signal: ctrl.signal,
    });

    if (!resp.ok || !resp.body) {
      setStreaming(false);
        if (dev) console.log("stream start failed, duration_ms:", performance.now() - startTime);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const tokenBufferRef = useRef<Record<string, string>>({});
    const flushIntervalRef = useRef<number | null>(null);

    // flush buffered tokens to state at a stable interval to avoid re-render storms
    const startFlushInterval = () => {
      if (flushIntervalRef.current) return;
      flushIntervalRef.current = window.setInterval(() => {
        const buf = tokenBufferRef.current;
        if (!Object.keys(buf).length) return;
        setMessages((msgs) => {
          let changed = false;
          const copy = msgs.map((m: any) => {
            const add = buf[m.id];
            if (add) {
              changed = true;
              return { ...m, content: (m.content || "") + add };
            }
            return m;
          });
          // clear buffer entries that we applied
          for (const k of Object.keys(buf)) delete buf[k];
          return changed ? copy : msgs;
        });
      }, 120);
    };

    const stopFlushInterval = () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // parse SSE-style chunks
        let parts = buffer.split(/\n\n/);
        buffer = parts.pop() || "";
        for (const part of parts) {
          const lines = part.split(/\n/).map((l) => l.trim());
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.replace(/^event:\s*/, "");
            if (line.startsWith("data:")) data += line.replace(/^data:\s*/, "");
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data);
            if (event === "meta") {
              // server created/assigned chat and assistant message
              if (payload.chat_id) {
                try {
                  // refresh chat list
                  const cres = await fetch(`${base}/history/chats`, { headers: { Authorization: `Bearer ${idToken}` } });
                  const cjson = await cres.json();
                  setChats(cjson.chats || []);

                  // immediately fetch authoritative messages for the chat so we can attach tokens
                  const res = await fetch(`${base}/history/chats/${payload.chat_id}`, { headers: { Authorization: `Bearer ${idToken}` } });
                  const json = await res.json();
                  setMessages(json.messages || []);
                  serverChatIdRef.current = payload.chat_id;
                  setActiveId(payload.chat_id);
                  // set assistant message id to be updated by incoming tokens
                  setCurrentAssistantId(payload.message_id);
                  // clear in-flight marker once server accepted mapping
                  setInFlightRequest((r) => (r === request_id ? null : r));
                } catch (e) {
                  console.error(e);
                }
              }
              } else if (event === "token") {
                // buffer token per-message and flush periodically to avoid frequent re-renders
                try {
                  const mid = currentAssistantId;
                  if (mid) {
                    tokenBufferRef.current[mid] = (tokenBufferRef.current[mid] || "") + (payload.text || "");
                    startFlushInterval();
                  }
                } catch (e) {
                  // fallback to immediate update
                  setMessages((msgs) => {
                    const idx = msgs.findIndex((m: any) => m.id === currentAssistantId);
                    if (idx !== -1) {
                      const copy = [...msgs];
                      copy[idx] = { ...copy[idx], content: (copy[idx].content || "") + (payload.text || "") };
                      return copy;
                    }
                    return msgs;
                  });
                }
            } else if (event === "done") {
              setStreaming(false);
              setInFlightRequest(null);
              stopFlushInterval();
              if (dev) console.log("stream completed duration_ms:", performance.now() - startTime);
              // refresh messages from server to ensure persisted state
              (async () => {
                try {
                  const chatToFetch = serverChatIdRef.current || activeId;
                  const res = await fetch(`${base}/history/chats/${chatToFetch}`, { headers: { Authorization: `Bearer ${idToken}` } });
                  const json = await res.json();
                  setMessages(json.messages || []);
                } catch (e) {
                  console.error(e);
                }
              })();
            } else if (event === "error") {
              setStreaming(false);
              setInFlightRequest(null);
              stopFlushInterval();
              // surface backend error if provided
              if (payload && payload.message) {
                setError(payload.message);
              } else {
                setError("Generation error from server");
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (e) {
      // aborted or network error
      setStreaming(false);
      setInFlightRequest(null);
      stopFlushInterval();
    } finally {
      setStreaming(false);
      stopFlushInterval();
    }
  }

  async function onRetryAssistant(messageId: string) {
    // find previous user message (the one before assistant)
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx <= 0) return;
    const prev = messages[idx - 1];
    if (!prev || prev.role !== "user") return;
    const c = new AbortController();
    onStartStreaming(activeId, prev.content || "", c);
  }

  async function onRegenerate(messageId: string) {
    if (!idToken) return;
    if (streaming) return; // prevent rapid regenerate while another generation is in-flight
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!base) {
      setError("NEXT_PUBLIC_BACKEND_URL not configured");
      return;
    }
    try {
      const res = await fetch(`${base}/history/messages/${messageId}/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: activeId }),
      });
      const j = await res.json();
      if (j.ok && j.prompt) {
        const c = new AbortController();
        await onStartStreaming(activeId, j.prompt, c, j.attachments || [], j.grounding || false);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function onFeedback(messageId: string, score: number) {
    if (!idToken) return;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!base) return;
    try {
      await fetch(`${base}/history/messages/${messageId}/feedback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: activeId, score }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex h-[80vh] border rounded overflow-hidden">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded shadow flex items-center gap-4">
            <div>Backend error: {error}</div>
            <button onClick={retry} className="px-2 py-1 bg-white text-black rounded">Retry</button>
          </div>
        </div>
      )}
      <ChatSidebar chats={chats} activeId={activeId} onSelect={selectChat} onNew={newChat} />
      <div className="flex-1 flex flex-col">
        {!settingsLoaded ? (
          <div className="p-8">Loading settings…</div>
        ) : (
          <>
            <div className="p-2 border-b">
              <label className="mr-2">Model:</label>
              <select value={defaultModel || ""} onChange={(e) => { 
                setDefaultModel(e.target.value); 
                const base = process.env.NEXT_PUBLIC_BACKEND_URL;
                if (base) {
                  fetch(`${base}/settings`, { 
                    method: "PATCH", 
                    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, 
                    body: JSON.stringify({ defaultModel: e.target.value }) 
                  }); 
                }
              }}>
                {(availableModels.length ? availableModels : ["gemini-2.0-flash"]).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <ChatWindow messages={messages} streaming={streaming} onRetry={onRetryAssistant} onRegenerate={onRegenerate} onFeedback={onFeedback} />
            <ChatInput idToken={idToken} chatId={activeId} onStartStreaming={(id, msg, c, attachments, grounding, mode) => onStartStreaming(id, msg, c, attachments, grounding, mode)} streaming={streaming} />
          </>
        )}
      </div>
    </div>
  );
}
