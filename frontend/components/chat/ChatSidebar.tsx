"use client"
import React from "react";
import ChatListItem from "./ChatListItem";

export default function ChatSidebar({ chats, activeId, onSelect, onNew }: any) {
  return (
    <aside className="w-80 border-r bg-slate-50 dark:bg-[#071422]">
      <div className="p-4 flex items-center justify-between">
        <div className="font-semibold">Chats</div>
        <button onClick={onNew} className="px-2 py-1 bg-blue-600 text-white rounded">New</button>
      </div>
      <div className="p-2 space-y-2">
        {chats.map((c: any) => (
          <ChatListItem key={c.id} chat={c} active={c.id === activeId} onClick={() => onSelect(c.id)} />
        ))}
      </div>
    </aside>
  );
}
