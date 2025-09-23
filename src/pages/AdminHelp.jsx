import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Play,
  BookOpen,
  Users,
  Settings,
  Layers,
  Gamepad2,
  FileText,
  HelpCircle,
  Clock,
  CheckCircle,
  Star,
  ExternalLink
} from 'lucide-react';

export default function AdminHelp() {
  const navigate = useNavigate();

  const helpTopics = [
    {
      id: 'game-creation-az',
      title: 'יצירת משחק מאפס עד סוף',
      description: 'מדריך מקיף המלמד איך ליצור משחק חדש בצעדים פשוטים, כולל יצירת תוכן, הגדרת כללים ופרסום',
      icon: <Gamepad2 className="w-6 h-6" />,
      estimatedTime: '15-20 דקות',
      difficulty: 'מתחיל',
      sections: 8,
      url: '/admin/help/game-creation-tutorial',
      color: 'from-blue-500 to-purple-600',
      featured: true
    },
    {
      id: 'content-management',
      title: 'ניהול תוכן מתקדם',
      description: 'איך ליצור ולנהל תוכן למשחקים: מילים, תמונות, שאלות ותבניות',
      icon: <FileText className="w-6 h-6" />,
      estimatedTime: '10-15 דקות',
      difficulty: 'בינוני',
      sections: 5,
      url: '/admin/help/content-management',
      color: 'from-green-500 to-teal-600',
      comingSoon: true
    },
    {
      id: 'user-management',
      title: 'ניהול משתמשים והרשאות',
      description: 'הגדרת הרשאות, ניהול רישוי וחיקוי משתמשים',
      icon: <Users className="w-6 h-6" />,
      estimatedTime: '8-12 דקות',
      difficulty: 'מתקדם',
      sections: 4,
      url: '/admin/help/user-management',
      color: 'from-orange-500 to-red-600',
      comingSoon: true
    },
    {
      id: 'system-settings',
      title: 'הגדרות מערכת כלליות',
      description: 'תצורת המערכת, הגדרות מותג ואפשרויות מתקדמות',
      icon: <Settings className="w-6 h-6" />,
      estimatedTime: '12-18 דקות',
      difficulty: 'מתקדם',
      sections: 6,
      url: '/admin/help/system-settings',
      color: 'from-purple-500 to-pink-600',
      comingSoon: true
    },
    {
      id: 'documentation',
      title: 'תיעוד טכני מפורט',
      description: 'תיעוד מלא של המערכת למפתחים ומנהלי מערכת מתקדמים',
      icon: <BookOpen className="w-6 h-6" />,
      estimatedTime: 'עיון עצמאי',
      difficulty: 'מתקדם',
      sections: '15+ עמודים',
      url: '/documentation',
      color: 'from-indigo-500 to-blue-600',
      isExternal: true,
      featured: false
    }
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'מתחיל': return 'bg-green-100 text-green-700';
      case 'בינוני': return 'bg-yellow-100 text-yellow-700';
      case 'מתקדם': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          חזור
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">מרכז עזרה למנהלים</h1>
          <p className="text-muted-foreground">
            מדריכים ועזרה לניהול יעיל של המערכת
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{helpTopics.length}</div>
            <div className="text-sm text-muted-foreground">נושאי עזרה</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">
              {helpTopics.filter(t => !t.comingSoon).length}
            </div>
            <div className="text-sm text-muted-foreground">מדריכים זמינים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">
              {helpTopics.reduce((total, topic) => {
                const time = topic.estimatedTime.match(/(\d+)-(\d+)/);
                return total + (time ? parseInt(time[2]) : 0);
              }, 0)}
            </div>
            <div className="text-sm text-muted-foreground">דקות סה"כ</div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Tutorial */}
      {helpTopics.filter(topic => topic.featured).map(topic => (
        <Card key={topic.id} className="mb-8 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${topic.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                {topic.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold">{topic.title}</h2>
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    <Star className="w-3 h-3 mr-1" />
                    מומלץ
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">{topic.description}</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {topic.estimatedTime}
                  </div>
                  <Badge className={getDifficultyColor(topic.difficulty)}>
                    {topic.difficulty}
                  </Badge>
                  <div className="text-sm text-gray-600">
                    {topic.sections} {typeof topic.sections === 'string' ? '' : 'שלבים'}
                  </div>
                </div>
                <Link to={topic.url}>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {topic.isExternal ? (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        צפה בתיעוד
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        התחל מדריך
                      </>
                    )}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* All Topics Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">כל נושאי העזרה</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {helpTopics.map(topic => (
            <Card key={topic.id} className="group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${topic.color} rounded-lg flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    {topic.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{topic.title}</CardTitle>
                      {topic.comingSoon && (
                        <Badge variant="outline" className="text-xs">
                          בקרוב
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{topic.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {topic.estimatedTime}
                  </div>
                  <Badge className={getDifficultyColor(topic.difficulty)}>
                    {topic.difficulty}
                  </Badge>
                  <div className="text-sm text-gray-600">
                    {topic.sections} {typeof topic.sections === 'string' ? '' : 'שלבים'}
                  </div>
                </div>
                {topic.comingSoon ? (
                  <Button disabled className="w-full">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    בקרוב
                  </Button>
                ) : topic.isExternal ? (
                  <Link to={topic.url} className="block">
                    <Button className="w-full group-hover:bg-primary/90 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      צפה בתיעוד
                    </Button>
                  </Link>
                ) : (
                  <Link to={topic.url} className="block">
                    <Button className="w-full group-hover:bg-primary/90">
                      <Play className="w-4 h-4 mr-2" />
                      התחל מדריך
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer Help */}
      <Card className="mt-8 bg-gray-50">
        <CardContent className="p-6 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold mb-2">זקוק לעזרה נוספת?</h3>
          <p className="text-muted-foreground mb-4">
            אם אתה נתקל בבעיות או יש לך שאלות שלא מכוסות במדריכים
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/support">
              <Button variant="outline">
                צור קשר עם התמיכה
              </Button>
            </Link>
            <Link to="/chat">
              <Button variant="outline">
                שאל את הצ'אט AI
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}