import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ReturnToSelfButton({
  show,
  isDragging,
  position,
  onMouseDown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onClick
}) {
  if (!show) return null;
  return (
    <div
      className={`fixed z-[9997] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none group`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Button
        onClick={onClick}
        className="w-14 h-14 rounded-full shadow-2xl border-4 border-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white transition-all duration-300 transform hover:scale-105"
        aria-label="חזור למנהל"
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/80 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        גרור כדי להזיז • לחץ כדי לחזור למנהל
      </div>
    </div>
  );
}
