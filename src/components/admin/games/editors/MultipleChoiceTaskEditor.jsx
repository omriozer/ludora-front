import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Trash2 } from 'lucide-react';

export default function MultipleChoiceTaskEditor({ task, onSave, onCancel }) {
  const [taskData, setTaskData] = useState({
    type: 'multiple_choice',
    question_text: '',
    correct_answers: [{ answer_text: '', points: 1 }],
    incorrect_answers: ['', '', ''],
    ...task
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      setTaskData({
        type: 'multiple_choice',
        question_text: '',
        correct_answers: [{ answer_text: '', points: 1 }],
        incorrect_answers: ['', '', ''],
        ...task
      });
    }
  }, [task]);

  const validateForm = () => {
    const newErrors = {};

    if (!taskData.question_text.trim()) {
      newErrors.question_text = 'נדרש טקסט שאלה';
    }

    if (!taskData.correct_answers.some(answer => answer.answer_text.trim())) {
      newErrors.correct_answers = 'נדרשת לפחות תשובה נכונה אחת';
    }

    if (!taskData.incorrect_answers.some(answer => answer.trim())) {
      newErrors.incorrect_answers = 'נדרשת לפחות תשובה שגויה אחת';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      // Clean up empty answers
      const cleanedData = {
        ...taskData,
        correct_answers: taskData.correct_answers.filter(answer => answer.answer_text.trim()),
        incorrect_answers: taskData.incorrect_answers.filter(answer => answer.trim())
      };
      onSave(cleanedData);
    }
  };

  const addCorrectAnswer = () => {
    setTaskData(prev => ({
      ...prev,
      correct_answers: [...prev.correct_answers, { answer_text: '', points: 1 }]
    }));
  };

  const removeCorrectAnswer = (index) => {
    if (taskData.correct_answers.length > 1) {
      setTaskData(prev => ({
        ...prev,
        correct_answers: prev.correct_answers.filter((_, i) => i !== index)
      }));
    }
  };

  const updateCorrectAnswer = (index, field, value) => {
    setTaskData(prev => ({
      ...prev,
      correct_answers: prev.correct_answers.map((answer, i) =>
        i === index ? { ...answer, [field]: value } : answer
      )
    }));
  };

  const addIncorrectAnswer = () => {
    setTaskData(prev => ({
      ...prev,
      incorrect_answers: [...prev.incorrect_answers, '']
    }));
  };

  const removeIncorrectAnswer = (index) => {
    if (taskData.incorrect_answers.length > 1) {
      setTaskData(prev => ({
        ...prev,
        incorrect_answers: prev.incorrect_answers.filter((_, i) => i !== index)
      }));
    }
  };

  const updateIncorrectAnswer = (index, value) => {
    setTaskData(prev => ({
      ...prev,
      incorrect_answers: prev.incorrect_answers.map((answer, i) =>
        i === index ? value : answer
      )
    }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Question Text */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          טקסט השאלה *
        </label>
        <Textarea
          value={taskData.question_text}
          onChange={(e) => setTaskData(prev => ({ ...prev, question_text: e.target.value }))}
          placeholder="הכנס את השאלה כאן..."
          className="w-full h-24 text-right"
        />
        {errors.question_text && (
          <p className="text-red-500 text-xs mt-1">{errors.question_text}</p>
        )}
      </div>

      {/* Correct Answers */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-green-700">תשובות נכונות</CardTitle>
            <Button
              type="button"
              onClick={addCorrectAnswer}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף תשובה נכונה
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {taskData.correct_answers.map((answer, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                value={answer.answer_text}
                onChange={(e) => updateCorrectAnswer(index, 'answer_text', e.target.value)}
                placeholder="תשובה נכונה..."
                className="flex-1 text-right"
              />
              <Input
                type="number"
                min="0"
                value={answer.points}
                onChange={(e) => updateCorrectAnswer(index, 'points', parseInt(e.target.value) || 0)}
                placeholder="נקודות"
                className="w-20"
              />
              {taskData.correct_answers.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeCorrectAnswer(index)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {errors.correct_answers && (
            <p className="text-red-500 text-xs">{errors.correct_answers}</p>
          )}
        </CardContent>
      </Card>

      {/* Incorrect Answers */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-red-700">תשובות שגויות</CardTitle>
            <Button
              type="button"
              onClick={addIncorrectAnswer}
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף תשובה שגויה
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {taskData.incorrect_answers.map((answer, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={answer}
                onChange={(e) => updateIncorrectAnswer(index, e.target.value)}
                placeholder="תשובה שגויה..."
                className="flex-1 text-right"
              />
              {taskData.incorrect_answers.length > 1 && (
                <Button
                  type="button"
                  onClick={() => removeIncorrectAnswer(index)}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {errors.incorrect_answers && (
            <p className="text-red-500 text-xs">{errors.incorrect_answers}</p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-start gap-3 pt-4">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          שמור משימה
        </Button>
        <Button onClick={onCancel} variant="outline">
          ביטול
        </Button>
      </div>
    </div>
  );
}