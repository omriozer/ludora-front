import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Clock,
  Users,
  Play,
  Settings,
  Calendar,
  Timer,
  UserPlus,
  BookOpen,
  UserCheck,
  Shuffle,
  ArrowRight,
  MousePointer
} from 'lucide-react';

/**
 * Enhanced Lobby Activation Dialog
 * Supports setting expiration, max players, and session configuration
 */
export default function EnhancedLobbyActivationDialog({
  isOpen,
  onClose,
  onConfirm,
  gameType = 'memory_game',
  gameName = '',
  isLoading = false,
  isEditMode = false,
  existingLobbyData = null
}) {
  // Game type configurations
  const gameTypeConfigs = {
    memory_game: {
      lobbyDefaults: { max_players: 40, session_duration: 40 },
      sessionDefaults: { players_per_session: 2, max_players_per_session: 2, name: 'חדר משחק זיכרון' },
      description: 'משחק זיכרון לזוגות - 2 שחקנים בכל חדר'
    },
    scatter_game: {
      lobbyDefaults: { max_players: 40, session_duration: 40 },
      sessionDefaults: { players_per_session: 6, max_players_per_session: 8, name: 'חדר משחק פיזור' },
      description: 'משחק פיזור קבוצתי - עד 8 שחקנים בכל חדר'
    },
    sharp_and_smooth: {
      lobbyDefaults: { max_players: 40, session_duration: 40 },
      sessionDefaults: { players_per_session: 4, max_players_per_session: 6, name: 'חדר משחק חד וחלק' },
      description: 'משחק חד וחלק - עד 6 שחקנים בכל חדר'
    },
    ar_up_there: {
      lobbyDefaults: { max_players: 40, session_duration: 40 },
      sessionDefaults: { players_per_session: 4, max_players_per_session: 6, name: 'חדר משחק AR' },
      description: 'משחק מציאות מוגברת - עד 6 שחקנים בכל חדר'
    }
  };

  const config = gameTypeConfigs[gameType] || gameTypeConfigs.memory_game;

  // Form state
  const [formData, setFormData] = useState({
    // Expiration settings
    durationType: 'duration', // 'duration', 'specific_time', 'indefinite'
    duration: config.lobbyDefaults.session_duration, // minutes
    expiresAt: '',

    // Player settings
    maxPlayers: config.lobbyDefaults.max_players,

    // Invitation settings
    invitationType: 'manual_selection', // 'manual_selection', 'teacher_assignment', 'random', 'order'

    // Session configuration
    autoCreateSessions: true,
    playersPerSession: config.sessionDefaults.players_per_session
  });

  // Calculate suggested session distribution
  const calculateSessionDistribution = () => {
    const totalPlayers = formData.maxPlayers;
    const playersPerSession = formData.playersPerSession;
    const recommendedSessions = Math.ceil(totalPlayers / playersPerSession);
    const actualPlayersPerSession = Math.ceil(totalPlayers / recommendedSessions);

    return {
      recommendedSessions,
      actualPlayersPerSession,
      totalCapacity: recommendedSessions * actualPlayersPerSession
    };
  };

  const sessionDistribution = calculateSessionDistribution();

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        durationType: 'duration',
        duration: config.lobbyDefaults.session_duration,
        expiresAt: '',
        maxPlayers: config.lobbyDefaults.max_players,
        invitationType: 'manual_selection',
        autoCreateSessions: true,
        playersPerSession: config.sessionDefaults.players_per_session
      });
    }
  }, [isOpen, gameType]);

  // Handle form submission
  const handleSubmit = () => {
    let expires_at = null;

    if (formData.durationType === 'duration') {
      // Calculate expiration from duration
      const now = new Date();
      expires_at = new Date(now.getTime() + formData.duration * 60 * 1000);
    } else if (formData.durationType === 'specific_time' && formData.expiresAt) {
      expires_at = new Date(formData.expiresAt);
    } else if (formData.durationType === 'indefinite') {
      expires_at = 'indefinite';
    }

    const activationData = {
      expires_at,
      max_players: formData.maxPlayers,
      invitation_type: formData.invitationType,
      session_config: {
        auto_create_sessions: formData.autoCreateSessions,
        session_count: sessionDistribution.recommendedSessions,
        players_per_session: formData.playersPerSession
      }
    };

    onConfirm(activationData);
  };

  // Generate default session names
  const generateSessionNames = (count) => {
    const baseName = config.sessionDefaults.name;
    return Array.from({ length: count }, (_, i) => `${baseName} ${i + 1}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="text-right pb-6">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
            <Play className="w-8 h-8 text-blue-600" />
            {isEditMode ? `עריכת הגדרות לובי - ${gameName}` : `יצירת לובי חדש - ${gameName}`}
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-lg mt-3 text-right">
            {isEditMode
              ? "ערוך את הגדרות הלובי. שינויים בזמן ישפיעו על כל החדרים הקיימים, שינויים אחרים רק על חדרים חדשים"
              : "הגדר את הגדרות הלובי, מספר השחקנים המרבי וחדרי המשחק שייווצרו אוטומטית"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">

          {/* Lobby Settings - Compact Single Row Layout */}
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <Label className="text-lg font-semibold">זמן סיום הלובי</Label>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <Label className="text-lg font-semibold">הגדרות שחקנים</Label>
              </div>
            </div>

            <div className="space-y-4">
              {/* Invitation Type Field - Full Width */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  אופן הצטרפות תלמידים
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      formData.invitationType === 'manual_selection'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, invitationType: 'manual_selection' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MousePointer className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">בחירה ידנית</span>
                    </div>
                    <p className="text-xs text-gray-600">תלמידים רואים את כל החדרים ובוחרים איפה להצטרף</p>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      formData.invitationType === 'teacher_assignment'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, invitationType: 'teacher_assignment' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">הקצאת מורה</span>
                    </div>
                    <p className="text-xs text-gray-600">המורה מקצה מראש תלמידים לחדרים ספציפיים</p>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      formData.invitationType === 'random'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, invitationType: 'random' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shuffle className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-sm">הקצאה אקראית</span>
                    </div>
                    <p className="text-xs text-gray-600">המערכת מקצה תלמידים אקראית לחדרים פנויים</p>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      formData.invitationType === 'order'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, invitationType: 'order' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRight className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-sm">לפי סדר הגעה</span>
                    </div>
                    <p className="text-xs text-gray-600">תלמידים נכנסים לחדרים לפי סדר הגעה עד שמתמלאים</p>
                  </div>
                </div>
              </div>

              {/* Compact 4-column layout for other fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Duration Type */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">סוג זמן סיום</Label>
                  <Select
                    value={formData.durationType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, durationType: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="בחר סוג" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duration">החל מעכשיו</SelectItem>
                      <SelectItem value="specific_time">תאריך ושעה</SelectItem>
                      <SelectItem value="indefinite">ללא הגבלה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration Value */}
                <div>
                  {formData.durationType === 'duration' && (
                    <>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">משך זמן (דקות)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="1440"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        className="h-10 text-sm"
                        placeholder="40"
                      />
                    </>
                  )}

                  {formData.durationType === 'specific_time' && (
                    <>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">תאריך ושעה</Label>
                      <Input
                        type="datetime-local"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                        min={new Date().toISOString().slice(0, 16)}
                        className="h-10 text-sm"
                      />
                    </>
                  )}
                </div>

                {/* Max Players */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">מספר שחקנים מרבי בלובי</Label>
                  <Input
                    type="number"
                    min="2"
                    max="100"
                    value={formData.maxPlayers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                    className="h-10 text-sm"
                    placeholder="40"
                  />
                </div>

                {/* Players Per Session */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">שחקנים בכל חדר משחק</Label>
                  <Input
                    type="number"
                    min="1"
                    max={config.sessionDefaults.max_players_per_session}
                    value={formData.playersPerSession}
                    onChange={(e) => setFormData(prev => ({ ...prev, playersPerSession: parseInt(e.target.value) }))}
                    className="h-10 text-sm"
                    placeholder="2"
                  />
                </div>
              </div>

              {/* Indefinite Message */}
              {formData.durationType === 'indefinite' && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 text-base">הלובי יישאר פתוח ללא הגבלת זמן עד לסגירה ידנית</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Session Configuration */}
          <div className="space-y-6">
            <Label className="text-lg font-semibold flex items-center gap-3">
              <BookOpen className="w-5 h-5" />
              חדרי משחק
            </Label>

            {/* Session Distribution Preview */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-green-800 text-lg text-center">תצוגה מקדימה של חלוקת החדרים</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-6 text-center mb-6">
                  <div>
                    <div className="text-3xl font-bold text-green-800 mb-2">{sessionDistribution.recommendedSessions}</div>
                    <div className="text-base text-green-600 font-medium">חדרי משחק</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-800 mb-2">{sessionDistribution.actualPlayersPerSession}</div>
                    <div className="text-base text-green-600 font-medium">שחקנים בחדר</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-800 mb-2">{sessionDistribution.totalCapacity}</div>
                    <div className="text-base text-green-600 font-medium">קיבולת כוללת</div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        <DialogFooter className="flex gap-4 pt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="px-8 py-3 text-lg">
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 px-8 py-3 text-lg"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                {isEditMode ? "שומר שינויים..." : "יוצר לובי..."}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-3" />
                {isEditMode ? "שמור שינויים" : "צור לובי"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}