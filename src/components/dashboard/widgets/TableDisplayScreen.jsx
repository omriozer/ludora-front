import React, { useState, useCallback, Fragment, useRef } from 'react';
import { Plus, Trash2, Edit3, Minus, Settings, GripVertical, Download, Upload, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FullScreenOverlay from './shared/FullScreenOverlay';

/**
 * TableDisplayScreen - Full-screen table display interface
 * Provides large table grid with draggable text elements for content
 */
const TableDisplayScreen = ({ onClose, initialRows = 4, initialCols = 4 }) => {
  // Table structure state
  const [rowCount, setRowCount] = useState(initialRows);
  const [colCount, setColCount] = useState(initialCols);

  // Table data state (for actual cell content)
  const [tableData, setTableData] = useState(() => {
    const initialData = [];
    for (let i = 0; i < initialRows; i++) {
      initialData[i] = [];
      for (let j = 0; j < initialCols; j++) {
        initialData[i][j] = '';
      }
    }
    return initialData;
  });

  // Text elements state (for adding custom text anywhere on screen)
  const [textElements, setTextElements] = useState([]);
  const [editingElement, setEditingElement] = useState(null);
  const [draggedElement, setDraggedElement] = useState(null);

  // Tools panel state
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [toolsPanelPosition, setToolsPanelPosition] = useState({ x: 100, y: 100 });
  const [isDraggingTools, setIsDraggingTools] = useState(false);

  // CSV file input ref
  const fileInputRef = useRef(null);

  // Table structure functions
  const addRow = () => {
    setRowCount(prev => {
      const newRowCount = prev + 1;
      setTableData(currentData => {
        const newData = [...currentData];
        newData[prev] = Array(colCount).fill('');
        return newData;
      });
      return newRowCount;
    });
  };

  const deleteRow = () => {
    if (rowCount > 1) {
      setRowCount(prev => {
        const newRowCount = prev - 1;
        setTableData(currentData => currentData.slice(0, newRowCount));
        return newRowCount;
      });
    }
  };

  const addColumn = () => {
    setColCount(prev => {
      const newColCount = prev + 1;
      setTableData(currentData =>
        currentData.map(row => [...row, ''])
      );
      return newColCount;
    });
  };

  const deleteColumn = () => {
    if (colCount > 1) {
      setColCount(prev => {
        const newColCount = prev - 1;
        setTableData(currentData =>
          currentData.map(row => row.slice(0, newColCount))
        );
        return newColCount;
      });
    }
  };

  // Cell data functions
  const updateCellData = (row, col, value) => {
    setTableData(currentData => {
      const newData = [...currentData];
      if (!newData[row]) newData[row] = [];
      newData[row][col] = value;
      return newData;
    });
  };

  const getCellData = (row, col) => {
    return tableData[row] && tableData[row][col] ? tableData[row][col] : '';
  };

  // CSV Import/Export functions
  const exportToCSV = () => {
    const csvContent = tableData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `table-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      const rows = csvText.split('\n')
        .filter(row => row.trim())
        .map(row =>
          row.split(',').map(cell =>
            cell.trim().replace(/^"|"$/g, '') // Remove quotes
          )
        );

      if (rows.length > 0) {
        const newRowCount = rows.length;
        const newColCount = Math.max(...rows.map(row => row.length));

        // Pad rows to ensure consistent column count
        const paddedRows = rows.map(row => {
          const paddedRow = [...row];
          while (paddedRow.length < newColCount) {
            paddedRow.push('');
          }
          return paddedRow;
        });

        setTableData(paddedRows);
        setRowCount(newRowCount);
        setColCount(newColCount);
      }
    };
    reader.readAsText(file);

    // Reset the file input
    event.target.value = '';
  };

  // Simple formula evaluation
  const evaluateFormula = (formula) => {
    try {
      // Remove = if present
      const cleanFormula = formula.startsWith('=') ? formula.substring(1) : formula;

      // Simple arithmetic operations only
      const allowedChars = /^[0-9+\-*/().\s]+$/;
      if (!allowedChars.test(cleanFormula)) {
        return formula; // Return original if contains invalid characters
      }

      // Evaluate basic math expressions
      const result = Function(`"use strict"; return (${cleanFormula})`)();
      return isNaN(result) ? formula : result.toString();
    } catch (error) {
      return formula; // Return original if evaluation fails
    }
  };

  // Text element functions
  const addTextElement = () => {
    const newElement = {
      id: Date.now(),
      text: 'טקסט חדש',
      x: 50, // Percentage from left
      y: 20, // Percentage from top
      fontSize: 16,
      color: '#000000',
      rotation: 0, // Degrees
      isEditing: true
    };
    setTextElements([...textElements, newElement]);
    setEditingElement(newElement.id);
  };

  const updateTextElement = (id, updates) => {
    setTextElements(textElements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const deleteTextElement = (id) => {
    setTextElements(textElements.filter(el => el.id !== id));
    if (editingElement === id) {
      setEditingElement(null);
    }
  };

  const startEditingText = (id) => {
    setEditingElement(id);
    updateTextElement(id, { isEditing: true });
  };

  const stopEditingText = () => {
    if (editingElement) {
      updateTextElement(editingElement, { isEditing: false });
      setEditingElement(null);
    }
  };

  // Drag and drop for text elements
  const handleMouseDown = (e, elementId) => {
    setDraggedElement(elementId);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (draggedElement) {
      const containerRect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;

      updateTextElement(draggedElement, {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      });
    }
  }, [draggedElement]);

  const handleMouseUp = () => {
    setDraggedElement(null);
    setIsDraggingTools(false);
  };

  // Tools panel drag functionality
  const handleToolsPanelMouseDown = (e) => {
    setIsDraggingTools(true);
    e.preventDefault();
  };

  const handleToolsPanelDrag = useCallback((e) => {
    if (isDraggingTools) {
      setToolsPanelPosition({
        x: e.clientX - 150, // Offset for panel width
        y: e.clientY - 25   // Offset for panel height
      });
    }
  }, [isDraggingTools]);

  return (
    <FullScreenOverlay onClose={onClose}>
      {/* Tools Button - Positioned at same level as Exit Button */}
      <div className="absolute top-4 right-4 z-[100]">
        <Button
          onClick={() => setShowToolsPanel(!showToolsPanel)}
          size="lg"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          title="כלים"
        >
          <Settings className="w-5 h-5" />
          <span className="font-semibold">כלים</span>
        </Button>
      </div>


      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={importFromCSV}
        accept=".csv"
        style={{ display: 'none' }}
      />

      <div
        className="w-full h-full relative"
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleToolsPanelDrag(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        {/* Draggable Tools Panel */}
        {showToolsPanel && (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-2xl border-2 border-gray-200 min-w-[300px]"
            style={{
              left: `${toolsPanelPosition.x}px`,
              top: `${toolsPanelPosition.y}px`
            }}
          >
            {/* Drag Handle */}
            <div
              className="bg-gray-100 rounded-t-xl px-4 py-2 cursor-move flex items-center gap-2 border-b"
              onMouseDown={handleToolsPanelMouseDown}
            >
              <GripVertical className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-700 flex-1">כלי עריכה</span>
              <Button
                onClick={() => setShowToolsPanel(false)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>

            {/* Panel Content */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Row Controls */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700 text-center">שורות</div>
                  <div className="flex gap-1">
                    <Button
                      onClick={addRow}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      <Plus className="w-3 h-3 ml-1" />
                      הוסף
                    </Button>
                    <Button
                      onClick={deleteRow}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 flex-1"
                      disabled={rowCount <= 1}
                    >
                      <Minus className="w-3 h-3 ml-1" />
                      מחק
                    </Button>
                  </div>
                </div>

                {/* Column Controls */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700 text-center">עמודות</div>
                  <div className="flex gap-1">
                    <Button
                      onClick={addColumn}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      <Plus className="w-3 h-3 ml-1" />
                      הוסף
                    </Button>
                    <Button
                      onClick={deleteColumn}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 flex-1"
                      disabled={colCount <= 1}
                    >
                      <Minus className="w-3 h-3 ml-1" />
                      מחק
                    </Button>
                  </div>
                </div>
              </div>

              {/* CSV Import/Export Section */}
              <div className="border-t pt-4 mb-4">
                <div className="text-sm font-semibold text-gray-700 text-center mb-3">קבצי CSV</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    variant="outline"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Upload className="w-3 h-3 ml-1" />
                    יבוא
                  </Button>
                  <Button
                    onClick={exportToCSV}
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                  >
                    <Download className="w-3 h-3 ml-1" />
                    יצוא
                  </Button>
                </div>
              </div>

              {/* Add Text Element */}
              <Button
                onClick={addTextElement}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף טקסט
              </Button>

              <div className="text-xs text-gray-500 mt-2 text-center">
                גרור טקסטים למיקום הרצוי<br />
                הכנס = לחישוב נוסחאות פשוטות
              </div>
            </div>
          </div>
        )}

        {/* Main Table - Maximum Size (Full Screen) */}
        <div className="absolute inset-0 p-2">
          <div className="w-full h-full bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            <table className="table-fixed border-collapse w-full h-full">
              <tbody>
                {Array.from({ length: rowCount }, (_, rowIndex) => (
                  <tr key={rowIndex} style={{ height: `${100 / rowCount}%` }}>
                    {Array.from({ length: colCount }, (_, colIndex) => (
                      <td
                        key={colIndex}
                        className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors p-2"
                        style={{
                          width: `${100 / colCount}%`,
                          height: `${100 / rowCount}%`
                        }}
                      >
                        <input
                          type="text"
                          value={getCellData(rowIndex, colIndex)}
                          onChange={(e) => updateCellData(rowIndex, colIndex, e.target.value)}
                          onBlur={(e) => {
                            // Evaluate formula if starts with =
                            if (e.target.value.startsWith('=')) {
                              const result = evaluateFormula(e.target.value);
                              updateCellData(rowIndex, colIndex, result);
                            }
                          }}
                          className="w-full h-full border-none outline-none bg-transparent text-center text-sm resize-none"
                          style={{
                            minHeight: `${Math.min(60, (window.innerHeight - 100) / rowCount - 4)}px`,
                            fontSize: `${Math.min(16, (window.innerHeight - 100) / rowCount / 5)}px`
                          }}
                          placeholder={rowIndex === 0 ? `עמ' ${colIndex + 1}` : ''}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Text Elements with Inline Editing */}
        {textElements.map((element) => (
          <Fragment key={element.id}>
            {/* Text Element Container - Only position, no styling */}
            <div
              className={`absolute ${element.isEditing ? '' : 'cursor-move'} ${draggedElement === element.id ? 'z-50' : 'z-30'}`}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                transform: `translate(-50%, -50%)` // Only positioning transform, no rotation here
              }}
              onMouseDown={(e) => !element.isEditing && handleMouseDown(e, element.id)}
            >
              <div className="relative group">
                {element.isEditing ? (
                  <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-2">
                    {/* Editable Text Input - No styling applied */}
                    <input
                      type="text"
                      value={element.text}
                      onChange={(e) => updateTextElement(element.id, { text: e.target.value })}
                      onBlur={stopEditingText}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') stopEditingText();
                        if (e.key === 'Escape') stopEditingText();
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm min-w-[80px] max-w-[200px]"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    className="font-medium select-none whitespace-nowrap"
                    style={{
                      textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                      transform: `rotate(${element.rotation || 0}deg)`, // Apply rotation only to displayed text
                      fontSize: `${element.fontSize}px`, // Apply font size only to displayed text
                      color: element.color // Apply color only to displayed text
                    }}
                  >
                    {element.text}
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Control Toolbar - Not affected by text transforms */}
            {!element.isEditing && (
              <div
                className="absolute z-40 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '100';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0';
                }}
              >
                <div className="bg-white rounded-lg shadow-xl border-2 border-gray-200 p-2 flex items-center gap-1 min-w-max -translate-y-12">
                  {/* Edit Button */}
                  <Button
                    onClick={() => startEditingText(element.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="ערוך טקסט"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>

                  {/* Font Size */}
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={element.fontSize}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateTextElement(element.id, { fontSize: parseInt(e.target.value) || 16 });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="border border-gray-300 rounded px-2 py-1 w-14 text-xs text-center"
                    title="גודל טקסט"
                  />

                  {/* Color Picker */}
                  <input
                    type="color"
                    value={element.color}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateTextElement(element.id, { color: e.target.value });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    title="צבע טקסט"
                  />

                  {/* Rotation */}
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={element.rotation || 0}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateTextElement(element.id, { rotation: parseInt(e.target.value) || 0 });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    className="border border-gray-300 rounded px-2 py-1 w-14 text-xs text-center"
                    title="סיבוב (מעלות)"
                  />

                  {/* Delete Button */}
                  <Button
                    onClick={() => deleteTextElement(element.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="מחק טקסט"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Fragment>
        ))}

      </div>
    </FullScreenOverlay>
  );
};

export default TableDisplayScreen;