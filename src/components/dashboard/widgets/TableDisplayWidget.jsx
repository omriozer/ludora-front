import React, { useState } from 'react';
import { Table } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import TableDisplayScreen from './TableDisplayScreen';

/**
 * TableDisplayWidget - Dashboard widget for table display
 * Provides configurable table with editable content for board projection
 */
const TableDisplayWidget = ({ widgetId, settings = {} }) => {
  const [isTableDisplayOpen, setIsTableDisplayOpen] = useState(false);
  const [columnCount, setColumnCount] = useState(settings?.columnCount || 3);

  const handleOpenTableDisplay = () => {
    setIsTableDisplayOpen(true);
  };

  const handleCloseTableDisplay = () => {
    setIsTableDisplayOpen(false);
  };

  return (
    <>
      {/* Widget Content */}
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl">
        {/* Widget Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">הצגת טבלה</h3>
          <p className="text-sm text-gray-600">צור טבלה עם {columnCount} עמודות למיון מידע</p>
        </div>

        {/* Main Button */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <button
            onClick={handleOpenTableDisplay}
            className="w-full h-full min-h-[120px] bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-lg md:text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
            aria-label="הצג טבלה"
          >
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <Table className="w-12 h-12 md:w-14 md:h-14 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative z-10" />
            <span className="text-center px-2 leading-tight relative z-10">
              הצגת טבלה
            </span>

            {/* Table Grid Lines */}
            <div className="absolute top-4 right-4 grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-white/20 rounded-sm animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Column Count Selector */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            מספר עמודות
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
              <button
                key={count}
                onClick={() => setColumnCount(count)}
                className={`w-full h-8 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  columnCount === count
                    ? 'bg-indigo-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Display Screen - Full Screen Overlay */}
      {isTableDisplayOpen && (
        <TableDisplayScreen
          onClose={handleCloseTableDisplay}
          columnCount={columnCount}
        />
      )}
    </>
  );
};

export default TableDisplayWidget;