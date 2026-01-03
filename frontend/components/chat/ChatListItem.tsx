"use client"
import React from "react";

export default function ChatListItem({ chat, active, onClick }: { chat: any; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded cursor-pointer ${active ? "bg-slate-200 dark:bg-[#0b1620]" : "hover:bg-slate-50 dark:hover:bg-[#071422]"}`}
    >
      <div className="font-medium">{chat.title || "New chat"}</div>
      <div className="text-sm text-gray-500">{chat.last || ""}</div>
    </div>
  );
}
