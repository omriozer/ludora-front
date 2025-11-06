import React from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Footer from "./Footer";

export default function MaintenancePage({
  showReturnButton,
  isDraggingReturn,
  returnButtonPosition,
  handleReturnDrag,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleReturnToSelf,
  handleLogin,
  isTemporaryIssue = false
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col" dir="rtl">
      {/* Draggable Return Button - show when impersonating even in maintenance mode */}
      {showReturnButton && (
        <div
          className={`fixed z-[9997] ${isDraggingReturn ? 'cursor-grabbing' : 'cursor-grab'} select-none group`}
          style={{
            left: `${returnButtonPosition.x}px`,
            top: `${returnButtonPosition.y}px`,
            touchAction: 'none'
          }}
          onMouseDown={handleReturnDrag}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Button
            onClick={handleReturnToSelf}
            className="w-14 h-14 rounded-full shadow-2xl border-4 border-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white transition-all duration-300 transform hover:scale-105"
            aria-label="חזור למנהל"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          {/* Tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/80 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            גרור כדי להזיז • לחץ כדי לחזור למנהל
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Icon - CLICKABLE FOR ADMIN LOGIN */}
        <div className="relative z-10 text-center max-w-md mx-auto">
        <div className="mb-8">
          <div
            className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3"
            onClick={handleLogin}
          >
            <ShieldAlert className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-tight">
            {isTemporaryIssue ? "בעיה זמנית במערכת" : "האתר בתחזוקה"}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            {isTemporaryIssue ? (
              <>
                יש בעיה זמנית שאנחנו מתקנים והאתר יחזור לעבוד בקרוב.
                <br />
                תודה על הסבלנות 🙏
              </>
            ) : (
              <>
                אנחנו מבצעים שדרוגים ושיפורים כדי להעניק לכם חוויה טובה יותר.
                <br />
                נשוב בקרוב! תודה על הסבלנות 🙏
              </>
            )}
          </p>

          {/* Progress Indicator */}
          <div className="bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full animate-pulse w-3/4"></div>
          </div>
          <p className="text-sm text-gray-500">
            {isTemporaryIssue ? "מתקנים את הבעיה..." : "משדרגים את המערכת..."}
          </p>
        </div>
        </div>
      </div>

      {/* Footer */}
      <Footer isMaintenanceMode={true} />

      {/* Floating Elements */}
      <div className="absolute top-16 right-16 opacity-20">
        <div className="w-6 h-6 bg-blue-400 rounded-full animate-bounce"></div>
      </div>
      <div className="absolute bottom-32 left-16 opacity-20">
        <div className="w-4 h-4 bg-purple-400 rounded-full animate-bounce delay-700"></div>
      </div>
      <div className="absolute top-1/3 right-1/4 opacity-20">
        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce delay-1000"></div>
      </div>
    </div>
  );
}
