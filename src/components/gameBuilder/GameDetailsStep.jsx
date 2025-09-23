import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { getGameTypeName, getGameTypeIcon } from '@/config/gameTypes';
import { GAME_SUBJECTS, getSkillsByCategory } from '@/config/gameContent';

const DEVICE_COMPATIBILITY_OPTIONS = [
  { value: 'both', label: 'מובייל ודסקטופ', description: 'המשחק יפעל על כל המכשירים' },
  { value: 'mobile_only', label: 'מובייל בלבד', description: 'המשחק מותאם למכשירים ניידים בלבד' },
  { value: 'desktop_only', label: 'דסקטופ בלבד', description: 'המשחק מותאם למחשבים בלבד' }
];

export default function GameDetailsStep({ data, onDataChange, validationErrors }) {
  const [newSkill, setNewSkill] = useState('');

  // Calculate current validation errors
  const currentErrors = [];
  if (!data.title || data.title.length < 3) {
    currentErrors.push('כותרת המשחק חייבת להכיל לפחות 3 תווים');
  }
  if (data.title && data.title.length > 100) {
    currentErrors.push('כותרת המשחק לא יכולה להכיל יותר מ-100 תווים');
  }
  if (!data.short_description || data.short_description.length < 10) {
    currentErrors.push('תיאור קצר חייב להכיל לפחות 10 תווים');
  }
  if (data.short_description && data.short_description.length > 500) {
    currentErrors.push('תיאור קצר לא יכול להכיל יותר מ-500 תווים');
  }
  if (data.price < 0 || data.price > 1000) {
    currentErrors.push('מחיר חייב להיות בין 0 ל-1000');
  }

  const handleInputChange = (field, value) => {
    onDataChange({ [field]: value });
  };

  const handleSkillAdd = (skill) => {
    if (skill && !data.skills.includes(skill)) {
      onDataChange({ skills: [...data.skills, skill] });
      setNewSkill('');
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    onDataChange({
      skills: data.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleImageUpload = () => {
    // TODO: Implement image upload functionality to uploads/games/display-images/[game-id]
    alert('העלאת תמונות תתווסף בהמשך\nהתמונות יישמרו ב-uploads/games/display-images/[game-id]');
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-3xl mb-6 shadow-lg">
          <div className="text-4xl">📝</div>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
          פרטי המשחק
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          הגדר את המידע הבסיסי על המשחק - כותרת, תיאור, הגדרות ומיומנויות
        </p>

        {data.game_type && (
          <div className="inline-flex items-center gap-3 mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl text-white">{getGameTypeIcon(data.game_type)}</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">סוג המשחק</div>
              <div className="text-lg font-bold text-blue-800">
                {getGameTypeName(data.game_type)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Basic Info */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-gradient-to-br from-white to-blue-50 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 h-1"></div>
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📝</span>
                </div>
                מידע בסיסי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-gray-700 font-semibold mb-2 block">
                  📝 כותרת המשחק *
                </Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="הכנס כותרת אטרקטיבית למשחק..."
                  className={`h-12 rounded-xl border-2 transition-all duration-200 ${
                    validationErrors.title
                      ? 'border-red-400 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-400 focus:bg-blue-50'
                  }`}
                  data-tutorial="game-title-input"
                />
                {validationErrors.title && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.title}
                  </p>
                )}
              </div>

              {/* Short Description */}
              <div>
                <Label htmlFor="short_description" className="text-gray-700 font-semibold mb-2 block">
                  💬 תיאור קצר *
                </Label>
                <Textarea
                  id="short_description"
                  value={data.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  placeholder="תאר את המשחק בקצרה - מה המטרה ומה יכשרו המשתמשים..."
                  rows={4}
                  className={`rounded-xl border-2 transition-all duration-200 resize-none ${
                    validationErrors.short_description
                      ? 'border-red-400 bg-red-50 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-400 focus:bg-blue-50'
                  }`}
                  data-tutorial="game-description-input"
                />
                <div className="flex justify-between items-center mt-2">
                  <div className={`text-sm ${
                    data.short_description.length > 450
                      ? 'text-red-500'
                      : data.short_description.length > 400
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                  }`}>
                    {data.short_description.length}/500 תווים
                  </div>
                  {data.short_description.length >= 10 && (
                    <div className="text-green-600 text-sm flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      מעולה
                    </div>
                  )}
                </div>
                {validationErrors.short_description && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.short_description}
                  </p>
                )}
              </div>

              {/* Full Description */}
              <div>
                <Label htmlFor="description">תיאור מלא (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="תיאור מפורט של המשחק..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>תמונת המשחק</CardTitle>
            </CardHeader>
            <CardContent>
              {data.image_url ? (
                <div className="space-y-4">
                  <img
                    src={data.image_url}
                    alt="תמונת המשחק"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleImageUpload}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      החלף תמונה
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleInputChange('image_url', '')}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      הסר תמונה
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
                    <ImageIcon className="w-12 h-12 mb-2" />
                    <p>אין תמונה</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleImageUpload}
                    className="mt-4 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    העלה תמונה
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Advanced Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות מתקדמות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price */}
              <div>
                <Label htmlFor="price">מחיר (₪)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  max="1000"
                  value={data.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className={validationErrors.price ? 'border-red-500' : ''}
                />
                {validationErrors.price && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.price}</p>
                )}
                {data.price === 0 && (
                  <p className="text-green-600 text-sm mt-1">המשחק יהיה חינמי</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject">מקצוע (אופציונלי)</Label>
                <div className="space-y-2">
                  <Input
                    id="subject"
                    value={data.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="הכנס מקצוע..."
                  />
                  <div className="flex flex-wrap gap-1">
                    {GAME_SUBJECTS.map(subject => (
                      <Button
                        key={subject}
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('subject', subject)}
                        className="text-xs h-7"
                      >
                        {subject}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Device Compatibility */}
              <div>
                <Label>תאימות מכשירים</Label>
                <div className="space-y-2 mt-2">
                  {DEVICE_COMPATIBILITY_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        data.device_compatibility === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('device_compatibility', option.value)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                        {data.device_compatibility === option.value && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Published Status */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>פרסום המשחק</Label>
                  <p className="text-sm text-gray-600">האם המשחק יהיה זמין במערכת?</p>
                </div>
                <Switch
                  checked={data.is_published}
                  onCheckedChange={(checked) => handleInputChange('is_published', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>מיומנויות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Skills */}
              {data.skills.length > 0 && (
                <div>
                  <Label>מיומנויות נבחרות:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.skills.map(skill => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {skill}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => handleSkillRemove(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Skill */}
              <div>
                <Label>הוסף מיומנות:</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="הכנס מיומנות..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSkillAdd(newSkill);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleSkillAdd(newSkill)}
                    disabled={!newSkill.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Skills by Category */}
              <div>
                <Label>מיומנויות לפי קטגוריות:</Label>
                <div className="space-y-3 mt-2">
                  {Object.entries(getSkillsByCategory()).map(([category, skills]) => (
                    <div key={category}>
                      <p className="text-sm font-medium text-gray-700 mb-1">{category}:</p>
                      <div className="flex flex-wrap gap-1">
                        {skills.filter(skill => !data.skills.includes(skill)).map(skill => (
                          <Button
                            key={skill}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSkillAdd(skill)}
                            className="text-xs h-7"
                          >
                            {skill}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Validation Errors Display */}
      {currentErrors.length > 0 && (
        <div className="mt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div>
                <p className="font-medium mb-2">יש לתקן את השגיאות הבאות:</p>
                <ul className="list-disc list-inside space-y-1">
                  {currentErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}