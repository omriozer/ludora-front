import React, { useState, useEffect } from "react";
import { getApiBase } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Gamepad2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";

const GAME_TYPES = [
  { value: 'scatter_game', label: 'משחק פיזור' },
  { value: 'wisdom_maze', label: 'מבוך חכמה' },
  { value: 'sharp_and_smooth', label: 'חד וחלק' },
  { value: 'memory_game', label: 'משחק זיכרון' },
  { value: 'ar_up_there', label: 'AR למעלה' }
];

const DEVICE_COMPATIBILITY = [
  { value: 'both', label: 'כל המכשירים' },
  { value: 'mobile_only', label: 'נייד בלבד' },
  { value: 'desktop_only', label: 'מחשב בלבד' }
];

export default function GameModal({
  isOpen,
  onClose,
  game = null,
  onSaved
}) {
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    game_type: "",
    device_compatibility: "both",
    game_settings: {}
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (game) {
        loadEditingGame();
      } else {
        resetForm();
      }
    } else {
      resetForm();
      setMessage(null);
    }
  }, [isOpen, game]);

  const loadEditingGame = () => {
    setFormData({
      title: game.title || "",
      description: game.description || "",
      game_type: game.game_type || "",
      device_compatibility: game.device_compatibility || "both",
      game_settings: game.game_settings || {}
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      game_type: "",
      device_compatibility: "both",
      game_settings: {}
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGameSettingsChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      game_settings: {
        ...prev.game_settings,
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'שומר משחק...' });

      // Prepare data for API
      const gameData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim()
      };

      // Validate required fields
      if (!gameData.title) {
        setMessage({ type: 'error', text: 'כותרת המשחק נדרשת' });
        return;
      }

      const apiUrl = game
        ? `${getApiBase()}/games/${game.id}`
        : `${getApiBase()}/games`;

      const method = game ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gameData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setMessage({ type: 'success', text: 'המשחק נשמר בהצלחה' });

      toast({
        title: game ? "משחק עודכן" : "משחק נוצר",
        description: game ? "המשחק עודכן בהצלחה" : "המשחק נוצר בהצלחה",
        variant: "default"
      });

      if (onSaved) {
        onSaved(result);
      }

      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      cerror('Error saving game:', error);
      setMessage({
        type: 'error',
        text: error.message || 'שגיאה בשמירת המשחק'
      });
      toast({
        title: "שגיאה בשמירה",
        description: error.message || 'לא ניתן לשמור את המשחק',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderGameTypeSpecificSettings = () => {
    if (!formData.game_type) return null;

    switch (formData.game_type) {
      case 'memory_game':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">הגדרות משחק זיכרון</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cards_count">מספר קלפים</Label>
                <Input
                  id="cards_count"
                  type="number"
                  min="4"
                  max="20"
                  value={formData.game_settings.cards_count || ""}
                  onChange={(e) => handleGameSettingsChange('cards_count', parseInt(e.target.value) || "")}
                  placeholder="8"
                />
              </div>
              <div>
                <Label htmlFor="difficulty">רמת קושי</Label>
                <Select
                  value={formData.game_settings.difficulty || ""}
                  onValueChange={(value) => handleGameSettingsChange('difficulty', value)}
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
            </div>
          </div>
        );

      case 'scatter_game':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">הגדרות משחק פיזור</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="items_count">מספר פריטים</Label>
                <Input
                  id="items_count"
                  type="number"
                  min="5"
                  max="30"
                  value={formData.game_settings.items_count || ""}
                  onChange={(e) => handleGameSettingsChange('items_count', parseInt(e.target.value) || "")}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="time_limit">מגבלת זמן (שניות)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  min="30"
                  max="300"
                  value={formData.game_settings.time_limit || ""}
                  onChange={(e) => handleGameSettingsChange('time_limit', parseInt(e.target.value) || "")}
                  placeholder="60"
                />
              </div>
            </div>
          </div>
        );

      case 'wisdom_maze':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">הגדרות מבוך חכמה</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maze_size">גודל מבוך</Label>
                <Select
                  value={formData.game_settings.maze_size || ""}
                  onValueChange={(value) => handleGameSettingsChange('maze_size', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר גודל מבוך" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">קטן (5x5)</SelectItem>
                    <SelectItem value="medium">בינוני (7x7)</SelectItem>
                    <SelectItem value="large">גדול (10x10)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="questions_count">מספר שאלות</Label>
                <Input
                  id="questions_count"
                  type="number"
                  min="3"
                  max="15"
                  value={formData.game_settings.questions_count || ""}
                  onChange={(e) => handleGameSettingsChange('questions_count', parseInt(e.target.value) || "")}
                  placeholder="5"
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">הגדרות כלליות</h4>
            <div>
              <Label htmlFor="custom_settings">הגדרות מותאמות אישית (JSON)</Label>
              <Textarea
                id="custom_settings"
                value={JSON.stringify(formData.game_settings, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleInputChange('game_settings', parsed);
                  } catch (error) {
                    // Invalid JSON, keep as string for now
                  }
                }}
                placeholder='{"setting1": "value1", "setting2": "value2"}'
                rows={4}
              />
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">
            {game ? 'עריכת משחק' : 'משחק חדש'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-500' :
                             message.type === 'success' ? 'border-green-500' :
                             'border-blue-500'}>
              {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
               message.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
               <Loader2 className="h-4 w-4 animate-spin" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">פרטים בסיסיים</h3>

            <div>
              <Label htmlFor="title">כותרת המשחק *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="שם המשחק"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">תיאור המשחק</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="תיאור קצר של המשחק ומטרתו"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="game_type">סוג משחק</Label>
                <Select
                  value={formData.game_type}
                  onValueChange={(value) => handleInputChange('game_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג משחק" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="device_compatibility">תמיכת מכשירים</Label>
                <Select
                  value={formData.device_compatibility}
                  onValueChange={(value) => handleInputChange('device_compatibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_COMPATIBILITY.map((device) => (
                      <SelectItem key={device.value} value={device.value}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Game-specific settings */}
          {renderGameTypeSpecificSettings()}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {game ? 'עדכן' : 'שמור'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              ביטול
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}