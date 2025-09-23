import React, { useState, useEffect, useRef } from "react";
import { User, Purchase, Settings, SiteText, Category, Workshop, Course, File, Tool } from "@/services/entities";
import { InvokeLLM } from "@/services/integrations";
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquare,
  Send,
  Trash2,
  Plus,
  AlertCircle,
  Bot,
  User as UserIcon,
  Loader2,
  Sparkles,
  Database
} from "lucide-react";

export default function AiChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState(null);
  
  // System context for AI
  const [systemContext, setSystemContext] = useState("");
  
  // Chat state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversations, activeConversationId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      if (user.role === 'admin') {
        // Load system context
        await loadSystemContext();
        
        // Load conversations from localStorage
        const savedConversations = localStorage.getItem('ai_conversations');
        if (savedConversations) {
          const parsedConversations = JSON.parse(savedConversations);
          setConversations(parsedConversations);
          if (parsedConversations.length > 0) {
            setActiveConversationId(parsedConversations[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  };

  const loadSystemContext = async () => {
    try {
      const [
        workshops,
        courses,
        files,
        tools,
        purchases,
        users,
        settings,
        categories
      ] = await Promise.all([
        Workshop.find({}, '-created_date'),
        Course.find({}, '-created_date'),
        File.find({}, '-created_date'),
        Tool.find({}, '-created_date'),
        Purchase.find(),
        User.find(),
        Settings.find(),
        Category.find({})
      ]);

      const allEntities = [...workshops, ...courses, ...files, ...tools];
      const publishedEntities = allEntities.filter(e => e.is_published !== false);
      const totalRevenue = purchases.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (p.payment_amount || 0), 0);
      const totalUsers = users.length;
      const totalPurchases = purchases.length;

      const context = `
מידע על המערכת לודורה:

מטרת המערכת:
- פלטפורמה חינוכית דיגיטלית ל${getProductTypeName('workshop', 'plural')}, ${getProductTypeName('course', 'plural')} ו${getProductTypeName('file', 'plural')} חינוכיים
- מתמקדת בחינוך המאה ה-21 ו${getProductTypeName('tool', 'plural')} דיגיטליים מתקדמים
- מספקת פתרונות למורים ולמורות להתקדמות מקצועית

סטטיסטיקות כלליות:
- סה"כ משתמשים רשומים: ${totalUsers}
- סה"כ מוצרים פעילים: ${publishedEntities.length}
- סה"כ רכישות: ${totalPurchases}
- סה"כ הכנסות: ₪${totalRevenue.toLocaleString()}

סוגי מוצרים במערכת:
1. ${getProductTypeName('workshop', 'plural')} (Workshops) - ${workshops.filter(w => w.is_published !== false).length} פעילות
   - ${getProductTypeName('workshop', 'plural')} אונליין בזמן אמת
   - הקלטות של ${getProductTypeName('workshop', 'plural')}
   - שילוב של שניהם
2. ${getProductTypeName('course', 'plural')} (Courses) - ${courses.filter(c => c.is_published !== false).length} פעילים
   - ${getProductTypeName('course', 'plural')} מודולריים עם מספר שיעורים
3. ${getProductTypeName('file', 'plural')} (Files) - ${files.filter(f => f.is_published !== false).length} פעילים
   - תבניות, מצגות וחומרי עזר להורדה
4. ${getProductTypeName('tool', 'plural')} (Tools) - ${tools.filter(t => t.is_published !== false).length} פעילים
   - ${getProductTypeName('tool', 'plural')} דיגיטליים ויישומונים

קטגוריות זמינות:
${categories.map(c => `- ${c.name}`).join('\n')}

מוצרים פופולריים:
${publishedEntities.slice(0, 5).map(e => `- ${e.title} (${e.category || 'ללא קטגוריה'}) - ₪${e.price || 0}`).join('\n')}

פונקציונליות המערכת:
- מערכת תשלומים מתקדמת עם PayPlus
- ניהול משתמשים ומנהלים
- מערכת קופונים והנחות
- אוטומציית מיילים
- ניהול גישה מותנה זמן
- מערכת התראות
- דוחות ואנליטיקה
- ניהול תוכן דינמי
- תמיכה בעברית מלאה

הגדרות מערכת נוכחיות:
${settings.length > 0 ? `
- גישה ל${getProductTypeName('workshop', 'plural')}: ${settings[0].nav_workshops_visibility || 'public'}
- גישה ל${getProductTypeName('course', 'plural')}: ${settings[0].nav_courses_visibility || 'public'}
- גישה ל${getProductTypeName('file', 'plural')}: ${settings[0].nav_files_visibility || 'public'}
- מצב תחזוקה: ${settings[0].maintenance_mode ? 'פעיל' : 'כבוי'}
` : 'אין הגדרות מיוחדות'}

זהו המידע העדכני על המערכת. אתה יכול לעזור with שאלות על ניהול המערכת, אנליזה של נתונים, הצעות לשיפור, ועוד.
      `;

      setSystemContext(context);
    } catch (error) {
      console.error("Error loading system context:", error);
    }
  };

  const saveConversations = (updatedConversations) => {
    localStorage.setItem('ai_conversations', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: `שיחה חדשה ${conversations.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    const updatedConversations = [newConversation, ...conversations];
    saveConversations(updatedConversations);
    setActiveConversationId(newConversation.id);
  };

  const deleteConversation = (conversationId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את השיחה? פעולה זו אינה ניתנת לביטול.')) {
      return;
    }

    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    saveConversations(updatedConversations);
    
    if (activeConversationId === conversationId) {
      setActiveConversationId(updatedConversations.length > 0 ? updatedConversations[0].id : null);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isSending || !activeConversationId) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    // Add user message to conversation
    const updatedConversations = conversations.map(conv => {
      if (conv.id === activeConversationId) {
        const updatedMessages = [...conv.messages, userMessage];
        
        // Update conversation title if it's the first message
        let updatedTitle = conv.title;
        if (conv.messages.length === 0) {
          updatedTitle = currentMessage.length > 30 
            ? currentMessage.substring(0, 30) + "..."
            : currentMessage;
        }
        
        return { ...conv, messages: updatedMessages, title: updatedTitle };
      }
      return conv;
    });
    
    saveConversations(updatedConversations);
    setCurrentMessage("");
    setIsSending(true);

    try {
      // Get conversation context (last 6 messages for better context)
      const activeConv = updatedConversations.find(conv => conv.id === activeConversationId);
      const recentMessages = activeConv.messages.slice(-6);
      
      const conversationContext = recentMessages.length > 1 
        ? `הקשר השיחה:\n${recentMessages.slice(0, -1).map(msg => 
            `${msg.type === 'user' ? 'משתמש' : 'AI'}: ${msg.content}`
          ).join('\n')}\n\n`
        : '';

      const fullPrompt = `${systemContext}

${conversationContext}שאלה נוכחית: ${userMessage.content}

אתה עוזר AI מתקדם למנהל המערכת החינוכית לודורה. 
השתמש במידע על המערכת שסופק לך כדי לתת תשובות מדויקות ומועילות.
ענה בעברית באופן ברור, מקצועי ומועיל.
אם נשאלת על נתונים ספציפיים, השתמש במידע העדכני שיש לך על המערכת.`;

      const aiResponse = await InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      // Add AI response to conversation
      const finalConversations = conversations.map(conv => {
        if (conv.id === activeConversationId) {
          return { ...conv, messages: [...conv.messages, userMessage, aiMessage] };
        }
        return conv;
      });
      
      saveConversations(finalConversations);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessage({ type: 'error', text: 'שגיאה בשליחת ההודעה. אנא נסה שוב.' });
      setTimeout(() => setMessage(null), 3000);
    }

    setIsSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConversation = conversations.find(conv => conv.id === activeConversationId);

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען צ'אט AI...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לצ'אט AI. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8" />
                <h1 className="text-2xl md:text-3xl font-bold">שיחה עם AI</h1>
                <Database className="w-6 h-6" />
              </div>
              <p className="text-purple-100">עוזר AI חכם עם גישה מלאה למידע המערכת</p>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-220px)] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">השיחות שלי</CardTitle>
                  <Button onClick={createNewConversation} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="p-4 space-y-2 h-full overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm">אין שיחות עדיין</p>
                      <p className="text-xs">צור שיחה חדשה כדי להתחיל</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg cursor-pointer border transition-all ${
                          activeConversationId === conversation.id
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setActiveConversationId(conversation.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {conversation.messages.length} הודעות
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conversation.id);
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-220px)] flex flex-col border-none shadow-lg">
              {activeConversation ? (
                <>
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      {activeConversation.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {activeConversation.messages.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-600 mb-2">התחל שיחה</h3>
                          <p>שאל אותי כל שאלה על המערכת והאי יעזור לך</p>
                          <div className="mt-4 text-sm text-gray-400">
                            <p>יש לי גישה למידע על:</p>
                            <p>• המוצרים והקטגוריות</p>
                            <p>• הרכישות וההכנסות</p>
                            <p>• המשתמשים וההרשמות</p>
                            <p>• הגדרות המערכת</p>
                          </div>
                        </div>
                      ) : (
                        activeConversation.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-3 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                msg.type === 'user' ? 'bg-blue-100' : 'bg-purple-100'
                              }`}>
                                {msg.type === 'user' ? (
                                  <UserIcon className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Bot className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                              <div className={`rounded-2xl px-4 py-3 ${
                                msg.type === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}>
                                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      
                      {isSending && (
                        <div className="flex gap-3 justify-start">
                          <div className="flex gap-3 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-100">
                              <Bot className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">חושב...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="border-t p-4 bg-white">
                      <div className="flex gap-3">
                        <Input
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="הקלד הודעה..."
                          className="flex-1 text-sm"
                          disabled={isSending}
                        />
                        <Button 
                          onClick={sendMessage}
                          disabled={!currentMessage.trim() || isSending}
                          className="bg-blue-600 hover:bg-blue-700 px-4"
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">בחר שיחה</h3>
                    <p>בחר שיחה קיימת או צור שיחה חדשה כדי להתחיל</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
