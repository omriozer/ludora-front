import React from "react";
import { ShieldAlert, MessageSquare, X } from "lucide-react";

export default function GlobalMessage({ type, message, onClose }) {
  if (!message) return null;
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2
        ${type === 'error' ? 'bg-red-600' : 'bg-blue-500'}
      `}
      role="alert"
      aria-live="assertive"
    >
      {type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      {message}
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
