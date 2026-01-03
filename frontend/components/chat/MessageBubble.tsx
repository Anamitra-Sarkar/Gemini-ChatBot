"use client"
import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MessageBubbleInner({ message, onRetry, onRegenerate, onFeedback }: { message: any; onRetry?: (id: string) => void; onRegenerate?: (id: string) => void; onFeedback?: (id: string, score: number) => void }) {
  const role = message.role;
  const isUser = role === "user";
  const status = message.status;
  const id = message.id;
  const [expanded, setExpanded] = useState(false);

  const content = message.content || "";
  const short = content.length > 1500 && !expanded ? content.slice(0, 1500) + "..." : content;

  const codeClass = "bg-[#0f1724] text-green-200 p-2 rounded font-mono text-sm overflow-auto";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} py-2`}>
      <div className={`${isUser ? "bg-blue-600 text-white" : "bg-white dark:bg-[#0b1220] text-slate-200"} max-w-[80%] p-3 rounded-lg shadow` }>
        {/* Attachment chips */}
        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <div className="flex gap-2 mb-2">
            {message.attachments.map((a: any, i: number) => (
              <div key={i} className="px-2 py-1 bg-gray-100 dark:bg-[#07101a] rounded text-xs">{a}</div>
            ))}
          </div>
        )}
        {message.type === "image" && Array.isArray(message.images) && (
          <div className="flex flex-col gap-2">
            {message.images.map((img: any, i: number) => (
              <div key={i} className="cursor-pointer">
                <img src={img.url} alt={img.url} className="max-w-full rounded" />
                <div className="flex gap-2 mt-1">
                  <a href={img.url} download className="px-2 py-1 bg-gray-200 rounded text-sm">Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
        {message.type === "video" && message.video && (
          <div className="flex flex-col gap-2">
            {message.video.url ? (
              <video controls src={message.video.url} className="max-w-full rounded" />
            ) : (
              <div>Video generation status: {message.video.status}</div>
            )}
            {message.video.url && <a href={message.video.url} download className="px-2 py-1 bg-gray-200 rounded text-sm mt-1">Download</a>}
          </div>
        )}
        {!message.type && (
          <div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{short}</ReactMarkdown>
            {content.length > 1500 && (
              <div className="mt-2">
                <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-400">{expanded ? "Show less" : "Show more"}</button>
              </div>
            )}
            {/* Citation list rendered below message; model should place inline [1] markers in content */}
            {Array.isArray(message.citations) && message.citations.length > 0 && (
              <div className="mt-3 bg-gray-50 dark:bg-[#07101a] p-2 rounded text-sm text-slate-400">
                <div className="font-medium text-xs text-slate-300 mb-1">Sources</div>
                <ol className="list-decimal list-inside">
                  {message.citations.map((c: any) => (
                    <li key={c.index} className="mb-1">
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">[{c.index}] {c.title || c.url}</a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
        {/* Grounding badge */}
        {message.grounding && (
          <div className="mt-1 text-xs text-slate-400">Grounded (web search)</div>
        )}
        <div className="mt-2 flex gap-2">
          {message.content && (
            <>
              <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(message.content) }} className="px-2 py-1 bg-gray-200 rounded text-sm">Copy</button>
              <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(message.content) }} className="px-2 py-1 bg-gray-100 rounded text-sm">Copy raw</button>
            </>
          )}
          {!isUser && typeof onRegenerate === "function" && (
            <button disabled={status === "streaming"} onClick={() => id && onRegenerate && onRegenerate(id)} className={`px-2 py-1 ${status === "streaming" ? "bg-gray-400 text-white" : "bg-yellow-500 text-white"} rounded text-sm`}>Regenerate</button>
          )}
          {!isUser && typeof onFeedback === "function" && (
            <>
              <button onClick={() => id && onFeedback && onFeedback(id, 1)} className="px-2 py-1 bg-green-500 text-white rounded text-sm">👍</button>
              <button onClick={() => id && onFeedback && onFeedback(id, -1)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">👎</button>
            </>
          )}
        </div>
        {!isUser && status === "error" && (
          <div className="mt-2 flex gap-2">
            <button onClick={() => id && onRetry && onRetry(id)} className="px-2 py-1 bg-yellow-500 text-white rounded text-sm">Retry</button>
            <span className="text-sm text-red-400">Generation failed</span>
          </div>
        )}
        {!isUser && status === "error" && (
          <div className="mt-2 flex gap-2">
            <button onClick={() => id && onRetry && onRetry(id)} className="px-2 py-1 bg-yellow-500 text-white rounded text-sm">Retry</button>
            <span className="text-sm text-red-400">Generation failed</span>
          </div>
        )}
      </div>
    </div>
  );
}

const MessageBubble = React.memo(MessageBubbleInner, (prev, next) => {
  // shallow compare id, content, status, citations length to avoid re-renders
  return prev.message.id === next.message.id && prev.message.content === next.message.content && prev.message.status === next.message.status && JSON.stringify(prev.message.citations || []) === JSON.stringify(next.message.citations || []);
});

export default MessageBubble;
