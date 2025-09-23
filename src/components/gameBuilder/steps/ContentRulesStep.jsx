import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Layers,
  Languages,
  Globe,
  HelpCircle,
  Image,
  List,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import ContentStageConnector from '@/components/shared/ContentRuleConnector';
import { GAME_TYPES, getGameTypeConfig } from '@/config/gameTypes';

// Game type specific stage templates
const STAGE_TEMPLATES = {
  scatter_game: {
    name: 'שלב מילים לתפזורת',
    description: 'מילים שיופיעו במשחק התפזורת',
    stage_type: 'content_filter',
    priority: 1,
    contentTypes: ['Word', 'WordEN']
  },
  wisdom_maze: {
    name: 'שלב שאלות למבוך',
    description: 'שאלות ותשובות למבוך החוכמה',
    stage_type: 'content_filter',
    priority: 1,
    contentTypes: ['QA', 'Word']
  },
  sharp_and_smooth: {
    name: 'שלב תוכן לחד וחלק',
    description: 'מילים ושאלות למשחק חד וחלק',
    stage_type: 'content_filter',
    priority: 1,
    contentTypes: ['Word', 'WordEN', 'QA']
  },
  memory_game: {
    name: 'שלב תמונות לזיכרון',
    description: 'תמונות ותוכן למשחק זיכרון',
    stage_type: 'content_filter',
    priority: 1,
    contentTypes: ['Image', 'Word']
  },
  ar_up_there: {
    name: 'שלב תוכן AR',
    description: 'תמונות ותוכן למשחק AR',
    stage_type: 'content_filter',
    priority: 1,
    contentTypes: ['Image', 'Word', 'QA']
  }
};

// Content type info for display
const CONTENT_TYPE_INFO = {
  Word: { name: 'מילים בעברית', icon: Languages, color: 'blue' },
  WordEN: { name: 'מילים באנגלית', icon: Globe, color: 'green' },
  QA: { name: 'שאלות ותשובות', icon: HelpCircle, color: 'purple' },
  Image: { name: 'תמונות', icon: Image, color: 'orange' },
  ContentList: { name: 'רשימות תוכן', icon: List, color: 'indigo' }
};

