"use client"
import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import StreamingCursor from "./StreamingCursor";

export default function ChatWindow({ messages, streaming, onRetry, onRegenerate, onFeedback }: { messages: Array<any>; streaming: boolean; onRetry?: (id: string) => void; onRegenerate?: (id: string) => void; onFeedback?: (id: string, score: number) => void }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // auto-scroll unless user has scrolled up
    if (!containerRef.current) return;
    const el = containerRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, messages.length ? messages[messages.length - 1]?.id : null]);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-4">
      {messages.map((m: any) => (
        <MessageBubble key={m.id} message={m} onRetry={onRetry} onRegenerate={onRegenerate} onFeedback={onFeedback} />
      ))}
      {streaming && <div className="py-2"><StreamingCursor /></div>}
      <div ref={bottomRef} />
    </div>
  );
}
