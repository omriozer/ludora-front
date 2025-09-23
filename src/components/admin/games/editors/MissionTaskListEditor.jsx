import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import MultipleChoiceTaskEditor from './MultipleChoiceTaskEditor';

export default function MissionTaskListEditor({ tasks, onTasksChange }) {
  const [localTasks, setLocalTasks] = useState(tasks || []);
  const [editingTask, setEditingTask] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);

  useEffect(() => {
    setLocalTasks(tasks || []);
  }, [tasks]);

  const handleAddTask = () => {
    setEditingTask(null);
    setEditingIndex(-1);
  };

  const handleEditTask = (task, index) => {
    setEditingTask(task);
    setEditingIndex(index);
  };

  const handleSaveTask = (taskData) => {
    let updatedTasks;
    if (editingIndex >= 0) {
      // Edit existing task
      updatedTasks = localTasks.map((task, index) =>
        index === editingIndex ? taskData : task
      );
    } else {
      // Add new task
      updatedTasks = [...localTasks, taskData];
    }
    
    setLocalTasks(updatedTasks);
    onTasksChange(updatedTasks);
    setEditingTask(null);
    setEditingIndex(-1);
  };

  const handleDeleteTask = (index) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      const updatedTasks = localTasks.filter((_, i) => i !== index);
      setLocalTasks(updatedTasks);
      onTasksChange(updatedTasks);
    }
  };

  const handleMoveTask = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localTasks.length) return;

    const updatedTasks = [...localTasks];
    const [movedTask] = updatedTasks.splice(index, 1);
    updatedTasks.splice(newIndex, 0, movedTask);
    
    setLocalTasks(updatedTasks);
    onTasksChange(updatedTasks);
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setEditingIndex(-1);
  };

  const getTaskDisplayText = (task) => {
    if (task.type === 'multiple_choice') {
      return task.question_text || 'שאלה ללא טקסט';
    }
    return 'משימה לא מוכרת';
  };

  // If we're editing a task, show the task editor
  if (editingTask !== null || editingIndex === -1) {
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {editingIndex >= 0 ? 'עריכת משימה' : 'הוספת משימה חדשה'}
          </h3>
        </div>
        <MultipleChoiceTaskEditor
          task={editingTask}
          onSave={handleSaveTask}
          onCancel={cancelEditing}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">רשימת משימות</h3>
        <Button
          onClick={handleAddTask}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 ml-1" />
          הוסף משימה
        </Button>
      </div>

      {localTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 text-lg">אין משימות עדיין</p>
            <p className="text-gray-400 text-sm mt-2">לחץ על "הוסף משימה" כדי להתחיל</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {localTasks.map((task, index) => (
            <Card key={index} className="border-r-4 border-r-blue-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {task.type === 'multiple_choice' ? 'שאלה אמריקאית' : task.type}
                      </span>
                      <span className="text-gray-500 text-sm">#{index + 1}</span>
                    </div>
                    <p className="text-gray-700 font-medium">
                      {getTaskDisplayText(task)}
                    </p>
                    {task.type === 'multiple_choice' && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span>תשובות נכונות: {task.correct_answers?.length || 0}</span>
                        <span className="mx-2">•</span>
                        <span>תשובות שגויות: {task.incorrect_answers?.length || 0}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 mr-4">
                    {/* Move buttons */}
                    <Button
                      onClick={() => handleMoveTask(index, 'up')}
                      disabled={index === 0}
                      size="sm"
                      variant="outline"
                      className="p-1 w-8 h-8"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleMoveTask(index, 'down')}
                      disabled={index === localTasks.length - 1}
                      size="sm"
                      variant="outline"
                      className="p-1 w-8 h-8"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    
                    {/* Edit and delete buttons */}
                    <Button
                      onClick={() => handleEditTask(task, index)}
                      size="sm"
                      variant="outline"
                      className="p-1 w-8 h-8 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteTask(index)}
                      size="sm"
                      variant="outline"
                      className="p-1 w-8 h-8 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}