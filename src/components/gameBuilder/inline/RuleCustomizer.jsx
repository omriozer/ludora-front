import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Save,
  Settings,
  Clock,
  Target,
  Gamepad2,
  AlertCircle,
  Info
} from 'lucide-react';

export default function RuleCustomizer({ rule, onSave, onCancel }) {
  const [customizedRule, setCustomizedRule] = useState({
    ...rule,
    config: { ...rule.config }
  });
  const [activeTab, setActiveTab] = useState('basic');

  const handleBasicChange = (field, value) => {
    setCustomizedRule(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfigChange = (path, value) => {
    setCustomizedRule(prev => ({
      ...prev,
      config: updateNestedConfig(prev.config, path, value)
    }));
  };

  const updateNestedConfig = (config, path, value) => {
    const keys = path.split('.');
    const newConfig = { ...config };
    let current = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    return newConfig;
  };

  const handleSave = () => {
    onSave(customizedRule);
  };

  const getDifficultyLevels = () => {
    return Object.keys(customizedRule.config?.difficulty_levels || {});
  };

  const renderBasicSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">שם הכלל</Label>
          <Input
            id="name"
            value={customizedRule.name}
            onChange={(e) => handleBasicChange('name', e.target.value)}
            className="text-right"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">תיאור</Label>
          <Textarea
            id="description"
            value={customizedRule.description}
            onChange={(e) => handleBasicChange('description', e.target.value)}
            className="text-right"
            rows={3}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            מידע על הכלל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">סוג כלל:</span>
            <Badge variant="outline">{rule.template?.name}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">תוכן נדרש:</span>
            <div className="flex gap-1">
              {rule.template?.required_content_types.map(type => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">משחקים תואמים:</span>
            <Badge variant="outline">
              {rule.template?.compatible_game_types.length} סוגים
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderScoringSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            הגדרות ניקוד
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ניקוד תשובה נכונה</Label>
              <Input
                type="number"
                value={customizedRule.config?.scoring?.correct || 10}
                onChange={(e) => handleConfigChange('scoring.correct', parseInt(e.target.value))}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>ניקוד תשובה שגויה</Label>
              <Input
                type="number"
                value={customizedRule.config?.scoring?.incorrect || 0}
                onChange={(e) => handleConfigChange('scoring.incorrect', parseInt(e.target.value))}
                max="0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="time-bonus">בונוס זמן</Label>
            <Switch
              id="time-bonus"
              checked={customizedRule.config?.scoring?.time_bonus || false}
              onCheckedChange={(checked) => handleConfigChange('scoring.time_bonus', checked)}
            />
          </div>

          {customizedRule.config?.scoring?.time_bonus && (
            <div className="space-y-2">
              <Label>מקדם בונוס זמן</Label>
              <div className="px-2">
                <Slider
                  value={[customizedRule.config?.scoring?.time_multiplier || 1.5]}
                  onValueChange={([value]) => handleConfigChange('scoring.time_multiplier', value)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>x1</span>
                  <span>x{customizedRule.config?.scoring?.time_multiplier || 1.5}</span>
                  <span>x3</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTimingSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            הגדרות זמן
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {getDifficultyLevels().map((level) => {
            const levelConfig = customizedRule.config?.difficulty_levels?.[level];
            if (!levelConfig) return null;

            return (
              <div key={level} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">רמת {level}</h4>
                  <Badge variant="outline">{level}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>מגבלת זמן (שניות)</Label>
                    <Input
                      type="number"
                      value={levelConfig.time_limit || 30}
                      onChange={(e) => handleConfigChange(
                        `difficulty_levels.${level}.time_limit`,
                        parseInt(e.target.value)
                      )}
                      min="5"
                      max="300"
                    />
                  </div>

                  {levelConfig.options_count !== undefined && (
                    <div className="space-y-2">
                      <Label>מספר אפשרויות</Label>
                      <Input
                        type="number"
                        value={levelConfig.options_count || 3}
                        onChange={(e) => handleConfigChange(
                          `difficulty_levels.${level}.options_count`,
                          parseInt(e.target.value)
                        )}
                        min="2"
                        max="8"
                      />
                    </div>
                  )}
                </div>

                {levelConfig.hints_allowed !== undefined && (
                  <div className="space-y-2">
                    <Label>רמזים מותרים</Label>
                    <Input
                      type="number"
                      value={levelConfig.hints_allowed || 1}
                      onChange={(e) => handleConfigChange(
                        `difficulty_levels.${level}.hints_allowed`,
                        parseInt(e.target.value)
                      )}
                      min="0"
                      max="5"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

  const renderGameplaySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            הגדרות משחק
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מינימום אפשרויות</Label>
              <Input
                type="number"
                value={customizedRule.config?.min_options || 2}
                onChange={(e) => handleConfigChange('min_options', parseInt(e.target.value))}
                min="2"
                max="10"
              />
            </div>

            <div className="space-y-2">
              <Label>מקסימום אפשרויות</Label>
              <Input
                type="number"
                value={customizedRule.config?.max_options || 6}
                onChange={(e) => handleConfigChange('max_options', parseInt(e.target.value))}
                min="2"
                max="10"
              />
            </div>
          </div>

          {/* Rule-specific settings */}
          {rule.template?.config?.rule_type === 'open_question' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="partial-match">התאמה חלקית</Label>
                <Switch
                  id="partial-match"
                  checked={customizedRule.config?.allow_partial_match || false}
                  onCheckedChange={(checked) => handleConfigChange('allow_partial_match', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="case-sensitive">רגיש לאותיות גדולות/קטנות</Label>
                <Switch
                  id="case-sensitive"
                  checked={customizedRule.config?.case_sensitive || false}
                  onCheckedChange={(checked) => handleConfigChange('case_sensitive', checked)}
                />
              </div>
            </div>
          )}

          {rule.template?.config?.rule_type === 'translation' && (
            <div className="space-y-2">
              <Label>כיוון תרגום</Label>
              <Select
                value={customizedRule.config?.direction || 'both'}
                onValueChange={(value) => handleConfigChange('direction', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hebrew_to_english">עברית לאנגלית</SelectItem>
                  <SelectItem value="english_to_hebrew">אנגלית לעברית</SelectItem>
                  <SelectItem value="both">שני כיוונים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {rule.template?.config?.rule_type === 'ar_object_detection' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="confirmation-required">נדרש אישור</Label>
                <Switch
                  id="confirmation-required"
                  checked={customizedRule.config?.confirmation_required || true}
                  onCheckedChange={(checked) => handleConfigChange('confirmation_required', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>מצב זיהוי</Label>
                <Select
                  value={customizedRule.config?.detection_mode || 'manual'}
                  onValueChange={(value) => handleConfigChange('detection_mode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">ידני</SelectItem>
                    <SelectItem value="automatic">אוטומטי (עתידי)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            התאמת כלל משחק: {rule.name}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            התאם את הכלל לפי הצרכים הספציפיים של המשחק שלך
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">בסיסי</TabsTrigger>
            <TabsTrigger value="scoring">ניקוד</TabsTrigger>
            <TabsTrigger value="timing">זמן</TabsTrigger>
            <TabsTrigger value="gameplay">משחק</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            {renderBasicSettings()}
          </TabsContent>

          <TabsContent value="scoring" className="mt-6">
            {renderScoringSettings()}
          </TabsContent>

          <TabsContent value="timing" className="mt-6">
            {renderTimingSettings()}
          </TabsContent>

          <TabsContent value="gameplay" className="mt-6">
            {renderGameplaySettings()}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}