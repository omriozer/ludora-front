
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Target, Clock, Trophy, Shield, Plus, HelpCircle, Search, Trash2 } from 'lucide-react';
import { QA } from '@/services/entities';
import MultipleChoiceTaskPopup from '../../../gamesEngine/tasks/MultipleChoiceTaskPopup';

export default function MissionEditorModal({ 
  mission, 
  missionIndex, 
  onSave, 
  onClose, 
  isOpen 
}) {
  const [missionData, setMissionData] = useState({
    x: 0,
    y: 0,
    type: 'mission',
    required_to_pass: false,
    time_limit_seconds: null,
    points: 10,
    mission_type: 'collect_points',
    allow_retries: true,
    max_retries: null,
    task_order: 'sequential',
    retry_task_selection: 'same', // New default for retry task selection
    tasks: [],
    ...mission
  });

  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTask, setPreviewTask] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (mission) {
      setMissionData({
        x: 0,
        y: 0,
        type: 'mission',
        required_to_pass: false,
        time_limit_seconds: null,
        points: 10,
        mission_type: 'collect_points',
        allow_retries: true,
        max_retries: null,
        task_order: 'sequential',
        retry_task_selection: 'same', // Ensure this is set on mission load too
        tasks: [],
        ...mission
      });
    }
  }, [mission]);

  const loadAvailableQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const questions = await QA.list('-created_date');
      setAvailableQuestions(questions);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
    setLoadingQuestions(false);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    const processedData = {
      ...missionData,
      time_limit_seconds: missionData.time_limit_seconds || null,
      max_retries: missionData.max_retries || null,
      points: parseInt(missionData.points) || 0
    };
    onSave(processedData, missionIndex);
  };

  const updateField = (field, value) => {
    setMissionData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTask = () => {
    loadAvailableQuestions();
    setShowAddTaskModal(true);
  };

  const handleSelectQuestion = (question) => {
    const newTask = {
      id: Date.now().toString(),
      type: 'multiple_choice',
      question_id: question.id,
      question_text: question.question_text,
      correct_answers: question.correct_answers,
      incorrect_answers: question.incorrect_answers
    };

    setMissionData(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
    setShowAddTaskModal(false);
  };

  const handleRemoveTask = (taskIndex) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      setMissionData(prev => ({
        ...prev,
        tasks: prev.tasks.filter((_, index) => index !== taskIndex)
      }));
    }
  };

  const handlePreviewTask = (task) => {
    setPreviewTask(task);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewTask(null);
  };

  // Search functionality
  const filteredQuestions = availableQuestions.filter(question => {
    if (!searchQuery.trim()) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    
    // Search in question text
    if (question.question_text?.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search in correct answers
    if (question.correct_answers?.some(answer => 
      answer.answer_text?.toLowerCase().includes(searchTerm)
    )) {
      return true;
    }
    
    // Search in incorrect answers
    if (question.incorrect_answers?.some(answer => 
      answer.toLowerCase().includes(searchTerm)
    )) {
      return true;
    }
    
    // Search in tags (if available)
    if (question.tags?.some(tag => 
      tag.toLowerCase().includes(searchTerm)
    )) {
      return true;
    }
    
    return false;
  });

  const TooltipButton = ({ tooltip }) => (
    <div className="relative group inline-block">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 transition-colors p-1 touch-manipulation"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      <div className="absolute left-0 transform px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none w-48 text-right z-[70] sm:w-64 bottom-full mb-2 group-hover:block md:left-1/2 md:-translate-x-1/2 md:w-auto md:whitespace-nowrap md:text-center">
        {tooltip}
        <div className="absolute left-4 w-0 h-0 border-l-4 border-r-4 border-transparent top-full border-t-4 border-t-gray-900 md:left-1/2 md:transform md:-translate-x-1/2"></div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[95vh] overflow-auto rounded-3xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-6 text-white rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Target className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">עריכת נקודת עניין</h2>
                <p className="text-blue-100 text-sm">
                  מיקום במבוך: ({Math.round(missionData.x)}%, {Math.round(missionData.y)}%)
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-2xl w-10 h-10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200">
            <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              הגדרות בסיסיות
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Required to pass */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    חובה להשלמה
                  </label>
                  <TooltipButton tooltip="האם יהיה ניתן להשלים את המשחק בלי לנסות לבצע את המשימה" />
                </div>
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={missionData.required_to_pass}
                    onChange={(e) => updateField('required_to_pass', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm">נדרש כדי לסיים את המשחק</span>
                </label>
              </div>

              {/* Time limit */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    הגבלת זמן (שניות)
                  </label>
                  <TooltipButton tooltip="ניתן להגביל את המשימה למספר שניות. השאר ריק ללא הגבלת זמן" />
                </div>
                <Input
                  type="number"
                  min="0"
                  value={missionData.time_limit_seconds || ''}
                  onChange={(e) => updateField('time_limit_seconds', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="ללא הגבלה"
                  className="text-right"
                />
              </div>

              {/* Points */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    נקודות
                  </label>
                  <TooltipButton tooltip="כמה נקודות המשתמש יקבל כל פעם שיבצע את המשימה הזו בהצלחה" />
                </div>
                <Input
                  type="number"
                  min="0"
                  value={missionData.points}
                  onChange={(e) => updateField('points', parseInt(e.target.value) || 0)}
                  className="text-right"
                />
              </div>

              {/* Retry Settings - Restored */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    ניסיונות חוזרים
                  </label>
                  <TooltipButton tooltip="קובע האם המשתמש יכול לנסות שוב את המשימה במקרה של כישלון" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="allow_retries"
                      value="true"
                      checked={missionData.allow_retries === true}
                      onChange={(e) => updateField('allow_retries', e.target.value === 'true')}
                      className="text-purple-600"
                    />
                    <span className="text-sm font-medium">מותר</span>
                  </label>
                  
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="allow_retries"
                      value="false"
                      checked={missionData.allow_retries === false}
                      onChange={(e) => updateField('allow_retries', e.target.value === 'true')}
                      className="text-purple-600"
                    />
                    <span className="text-sm font-medium">אסור</span>
                  </label>
                </div>

                {/* Max Retries - only show when retries are allowed */}
                {missionData.allow_retries && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        מספר ניסיונות מקסימלי
                      </label>
                      <TooltipButton tooltip="מספר הפעמים המקסימלי שהמשתמש יכול לנסות (השאר ריק לללא הגבלה)" />
                    </div>
                    <Input // Changed from raw input to shadcn/ui Input
                      type="number"
                      min="1"
                      placeholder="ללא הגבלה"
                      value={missionData.max_retries || ''}
                      onChange={(e) => updateField('max_retries', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full" // Removed p-2, border, rounded-lg, focus styles as Input component handles them
                    />
                  </div>
                )}

                {/* Retry Task Selection - new setting */}
                {missionData.allow_retries && missionData.tasks.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">
                        בחירת משימה בניסיון חוזר
                      </label>
                      <TooltipButton tooltip="קובע האם בניסיון חוזר תופיע אותה משימה או משימה אחרת מהרשימה" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="retry_task_selection"
                          value="same"
                          checked={(missionData.retry_task_selection || 'same') === 'same'}
                          onChange={(e) => updateField('retry_task_selection', e.target.value)}
                          className="text-purple-600"
                        />
                        <span className="text-sm font-medium">אותה משימה</span>
                      </label>
                      
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="retry_task_selection"
                          value="different"
                          checked={(missionData.retry_task_selection || 'same') === 'different'}
                          onChange={(e) => updateField('retry_task_selection', e.target.value)}
                          className="text-purple-600"
                        />
                        <span className="text-sm font-medium">משימה אחרת</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Order */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    סדר ביצוע משימות
                  </label>
                  <TooltipButton tooltip="קובע את הסדר בו המשימות יופיעו - לפי הסדר שהוגדר או באופן רנדומלי" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="task_order"
                      value="sequential"
                      checked={missionData.task_order === 'sequential'}
                      onChange={(e) => updateField('task_order', e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="text-sm font-medium">לפי הסדר</span>
                  </label>
                  
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="task_order"
                      value="random"
                      checked={missionData.task_order === 'random'}
                      onChange={(e) => updateField('task_order', e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="text-sm font-medium">רנדומלי</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
            {/* Tasks List - Fixed layout */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4"> {/* Added mb-4 back as per existing code */}
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-bold text-gray-900">
                    משימות ({missionData.tasks.length})
                  </span>
                </div>
                <Button
                  onClick={handleAddTask}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  הוסף משימה
                </Button>
              </div>

              {missionData.tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>אין משימות עדיין</p>
                  <p className="text-sm">לחץ על "הוסף משימה" כדי להתחיל</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {missionData.tasks.map((task, index) => (
                    <Card key={task.id || index} className="border-2 border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                  משימה #{index + 1}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  שאלה אמריקאית
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => handlePreviewTask(task)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium"
                                >
                                  תצוגה מקדימה
                                </Button>
                                <Button
                                  onClick={() => handleRemoveTask(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 p-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-700 mb-3">
                              <div className="font-medium mb-2">שאלה:</div>
                              <div className="bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                                {task.question_text}
                              </div>
                            </div>

                            {/* Show correct and incorrect answers without points */}
                            <div className="grid md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="font-medium text-green-700 mb-2">תשובות נכונות:</div>
                                <div className="space-y-1">
                                  {task.correct_answers?.map((answer, idx) => (
                                    <div key={idx} className="bg-green-50 text-green-800 p-2 rounded-lg leading-relaxed">
                                      {answer.answer_text}
                                    </div>
                                  )) || []}
                                </div>
                              </div>
                              
                              <div>
                                <div className="font-medium text-red-700 mb-2">תשובות שגויות:</div>
                                <div className="space-y-1">
                                  {task.incorrect_answers?.map((answer, idx) => (
                                    <div key={idx} className="bg-red-50 text-red-800 p-2 rounded-lg leading-relaxed">
                                      {answer}
                                    </div>
                                  )) || []}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="px-6">
              ביטול
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
              שמור
            </Button>
          </div>
        </div>

        {/* Question Selection Modal */}
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-6 border-b bg-gray-50 rounded-t-2xl flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">בחירת שאלה למשימה</h3>
                  <Button
                    onClick={() => {
                      setShowAddTaskModal(false);
                      setSearchQuery('');
                    }}
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="חיפוש בשאלות, תשובות או תגיות..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 text-right"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="flex-1 overflow-auto p-6">
                {loadingQuestions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>טוען שאלות...</p>
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>לא נמצאו שאלות</p>
                    {searchQuery && <p className="text-sm">נסה מונחי חיפוש אחרים</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredQuestions.map((question) => (
                      <Card key={question.id} className="border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                        <CardContent className="p-4" onClick={() => handleSelectQuestion(question)}>
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-900 mb-2">{question.question_text}</h4>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-green-700 mb-1">תשובות נכונות:</div>
                              <div className="space-y-1">
                                {question.correct_answers?.map((answer, idx) => (
                                  <div key={idx} className="bg-green-50 text-green-800 p-2 rounded text-xs">
                                    {answer.answer_text}
                                  </div>
                                )) || []}
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium text-red-700 mb-1">תשובות שגויות:</div>
                              <div className="space-y-1">
                                {question.incorrect_answers?.map((answer, idx) => (
                                  <div key={idx} className="bg-red-50 text-red-800 p-2 rounded text-xs">
                                    {answer}
                                  </div>
                                )) || []}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Task Preview Modal */}
        {showPreview && previewTask && (
          <MultipleChoiceTaskPopup
            task={previewTask}
            missionSettings={{
              time_limit_seconds: missionData.time_limit_seconds,
              points: missionData.points,
              required_to_pass: missionData.required_to_pass
            }}
            onComplete={(result) => {
              console.log('Preview task completed:', result);
            }}
            onTimeout={() => {
              console.log('Preview task timed out');
            }}
            onClose={handleClosePreview}
            isPreview={true}
          />
        )}
      </div>
    </div>
  );
}
