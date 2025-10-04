import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Eye,
  Clock,
  Target,
  Gamepad2,
  AlertCircle,
  CheckCircle,
  Info,
  Camera,
  Shuffle
} from 'lucide-react';

export default function LivePreview({
  rules = [],
  content = {},
  gameType,
  isModal = false,
  onClose
}) {
  const [activeRule, setActiveRule] = useState(0);
  const [simulationMode, setSimulationMode] = useState('demo');

  // Check content availability for rules
  const rulesWithStatus = useMemo(() => {
    return rules.map(rule => {
      const template = rule.template || { required_content_types: [] };
      const missing = template.required_content_types?.filter(type => {
        const typeContent = content[type] || [];
        return typeContent.length === 0;
      }) || [];

      return {
        ...rule,
        canDemo: missing.length === 0,
        missingContent: missing,
        status: missing.length === 0 ? 'ready' : 'missing_content'
      };
    });
  }, [rules, content]);

  const renderRulePreview = (rule) => {
    const template = rule.template;
    if (!template) return <div>תבנית לא נמצאה</div>;

    switch (template.config?.rule_type) {
      case 'opposite_word':
        return renderOppositeWordPreview(rule);
      case 'translation':
        return renderTranslationPreview(rule);
      case 'same_meaning':
        return renderSameMeaningPreview(rule);
      case 'image_word_match':
        return renderImageWordMatchPreview(rule);
      case 'multiple_choice':
        return renderMultipleChoicePreview(rule);
      case 'open_question':
        return renderOpenQuestionPreview(rule);
      case 'ar_object_detection':
        return renderARObjectDetectionPreview(rule);
      case 'ar_scavenger_hunt':
        return renderARScavengerHuntPreview(rule);
      default:
        return renderGenericPreview(rule);
    }
  };

  const renderOppositeWordPreview = (rule) => {
    const words = content.Word || [];
    const sampleWord = words[0];

    if (!sampleWord) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            נדרשות מילים כדי להציג תצוגה מקדימה
          </AlertDescription>
        </Alert>
      );
    }

    const options = words.slice(0, rule.config?.max_options || 4);

    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold mb-2">מצא את ההפך של:</div>
          <div className="text-4xl font-bold text-blue-600">{sampleWord.text}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-12 text-lg"
              disabled={simulationMode === 'demo'}
            >
              {option.text}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{rule.config?.difficulty_settings?.medium?.time_limit || 20}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <span>+{rule.config?.scoring?.correct || 10} נקודות</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTranslationPreview = (rule) => {
    const hebrewWords = content.Word || [];
    const englishWords = content.WordEN || [];
    const sampleWord = hebrewWords[0] || englishWords[0];

    if (!sampleWord) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            נדרשות מילים בעברית ובאנגלית כדי להציג תצוגה מקדימה
          </AlertDescription>
        </Alert>
      );
    }

    const isHebrew = hebrewWords.includes(sampleWord);
    const options = isHebrew ? englishWords.slice(0, 4) : hebrewWords.slice(0, 4);

    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold mb-2">
            תרגם ל{isHebrew ? 'אנגלית' : 'עברית'}:
          </div>
          <div className="text-4xl font-bold text-green-600">{sampleWord.text}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-12 text-lg"
              disabled={simulationMode === 'demo'}
            >
              {option.text}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{rule.config?.difficulty_settings?.medium?.time_limit || 25}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <span>+{rule.config?.scoring?.correct || 15} נקודות</span>
          </div>
        </div>
      </div>
    );
  };

  const renderImageWordMatchPreview = (rule) => {
    const images = content.Image || [];
    const words = content.Word || [];
    const sampleImage = images[0];

    if (!sampleImage) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            נדרשות תמונות ומילים כדי להציג תצוגה מקדימה
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold mb-4">מה מוצג בתמונה?</div>
          <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-500" />
          </div>
          <div className="text-sm text-gray-600 mt-2">{sampleImage.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {words.slice(0, 4).map((word, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-12 text-lg"
              disabled={simulationMode === 'demo'}
            >
              {word.text}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderMultipleChoicePreview = (rule) => {
    const questions = content.QA || [];
    const sampleQuestion = questions[0];

    if (!sampleQuestion) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            נדרשות שאלות ותשובות כדי להציג תצוגה מקדימה
          </AlertDescription>
        </Alert>
      );
    }

    const allAnswers = [
      ...(sampleQuestion.correct_answers || []),
      ...(sampleQuestion.incorrect_answers || [])
    ].slice(0, 4);

    return (
      <div className="space-y-4">
        <div className="p-6 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold mb-4 text-center">
            {sampleQuestion.question_text}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {allAnswers.map((answer, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-12 text-lg justify-start"
              disabled={simulationMode === 'demo'}
            >
              {String.fromCharCode(65 + index)}. {answer}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderOpenQuestionPreview = (rule) => {
    const questions = content.QA || [];
    const sampleQuestion = questions[0];

    if (!sampleQuestion) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            נדרשות שאלות ותשובות כדי להציג תצוגה מקדימה
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <div className="p-6 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold mb-4 text-center">
            {sampleQuestion.question_text}
          </div>
        </div>

        <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
          <div className="text-lg mb-2">הקלד את התשובה כאן...</div>
          <div className="text-sm">
            תשובה מקובלת: {sampleQuestion.correct_answers?.[0]}
          </div>
        </div>
      </div>
    );
  };

  const renderARObjectDetectionPreview = (rule) => {
    const words = content.Word || [];
    const images = content.Image || [];

    if (words.length === 0 && images.length === 0) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            נדרשות מילים או תמונות כדי להציג תצוגה מקדימה
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-cyan-50 rounded-lg">
          <div className="text-2xl font-bold mb-4">מצא בסביבה:</div>
          <div className="text-4xl font-bold text-cyan-600">
            {words[0]?.text || 'עצם'}
          </div>
        </div>

        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative">
          <Camera className="w-16 h-16 text-white" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/70 text-white p-2 rounded text-center">
              כוון את המצלמה על העצם המבוקש
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full">
            📷 צלם
          </Button>
        </div>
      </div>
    );
  };

  const renderARScavengerHuntPreview = (rule) => {
    const words = content.Word || [];

    if (words.length === 0) {
      return (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            נדרשות מילים כדי להציג תצוגה מקדימה
          </AlertDescription>
        </Alert>
      );
    }

    const huntItems = words.slice(0, 5);

    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-indigo-50 rounded-lg">
          <div className="text-2xl font-bold mb-2">ציד אוצרות AR</div>
          <div className="text-lg text-indigo-600">מצא את כל הפריטים ברשימה</div>
        </div>

        <div className="space-y-2">
          {huntItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                {index < 2 ? <CheckCircle className="w-4 h-4 text-green-500" /> : index + 1}
              </div>
              <span className={index < 2 ? 'line-through text-gray-500' : 'font-medium'}>
                {item.text}
              </span>
              {index < 2 && <Badge variant="success">✓</Badge>}
            </div>
          ))}
        </div>

        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative">
          <Camera className="w-16 h-16 text-white" />
          <div className="absolute top-4 left-4 right-4">
            <div className="bg-black/70 text-white p-2 rounded text-center">
              פריט הבא: {huntItems[2]?.text}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGenericPreview = (rule) => {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <div className="text-6xl mb-4">{rule.template?.emoji || '🎮'}</div>
        <div className="text-2xl font-bold mb-2">{rule.name}</div>
        <div className="text-gray-600 mb-4">{rule.description}</div>
        <Badge variant="outline">תצוגה מקדימה תהיה זמינה בקרוב</Badge>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Rules Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              כללי משחק
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rules.length}</div>
            <div className="text-sm text-gray-600">
              {rulesWithStatus.filter(r => r.canDemo).length} מוכנים לניסוי
            </div>
          </CardContent>
        </Card>

        {/* Content Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              תוכן
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Object.values(content).reduce((sum, items) => sum + items.length, 0)}
            </div>
            <div className="text-sm text-gray-600">
              {Object.keys(content).length} סוגי תוכן
            </div>
          </CardContent>
        </Card>

        {/* Game Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              סוג משחק
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{gameType}</div>
            <div className="text-sm text-gray-600">
              {rules.length > 0 ? 'משחק מותאם אישית' : 'משחק ריק'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Breakdown */}
      {Object.keys(content).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>פירוט תוכן</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(content).map(([type, items]) => (
                <div key={type} className="text-center">
                  <div className="text-2xl font-bold">{items.length}</div>
                  <div className="text-sm text-gray-600">{type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Status */}
      {rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>סטטוס כללים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rulesWithStatus.map((rule, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">{rule.template?.emoji}</div>
                    <span className="font-medium">{rule.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {rule.canDemo ? (
                      <Badge variant="success">מוכן</Badge>
                    ) : (
                      <Badge variant="warning">חסר תוכן</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveRule(index)}
                      disabled={!rule.canDemo}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const content_to_render = (
    <div className="space-y-6" dir="rtl">
      {rules.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            לא נבחרו כללי משחק עדיין. בחר כללים כדי לראות תצוגה מקדימה
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={activeRule.toString()} onValueChange={(value) => setActiveRule(parseInt(value))}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">תצוגה מקדימה</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSimulationMode(simulationMode === 'demo' ? 'interactive' : 'demo')}
              >
                {simulationMode === 'demo' ? 'מצב אינטראקטיבי' : 'מצב הדגמה'}
              </Button>
            </div>
          </div>

          <TabsList className="grid w-full grid-cols-1" style={{ gridTemplateColumns: `repeat(${Math.min(rules.length + 1, 6)}, 1fr)` }}>
            <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
            {rules.slice(0, 5).map((rule, index) => (
              <TabsTrigger key={index} value={index.toString()} disabled={!rulesWithStatus[index]?.canDemo}>
                {rule.template?.emoji} {rule.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {renderOverview()}
          </TabsContent>

          {rules.map((rule, index) => (
            <TabsContent key={index} value={index.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-3xl">{rule.template?.emoji}</span>
                    <div>
                      <div>{rule.name}</div>
                      <div className="text-sm font-normal text-gray-600">{rule.description}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rulesWithStatus[index]?.canDemo ? (
                    renderRulePreview(rule)
                  ) : (
                    <Alert variant="warning">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        חסר תוכן נדרש: {rulesWithStatus[index]?.missingContent.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );

  if (isModal) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Play className="w-6 h-6" />
              תצוגה מקדימה
            </DialogTitle>
          </DialogHeader>
          {content_to_render}
        </DialogContent>
      </Dialog>
    );
  }

  return content_to_render;
}