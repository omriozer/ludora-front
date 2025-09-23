import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X } from 'lucide-react';

export default function RuleBuilder({
  gameType,
  initialRule = null,
  onSave,
  onCancel
}) {
  const [ruleData, setRuleData] = useState({
    name: initialRule?.name || '',
    description: initialRule?.description || '',
    rule_type: initialRule?.rule_type || '',
    compatible_game_types: initialRule?.compatible_game_types || [gameType],
    content_requirements: initialRule?.content_requirements || [],
    validation_config: initialRule?.validation_config || {},
    difficulty_level: initialRule?.difficulty_level || 'medium'
  });

  const [isLoading, setIsLoading] = useState(false);

  const ruleTypes = [
    { value: 'opposite_word', label: 'מציאת מילה הפוכה' },
    { value: 'translation', label: 'תרגום' },
    { value: 'same_meaning', label: 'מציאת מילה בעלת משמעות זהה' },
    { value: 'image_word_match', label: 'התאמת תמונה למילה' },
    { value: 'image_category', label: 'קטגוריית תמונה' },
    { value: 'multiple_choice', label: 'בחירה מרובה' },
    { value: 'open_question', label: 'שאלה פתוחה' },
    { value: 'ar_object_detection', label: 'זיהוי אובייקט במציאות רבודה' },
    { value: 'ar_scavenger_hunt', label: 'חיפוש אוצר במציאות רבודה' },
    { value: 'pair_matching', label: 'התאמת זוגות' },
    { value: 'attribute_matching', label: 'התאמה לפי תכונות' }
  ];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(ruleData);
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {initialRule ? 'עריכת כלל משחק' : 'יצירת כלל משחק חדש'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="rule-name">שם הכלל *</Label>
            <Input
              id="rule-name"
              value={ruleData.name}
              onChange={(e) => setRuleData({
                ...ruleData,
                name: e.target.value
              })}
              placeholder="הכנס שם לכלל המשחק"
            />
          </div>

          <div>
            <Label htmlFor="rule-description">תיאור הכלל</Label>
            <Textarea
              id="rule-description"
              value={ruleData.description}
              onChange={(e) => setRuleData({
                ...ruleData,
                description: e.target.value
              })}
              placeholder="תאר את הכלל והמטרה שלו"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="rule-type">סוג הכלל *</Label>
            <Select
              value={ruleData.rule_type}
              onValueChange={(value) => setRuleData({
                ...ruleData,
                rule_type: value
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג כלל" />
              </SelectTrigger>
              <SelectContent>
                {ruleTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="difficulty">רמת קושי</Label>
            <Select
              value={ruleData.difficulty_level}
              onValueChange={(value) => setRuleData({
                ...ruleData,
                difficulty_level: value
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר רמת קושי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">קל</SelectItem>
                <SelectItem value="medium">בינוני</SelectItem>
                <SelectItem value="hard">קשה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !ruleData.name.trim() || !ruleData.rule_type}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  {initialRule ? 'עדכן כלל' : 'צור כלל'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}