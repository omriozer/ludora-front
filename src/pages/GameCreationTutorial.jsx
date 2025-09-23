import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTutorial } from '@/contexts/TutorialContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Settings,
  FileText,
  Gamepad2,
  Users,
  Eye,
  Lightbulb,
  Target,
  Layers,
  Image,
  Type,
  HelpCircle
} from 'lucide-react';

export default function GameCreationTutorial() {
  const navigate = useNavigate();
  const { startTutorial } = useTutorial();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const handleStartInteractiveTutorial = () => {
    startTutorial('game-creation');
  };

  const tutorialSteps = [
    {
      id: 'intro',
      title: 'מבוא - איך יוצרים משחק?',
      icon: <BookOpen className="w-6 h-6" />,
      content: {
        overview: 'במדריך זה נלמד יחד איך ליצור משחק חדש מאפס עד סוף. נעבור על כל השלבים הנדרשים לבניית משחק מושלם.',
        goals: [
          'הבנת התהליך השלם של יצירת משחק',
          'למידת כיצד ליצור תוכן איכותי למשחק',
          'הגדרת כללים ולוגיקה למשחק',
          'פרסום המשחק לתלמידים'
        ],
        tips: [
          'הכינו רשימה של נושאים שאתם רוצים ללמד',
          'חשבו על הגיל והרמה של התלמידים',
          'התחילו עם משחק פשוט ובנו עליו'
        ]
      }
    },
    {
      id: 'planning',
      title: 'תכנון המשחק',
      icon: <Target className="w-6 h-6" />,
      content: {
        overview: 'לפני שנתחיל ליצור, חשוב לתכנן את המשחק. איזה סוג משחק אנחנו רוצים? מה המטרה החינוכית?',
        actions: [
          {
            title: 'בחרו סוג משחק',
            description: 'התחילו בסוג משחק פשוט כמו "משחק זיכרון" או "חידון"',
            link: '/games/create',
            buttonText: 'עברו ליצירת משחק'
          }
        ],
        checklist: [
          'בחירת סוג המשחק (זיכרון, חידון, וכו\')',
          'הגדרת מטרה חינוכית ברורה',
          'קביעת רמת קושי מתאימה לתלמידים',
          'חישוב כמות התוכן הנדרש'
        ]
      }
    },
    {
      id: 'basic-setup',
      title: 'הגדרות בסיסיות',
      icon: <Settings className="w-6 h-6" />,
      content: {
        overview: 'עכשיו נגדיר את פרטי המשחק הבסיסיים: שם, תיאור, קטגוריה ועוד.',
        actions: [
          {
            title: 'מלאו פרטי משחק',
            description: 'שם המשחק צריך להיות ברור ומעורר עניין. התיאור יעזור לתלמידים להבין על מה המשחק.',
            example: 'דוגמה: "משחק זיכרון - בעלי חיים באפריקה"'
          }
        ],
        checklist: [
          'שם משחק ברור ומעניין',
          'תיאור קצר המסביר את המטרה',
          'בחירת קטגוריה מתאימה',
          'הגדרת רמת קושי',
          'קביעת זמן המשחק (אם רלוונטי)'
        ]
      }
    },
    {
      id: 'content-creation',
      title: 'יצירת תוכן למשחק',
      icon: <FileText className="w-6 h-6" />,
      content: {
        overview: 'זה השלב הכי חשוב! כאן נוסיף את התוכן שיופיע במשחק: מילים, תמונות, שאלות ותשובות.',
        actions: [
          {
            title: 'בדקו תוכן קיים',
            description: 'ראשית, בדקו אם יש כבר תוכן במערכת שמתאים למשחק שלכם',
            link: '/game-content',
            buttonText: 'עברו לניהול תוכן'
          },
          {
            title: 'צרו תוכן חדש',
            description: 'אם אין תוכן מתאים, תוכלו ליצור תוכן חדש במיוחד למשחק שלכם',
            example: 'דוגמה: רשימת בעלי חיים + תמונות + עובדות מעניינות'
          }
        ],
        types: [
          {
            name: 'מילים וטקסטים',
            icon: <Type className="w-5 h-5" />,
            description: 'מילים, ביטויים, שאלות ותשובות'
          },
          {
            name: 'תמונות',
            icon: <Image className="w-5 h-5" />,
            description: 'תמונות, איורים ודיאגרמות'
          },
          {
            name: 'קטגוריות',
            icon: <Layers className="w-5 h-5" />,
            description: 'חלוקה לנושאים ורמות קושי'
          }
        ]
      }
    },
    {
      id: 'content-rules',
      title: 'הגדרת כללי תוכן וחיבור תוכן',
      icon: <Settings className="w-6 h-6" />,
      content: {
        overview: 'כאן נגדיר איך המשחק יבחר ויציג את התוכן, ונחבר תוכן אמיתי למשחק. זה השלב הכי חשוב ביצירת משחק מעניין.',
        actions: [
          {
            title: 'צרו כלל תוכן',
            description: 'התחילו ביצירת כלל שיקבע איך המשחק יבחר תוכן',
            example: 'דוגמה: כלל שבוחר מילים באנגלית לרמה בינונית'
          },
          {
            title: 'בחרו סוג חיבור',
            description: 'החליטו איך תרצו לחבר תוכן: בחירה ידנית, סינון אוטומטי, או רשימות קיימות',
            tips: [
              'בחירה ידנית - שליטה מלאה על התוכן',
              'לפי תכונות - סינון אוטומטי לפי קטגוריה ורמה',
              'רשימות תוכן - שימוש ברשימות מוכנות'
            ]
          },
          {
            title: 'הוסיפו תוכן למשחק',
            description: 'בחרו או צרו את התוכן שיופיע במשחק: מילים, תמונות, שאלות',
            warning: 'ודאו שיש לכם מספיק תוכן למשחק מעניין (לפחות 10-20 פריטים)'
          }
        ],
        types: [
          {
            name: 'בחירה ידנית',
            icon: <Target className="w-5 h-5" />,
            description: 'בחירה מדויקת של כל פריט תוכן'
          },
          {
            name: 'סינון אוטומטי',
            icon: <Settings className="w-5 h-5" />,
            description: 'סינון לפי תכונות כמו קטגוריה ורמת קושי'
          },
          {
            name: 'רשימות תוכן',
            icon: <Layers className="w-5 h-5" />,
            description: 'שימוש ברשימות תוכן מוכנות'
          }
        ],
        checklist: [
          'יצירת כלל תוכן עם שם ברור',
          'בחירת סוג חיבור מתאים',
          'הוספת תוכן מספיק למשחק',
          'בדיקה שהתוכן מתאים לגיל היעד',
          'ווידוא שהתוכן מעניין ורלוונטי'
        ]
      }
    },
    {
      id: 'game-logic',
      title: 'הגדרת לוגיקת המשחק',
      icon: <Gamepad2 className="w-6 h-6" />,
      content: {
        overview: 'כאן נקבע איך המשחק עובד: כמה ניסיונות יש לשחקן, מה קורה בטעות, איך מחשבים נקודות.',
        settings: [
          {
            name: 'מספר שאלות/פריטים',
            description: 'כמה פריטים יופיעו במשחק',
            default: '10-20 פריטים למשחק טוב'
          },
          {
            name: 'זמן למשחק',
            description: 'האם יש הגבלת זמן כללית',
            default: 'בדרך כלל 5-15 דקות'
          },
          {
            name: 'זמן לשאלה',
            description: 'כמה זמן לחשוב על כל שאלה',
            default: '30-60 שניות לשאלה'
          },
          {
            name: 'מערכת נקודות',
            description: 'איך מחשבים את הציון הסופי',
            default: 'נקודות לתשובה נכונה, ניכוי לטעויות'
          }
        ]
      }
    },
    {
      id: 'preview-test',
      title: 'תצוגה מקדימה ובדיקה',
      icon: <Eye className="w-6 h-6" />,
      content: {
        overview: 'לפני שמפרסמים את המשחק, חשוב לבדוק שהכל עובד כמו שצריך.',
        actions: [
          {
            title: 'נסו לשחק',
            description: 'שחקו את המשחק בעצמכם מכמה זוויות שונות',
            tips: [
              'נסו לענות נכון ולא נכון',
              'בדקו שהתמונות נטענות',
              'ודאו שההוראות ברורות'
            ]
          }
        ],
        checklist: [
          'המשחק נטען ללא שגיאות',
          'התוכן מוצג בצורה ברורה',
          'הכללים עובדים כמו שצריך',
          'מערכת הנקודות מדויקת',
          'המשחק מעניין ומאתגר'
        ]
      }
    },
    {
      id: 'publish-share',
      title: 'פרסום ושיתוף',
      icon: <Users className="w-6 h-6" />,
      content: {
        overview: 'המשחק מוכן! עכשיו נפרסם אותו ונשתף עם התלמידים.',
        actions: [
          {
            title: 'פרסמו את המשחק',
            description: 'סמנו את המשחק כ"מפורסם" כדי שתלמידים יוכלו לגשת אליו',
            warning: 'ודאו שבדקתם את המשחק לפני הפרסום!'
          },
          {
            title: 'שתפו עם תלמידים',
            description: 'תוכלו לשתף קישור ישיר או להוסיף לכיתה',
            link: '/classrooms',
            buttonText: 'נהלו כיתות'
          }
        ],
        options: [
          'שיתוף קישור ישיר למשחק',
          'הוספה לכיתה קיימת',
          'יצירת כיתה חדשה למשחק',
          'שליחה באימייל לתלמידים'
        ]
      }
    }
  ];

  const handleStepComplete = (stepIndex) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetTutorial = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  };

  const currentStepData = tutorialSteps[currentStep];
  const progressPercentage = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" dir="rtl">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/help')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            חזור למרכז העזרה
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">יצירת משחק מאפס עד סוף</h1>
            <p className="text-muted-foreground">
              מדריך מקיף לבניית משחק חינוכי מושלם
            </p>
          </div>
          <Button
            variant="outline"
            onClick={resetTutorial}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            אתחל מדריך
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">התקדמות במדריך</span>
            <span className="text-sm text-muted-foreground">
              שלב {currentStep + 1} מתוך {tutorialSteps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Interactive Tutorial CTA */}
        {currentStep === 0 && (
          <div className="mb-8">
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <Play className="w-12 h-12 mx-auto text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">מוכנים להתחיל?</h3>
                <p className="text-gray-600 mb-4">
                  במקום לקרוא על התהליך, בואו ניצור משחק יחד! המדריך האינטראקטיווי ילווה אתכם צעד אחר צעד במהלך יצירת המשחק.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleStartInteractiveTutorial}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    size="lg"
                  >
                    <Play className="w-5 h-5" />
                    התחל מדריך אינטראקטיווי
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    המשך לקרוא
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Steps Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tutorialSteps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${
                index === currentStep
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : completedSteps.has(index)
                  ? 'bg-green-100 border-green-300 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {completedSteps.has(index) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{index + 1}</span>
            </button>
          ))}
        </div>

        {/* Current Step Content */}
        <Card className="mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                {currentStepData.icon}
              </div>
              <div>
                <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                <p className="text-blue-100">
                  שלב {currentStep + 1} מתוך {tutorialSteps.length}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Overview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">סקירה כללית</h3>
              <p className="text-gray-600 leading-relaxed">{currentStepData.content.overview}</p>
            </div>

            {/* Goals (for intro step) */}
            {currentStepData.content.goals && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">מטרות המדריך</h3>
                <ul className="space-y-2">
                  {currentStepData.content.goals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            {currentStepData.content.actions && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">פעולות לביצוע</h3>
                <div className="space-y-4">
                  {currentStepData.content.actions.map((action, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">{action.title}</h4>
                      <p className="text-blue-700 mb-3">{action.description}</p>
                      {action.example && (
                        <div className="bg-white p-3 rounded border-r-4 border-blue-400 mb-3">
                          <p className="text-sm text-gray-600">{action.example}</p>
                        </div>
                      )}
                      {action.tips && (
                        <ul className="text-sm text-blue-600 space-y-1 mb-3">
                          {action.tips.map((tip, tipIndex) => (
                            <li key={tipIndex} className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                      {action.link && (
                        <Link to={action.link}>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            {action.buttonText}
                          </Button>
                        </Link>
                      )}
                      {action.warning && (
                        <Alert className="mt-3">
                          <HelpCircle className="w-4 h-4" />
                          <AlertDescription>{action.warning}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Types */}
            {currentStepData.content.types && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">סוגי תוכן</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentStepData.content.types.map((type, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                          {type.icon}
                        </div>
                        <h4 className="font-semibold">{type.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings/Options */}
            {currentStepData.content.settings && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">הגדרות חשובות</h3>
                <div className="space-y-3">
                  {currentStepData.content.settings.map((setting, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-1">{setting.name}</h4>
                      <p className="text-gray-600 text-sm mb-2">{setting.description}</p>
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        המלצה: {setting.default}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            {currentStepData.content.options && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">אפשרויות</h3>
                <ul className="space-y-2">
                  {currentStepData.content.options.map((option, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{option}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Checklist */}
            {currentStepData.content.checklist && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">רשימת בדיקה</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <ul className="space-y-2">
                    {currentStepData.content.checklist.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Circle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tips (for intro step) */}
            {currentStepData.content.tips && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">טיפים לפני שמתחילים</h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <ul className="space-y-2">
                    {currentStepData.content.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step Completion */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                onClick={() => handleStepComplete(currentStep)}
                variant={completedSteps.has(currentStep) ? 'default' : 'outline'}
                className="flex items-center gap-2"
              >
                {completedSteps.has(currentStep) ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                {completedSteps.has(currentStep) ? 'שלב הושלם' : 'סמן כהושלם'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            שלב קודם
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {completedSteps.size} מתוך {tutorialSteps.length} שלבים הושלמו
            </p>
          </div>

          <Button
            onClick={nextStep}
            disabled={currentStep === tutorialSteps.length - 1}
            className="flex items-center gap-2"
          >
            שלב הבא
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}