function StageEditor({ stage, onSave, onCancel, gameType }) {
  const [editedStage, setEditedStage] = useState({
    name: stage?.name || '',
    description: stage?.description || '',
    stage_type: stage?.stage_type || 'content_filter',
    priority: stage?.priority || 1,
    is_active: stage?.is_active !== undefined ? stage.is_active : true,
    contentConnection: stage?.contentConnection || null,
    ...stage
  });

  const handleSave = () => {
    if (!editedStage.name.trim()) {
      alert('שם השלב הוא שדה חובה');
      return;
    }

    onSave({
      ...editedStage,
      id: stage?.id || Date.now().toString()
    });
  };

  const handleContentConnectionChange = (connection) => {
    setEditedStage(prev => ({
      ...prev,
      contentConnection: connection
    }));
  };

  const getAvailableContentTypes = () => {
    const gameConfig = getGameTypeConfig(gameType);
    return gameConfig?.allowedContentTypes || ['Word', 'WordEN', 'QA', 'Image'];
  };

  return (
    <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-blue-50 rounded-3xl overflow-hidden animate-in slide-in-from-top duration-500">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-1"></div>
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">{stage ? '✏️' : '➕'}</span>
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {stage ? 'עריכת שלב תוכן' : 'יצירת שלב תוכן חדש'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Basic Rule Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="stage-name">שם השלב *</Label>
            <Input
              id="stage-name"
              value={editedStage.name}
              onChange={(e) => setEditedStage(prev => ({ ...prev, name: e.target.value }))}
              placeholder="הכנס שם לשלב..."
            />
          </div>

          <div>
            <Label htmlFor="stage-priority">עדיפות</Label>
            <Select
              value={editedStage.priority.toString()}
              onValueChange={(value) => setEditedStage(prev => ({ ...prev, priority: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - גבוהה ביותר</SelectItem>
                <SelectItem value="2">2 - גבוהה</SelectItem>
                <SelectItem value="3">3 - בינונית</SelectItem>
                <SelectItem value="4">4 - נמוכה</SelectItem>
                <SelectItem value="5">5 - נמוכה ביותר</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="stage-description">תיאור השלב</Label>
          <Textarea
            id="stage-description"
            value={editedStage.description}
            onChange={(e) => setEditedStage(prev => ({ ...prev, description: e.target.value }))}
            placeholder="תאר את מטרת השלב והתוכן שהוא אמור לכלול..."
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="stage-active"
            checked={editedStage.is_active}
            onCheckedChange={(checked) => setEditedStage(prev => ({ ...prev, is_active: checked }))}
          />
          <Label htmlFor="stage-active">שלב פעיל</Label>
        </div>

        {/* Content Connection Section */}
        <div className="border-t pt-6">
            <ContentStageConnector
              stage={editedStage}
              onStageContentChange={handleContentConnectionChange}
              availableContentTypes={getAvailableContentTypes()}
              gameType={gameType}
            />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button onClick={handleSave}>
            {stage ? 'עדכן שלב' : 'צור שלב'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StageCard({ stage, onEdit, onDelete, onToggleActive }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getContentTypeBadges = () => {
    const connection = stage.contentConnection;
    if (!connection) return [];

    switch (connection.type) {
      case 'manual':
        const types = [...new Set(connection.content?.map(c => c.type) || [])];
        return types.map(type => ({
          type,
          count: connection.content?.filter(c => c.type === type).length || 0
        }));
      case 'attribute':
        return Object.keys(connection.attributes || {}).map(type => ({
          type,
          count: 'מסונן'
        }));
      case 'list':
        return connection.contentList ? [{
          type: 'ContentList',
          count: 1
        }] : [];
      default:
        return [];
    }
  };

  const contentTypeBadges = getContentTypeBadges();

  return (
    <Card className={`border-none shadow-xl rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl transform hover:scale-105 ${
      stage.is_active
        ? 'bg-gradient-to-br from-white to-green-50'
        : 'bg-gradient-to-br from-white to-gray-50'
    }`}>
      <div className={`h-1 ${
        stage.is_active
          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
          : 'bg-gradient-to-r from-gray-400 to-gray-500'
      }`}></div>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              stage.is_active
                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-gradient-to-r from-gray-400 to-gray-500'
            }`}>
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className={`text-xl ${
                stage.is_active ? 'text-green-800' : 'text-gray-600'
              }`}>
                {stage.name}
              </CardTitle>
              {stage.description && (
                <p className="text-sm text-gray-600 mt-1 max-w-md">
                  {stage.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`px-3 py-1 rounded-full shadow-sm ${
                stage.is_active
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200'
                  : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-gray-300'
              }`}
            >
              {stage.is_active ? (
                <CheckCircle className="w-4 h-4 mr-1" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-1" />
              )}
              {stage.is_active ? '✅ פעיל' : '⏸️ לא פעיל'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-xl hover:bg-blue-50 transition-colors duration-200"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-blue-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-blue-600" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Content Summary */}
          <div>
            <Label className="text-sm font-medium">תוכן מחובר:</Label>
            {contentTypeBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {contentTypeBadges.map(({ type, count }) => {
                  const typeInfo = CONTENT_TYPE_INFO[type];
                  const Icon = typeInfo?.icon || Settings;
                  return (
                    <Badge key={type} variant="outline" className="flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {typeInfo?.name || type}: {count}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">לא חובר תוכן</p>
            )}
          </div>

          {/* Rule Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">סוג שלב:</span>
              <span className="ml-2">{stage.stage_type}</span>
            </div>
            <div>
              <span className="font-medium">עדיפות:</span>
              <span className="ml-2">{stage.priority}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(stage.id)}
            >
              {stage.is_active ? 'השבת' : 'הפעל'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(stage)}
              >
                <Edit className="w-4 h-4 mr-1" />
                ערוך
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(stage.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ContentStagesStep({ data, onDataChange }) {
  const [stages, setStages] = useState(data?.content_stages || []);
  const [editingStage, setEditingStage] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (data?.content_stages) {
      setStages(data.content_stages);
    }
  }, [data]);

  const updateStages = (newStages) => {
    setStages(newStages);
    onDataChange?.({ content_stages: newStages });
  };

  const handleAddStage = () => {
    const gameType = data?.game_type;
    const template = STAGE_TEMPLATES[gameType];

    const newStage = {
      id: Date.now().toString(),
      name: template?.name || 'שלב תוכן חדש',
      description: template?.description || '',
      stage_type: template?.stage_type || 'content_filter',
      priority: template?.priority || 1,
      is_active: true,
      contentConnection: null
    };

    setEditingStage(newStage);
    setShowEditor(true);
  };

  const handleEditStage = (stage) => {
    setEditingStage(stage);
    setShowEditor(true);
  };

  const handleSaveStage = (savedStage) => {
    const updatedStages = editingStage?.id && stages.find(s => s.id === editingStage.id)
      ? stages.map(stage => stage.id === savedStage.id ? savedStage : stage)
      : [...stages, savedStage];

    updateStages(updatedStages);
    setShowEditor(false);
    setEditingStage(null);
  };

  const handleDeleteStage = (stageId) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את השלב? פעולה זו לא ניתנת לביטול.')) {
      const updatedStages = stages.filter(stage => stage.id !== stageId);
      updateStages(updatedStages);
    }
  };

  const handleToggleActive = (stageId) => {
    const updatedStages = stages.map(stage =>
      stage.id === stageId ? { ...stage, is_active: !stage.is_active } : stage
    );
    updateStages(updatedStages);
  };

  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingStage(null);
  };

  // Calculate content summary
  const getContentSummary = () => {
    let totalContent = 0;
    const typeBreakdown = {};

    stages.forEach(stage => {
      if (stage.contentConnection?.content) {
        totalContent += stage.contentConnection.content.length;
        stage.contentConnection.content.forEach(content => {
          typeBreakdown[content.type] = (typeBreakdown[content.type] || 0) + 1;
        });
      }
    });

    return { totalContent, typeBreakdown };
  };

  const { totalContent, typeBreakdown } = getContentSummary();

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl mb-6 shadow-lg">
          <div className="text-4xl">🎯</div>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
          הגדרת שלבי תוכן
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          צור ותגדיר שלבים שיקבעו איך התוכן נבחר ומוצג במשחק שלך
        </p>

        {data?.game_type && (
          <div className="inline-flex items-center gap-3 mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <p className="text-blue-700 font-medium">
              יש ליצור לפחות שלב אחד עם תוכן כדי שהמשחק יהיה פעיל
            </p>
          </div>
        )}
      </div>

      {/* Content Summary */}
      {totalContent > 0 && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl overflow-hidden animate-in slide-in-from-left duration-500">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1"></div>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800">
                  ✅ סה"כ תוכן מחובר: {totalContent} פריטים
                </h3>
                <p className="text-green-600 text-sm">התוכן מוכן למשחק!</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(typeBreakdown).map(([type, count]) => {
                const typeInfo = CONTENT_TYPE_INFO[type];
                const Icon = typeInfo?.icon || Settings;
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className="bg-white border-2 border-green-200 text-green-700 px-3 py-1 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {typeInfo?.name || type}: <span className="font-bold ml-1">{count}</span>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Editor */}
      {showEditor && (
        <StageEditor
          stage={editingStage}
          gameType={data?.game_type}
          onSave={handleSaveStage}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Add Stage Button */}
      {!showEditor && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                🎯 שלבי תוכן ({stages.length})
              </h3>
              <p className="text-gray-600 mt-1">
                כל שלב מגדיר קבוצת תוכן שתשמש במשחק
              </p>
            </div>
            <Button
              onClick={handleAddStage}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-200 transition-all duration-200 transform hover:scale-105"
              data-tutorial="add-stage-button"
            >
              <Plus className="w-5 h-5" />
              הוסף שלב
            </Button>
          </div>
        </div>
      )}

      {/* Stages List */}
      {stages.length === 0 && !showEditor ? (
        <Card className="border-none shadow-xl bg-gradient-to-br from-white to-purple-50 rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 h-1"></div>
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Layers className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              🚀 בואו נתחיל!
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
              התחל בהוספת שלב תוכן כדי לקבוע איזה תוכן יופיע במשחק שלך
            </p>
            <Button
              onClick={handleAddStage}
              className="flex items-center gap-2 mx-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-purple-200 transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              הוסף שלב ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        !showEditor && (
          <div className="space-y-6">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="animate-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <StageCard
                  stage={stage}
                  onEdit={handleEditStage}
                  onDelete={handleDeleteStage}
                  onToggleActive={handleToggleActive}
                />
              </div>
            ))}
          </div>
        )
      )}

      {/* Help Section */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1"></div>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
                💡 איך שלבי התוכן עובדים?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-700">🎯 בחירה ידנית</p>
                      <p className="text-sm text-blue-600">בחר תכנים ספציפיים עבור השלב</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-700">🔍 לפי תכונות</p>
                      <p className="text-sm text-blue-600">המערכת תבחר תכנים לפי תכונות (קושי, נושא וכו')</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-700">📋 רשימות תוכן</p>
                      <p className="text-sm text-blue-600">השתמש ברשימות תוכן מוכנות</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm font-bold">4</span>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-700">⚡ עדיפות</p>
                      <p className="text-sm text-blue-600">שלבים עם עדיפות גבוהה יורצו קודם</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}