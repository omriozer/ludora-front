import React, { useState, useEffect } from 'react';
import { GameAudioSettings, AudioFile } from '@/services/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Volume2 } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

export default function AudioSettings({ showMessage }) {
  const [audioFiles, setAudioFiles] = useState([]);
  const [gameSettings, setGameSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const gameTypes = [
    { id: 'general', name: 'הגדרות כלליות' },
    { id: 'sharp_and_smooth', name: 'חד וחלק' },
    { id: 'elevator_game', name: 'משחק המעלית' },
    { id: 'memory_game', name: 'משחק הזיכרון' }
  ];

  const audioSlots = [
    { key: 'opening_music', name: 'מנגינת פתיחה' },
    { key: 'ending_music', name: 'מנגינת סיום' },
    { key: 'correct_answer_sound', name: 'פידבק תשובה נכונה' },
    { key: 'wrong_answer_sound', name: 'פידבק תשובה שגויה' },
    { key: 'action_sound', name: 'צליל פעולה' },
    { key: 'background_music', name: 'מנגינת רקע בזמן משחק' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [files, settings] = await Promise.all([
        AudioFile.list('-created_date'),
        GameAudioSettings.find()
      ]);
      
      setAudioFiles(files);
      setGameSettings(settings);

      // Initialize default settings for each game type if not exists
      for (const gameType of gameTypes) {
        const existingSetting = settings.find(s => s.game_type === gameType.id);
        if (!existingSetting) {
          await GameAudioSettings.create({
            game_type: gameType.id,
            master_volume: 0.7
          });
        }
      }

      // Reload settings after initialization
      const updatedSettings = await GameAudioSettings.find();
      setGameSettings(updatedSettings);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  };

  const updateAudioSetting = async (gameType, slotKey, audioFileId) => {
    try {
      const existingSetting = gameSettings.find(s => s.game_type === gameType);
      
      if (existingSetting) {
        await GameAudioSettings.update(existingSetting.id, {
          [slotKey]: audioFileId || null
        });
      } else {
        await GameAudioSettings.create({
          game_type: gameType,
          [slotKey]: audioFileId || null,
          master_volume: 0.7
        });
      }

      // Update is_default_for in audio files
      await updateAudioFileDefaults();
      showMessage('success', 'הגדרת הצליל עודכנה בהצלחה');
      loadData();
    } catch (error) {
      console.error('Error updating audio setting:', error);
      showMessage('error', 'שגיאה בעדכון הגדרת הצליל');
    }
  };

  const updateAudioFileDefaults = async () => {
    // Update all audio files to reflect their current default usage
    for (const audioFile of audioFiles) {
      const defaultUsages = [];
      
      for (const setting of gameSettings) {
        for (const slot of audioSlots) {
          if (setting[slot.key] === audioFile.id) {
            const gameTypeName = gameTypes.find(gt => gt.id === setting.game_type)?.name || setting.game_type;
            defaultUsages.push(`${gameTypeName} - ${slot.name}`);
          }
        }
      }

      if (defaultUsages.length !== audioFile.is_default_for?.length || 
          !defaultUsages.every(usage => audioFile.is_default_for?.includes(usage))) {
        await AudioFile.update(audioFile.id, {
          is_default_for: defaultUsages
        });
      }
    }
  };

  const getAudioFileById = (fileId) => {
    return audioFiles.find(file => file.id === fileId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-600">טוען הגדרות אודיו...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold">הגדרות צלילי ברירת מחדל</h3>
      </div>

      <div className="space-y-6">
        {gameTypes.map(gameType => {
          const currentSettings = gameSettings.find(s => s.game_type === gameType.id) || {};
          
          return (
            <Card key={gameType.id} className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  {gameType.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {audioSlots.map(slot => {
                    const selectedFileId = currentSettings[slot.key];
                    const selectedFile = selectedFileId ? getAudioFileById(selectedFileId) : null;
                    
                    return (
                      <div key={slot.key} className="space-y-3 p-4 bg-white rounded-lg border">
                        <Label className="text-sm font-medium block">{slot.name}</Label>
                        
                        <Select
                          value={selectedFileId || ''}
                          onValueChange={(value) => updateAudioSetting(gameType.id, slot.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר קובץ אודיו..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>ללא צליל</SelectItem>
                            {audioFiles.map(file => (
                              <SelectItem key={file.id} value={file.id}>
                                {file.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Audio Player */}
                        <div className="mt-2">
                          {selectedFile ? (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="text-xs text-gray-600 mb-2">
                                {selectedFile.name}
                              </div>
                              <AudioPlayer
                                src={selectedFile.file_url}
                                volume={selectedFile.volume}
                                className="w-full"
                              />
                            </div>
                          ) : (
                            <div className="bg-gray-100 p-3 rounded-lg text-center">
                              <div className="text-sm text-gray-500 mb-2">לא נבחר קובץ</div>
                              <div className="h-8 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-400">נגן לא פעיל</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-700">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">
              שימו לב: צליל אחד יכול לשמש כברירת מחדל למספר מקומות בו זמנית
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}