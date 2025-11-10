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
      <div className="h-full flex flex-col p-4">

        {/* Main Button */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <button
            onClick={handleOpenTableDisplay}
            className="w-full h-full min-h-[120px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-lg md:text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
            aria-label="הצג טבלה"
          >
            <Table className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-center px-2 leading-tight">
              הצגת טבלה
            </span>
          </button>
        </div>

        {/* Column Count Selector */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            מספר עמודות
          </label>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
              <button
                key={count}
                onClick={() => setColumnCount(count)}
                className={`w-8 h-8 rounded-full text-sm font-semibold transition-all duration-200 ${
                  columnCount === count
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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