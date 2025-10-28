import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GAME_TYPES } from '@/config/gameTypes';

/**
 * GameProductSection - Handles game-specific settings
 * Game type, device compatibility, and game-specific attributes
 */
const GameProductSection = ({
  formData,
  updateFormData,
  globalSettings
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-indigo-900">הגדרות משחק</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">סוג משחק</Label>
          <Select
            value={formData.type_attributes?.game_type || ''}
            onValueChange={(value) => updateFormData({
              type_attributes: {
                ...formData.type_attributes,
                game_type: value
              }
            })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="בחר סוג משחק" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(GAME_TYPES).map((gameType) => (
                <SelectItem key={gameType.key} value={gameType.key}>
                  {gameType.singular}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">תאימות מכשירים</Label>
          <Select
            value={formData.type_attributes?.device_compatibility || 'both'}
            onValueChange={(value) => updateFormData({
              type_attributes: {
                ...formData.type_attributes,
                device_compatibility: value
              }
            })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="בחר תאימות מכשירים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">שניהם</SelectItem>
              <SelectItem value="desktop_only">מחשב בלבד</SelectItem>
              <SelectItem value="mobile_only">נייד בלבד</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default GameProductSection;