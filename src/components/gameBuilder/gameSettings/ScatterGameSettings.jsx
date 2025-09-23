import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ScatterGameSettings({ data, onDataChange, validationErrors = {} }) {
  const settings = data?.game_settings || {};

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...settings,
      [key]: value
    };

    onDataChange({
      game_settings: newSettings
    });
  };

  const handleDirectionChange = (direction, checked) => {
    const currentDirections = settings.word_directions || [];
    const newDirections = checked
      ? [...currentDirections, direction]
      : currentDirections.filter(d => d !== direction);

    handleSettingChange('word_directions', newDirections);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">הגדרות משחק תפזורת</h2>
        <p className="text-gray-600">
          התאמת פרמטרי המשחק לרמת הקושי והחוויה הרצויה
        </p>
      </div>

      {validationErrors.game_settings && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationErrors.game_settings}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>הגדרות בסיסיות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="grid_size">גודל הרשת</Label>
              <Select
                value={settings.grid_size?.toString() || "15"}
                onValueChange={(value) => handleSettingChange('grid_size', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר גודל רשת" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10x10</SelectItem>
                  <SelectItem value="12">12x12</SelectItem>
                  <SelectItem value="15">15x15</SelectItem>
                  <SelectItem value="18">18x18</SelectItem>
                  <SelectItem value="20">20x20</SelectItem>
                  <SelectItem value="25">25x25</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="words_per_level">מספר מילים לכל רמה</Label>
              <Input
                id="words_per_level"
                type="number"
                min="3"
                max="20"
                value={settings.words_per_level || 8}
                onChange={(e) => handleSettingChange('words_per_level', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="difficulty_level">רמת קושי</Label>
              <Select
                value={settings.difficulty_level || "medium"}
                onValueChange={(value) => handleSettingChange('difficulty_level', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר רמת קושי" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">קל</SelectItem>
                  <SelectItem value="medium">בינוני</SelectItem>
                  <SelectItem value="hard">קשה</SelectItem>
                  <SelectItem value="expert">מומחה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הגדרות זמן</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="time_limited"
                checked={settings.time_limited || false}
                onCheckedChange={(checked) => handleSettingChange('time_limited', checked)}
              />
              <Label htmlFor="time_limited">זמן מוגבל</Label>
            </div>

            {settings.time_limited && (
              <div>
                <Label htmlFor="time_limit_seconds">זמן מוגבל (שניות)</Label>
                <Input
                  id="time_limit_seconds"
                  type="number"
                  min="30"
                  value={settings.time_limit_seconds || 300}
                  onChange={(e) => handleSettingChange('time_limit_seconds', parseInt(e.target.value))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>כיווני מילים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="horizontal"
                  checked={settings.word_directions?.includes('horizontal') !== false}
                  onCheckedChange={(checked) => handleDirectionChange('horizontal', checked)}
                />
                <Label htmlFor="horizontal">אופקי</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vertical"
                  checked={settings.word_directions?.includes('vertical') !== false}
                  onCheckedChange={(checked) => handleDirectionChange('vertical', checked)}
                />
                <Label htmlFor="vertical">אנכי</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="diagonal"
                  checked={settings.word_directions?.includes('diagonal') !== false}
                  onCheckedChange={(checked) => handleDirectionChange('diagonal', checked)}
                />
                <Label htmlFor="diagonal">אלכסוני</Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_backwards"
                checked={settings.allow_backwards !== false}
                onCheckedChange={(checked) => handleSettingChange('allow_backwards', checked)}
              />
              <Label htmlFor="allow_backwards">אפשר מילים הפוכות</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הגדרות תצוגה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="highlight_found_words"
                checked={settings.highlight_found_words !== false}
                onCheckedChange={(checked) => handleSettingChange('highlight_found_words', checked)}
              />
              <Label htmlFor="highlight_found_words">הדגש מילים שנמצאו</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show_word_list"
                checked={settings.show_word_list !== false}
                onCheckedChange={(checked) => handleSettingChange('show_word_list', checked)}
              />
              <Label htmlFor="show_word_list">הצג רשימת מילים</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="case_sensitive"
                checked={settings.case_sensitive || false}
                onCheckedChange={(checked) => handleSettingChange('case_sensitive', checked)}
              />
              <Label htmlFor="case_sensitive">רגישות לאותיות גדולות/קטנות</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_advance"
                checked={settings.auto_advance || false}
                onCheckedChange={(checked) => handleSettingChange('auto_advance', checked)}
              />
              <Label htmlFor="auto_advance">מעבר אוטומטי לרמה הבאה</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}