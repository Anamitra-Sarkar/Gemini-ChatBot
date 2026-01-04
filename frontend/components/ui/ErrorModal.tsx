"use client"

import React from "react";

export default function ErrorModal({ open, title, message, onClose }: { open: boolean; title?: string; message?: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0b1220] text-black dark:text-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 glass-strong">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title || "Error"}</h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{message}</p>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">Close</button>
        </div>
      </div>
    </div>
  );
}
