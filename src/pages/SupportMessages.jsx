import React, { useState, useEffect } from 'react';
import { SupportMessage } from '@/services/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Inbox, AlertCircle, Mail, Phone, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useUser } from '@/contexts/UserContext';
import { ludlog, luderror } from '@/lib/ludlog';

export default function SupportMessages() {
  const { currentUser, isLoading: userLoading } = useUser();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!userLoading && isAdmin) {
      loadMessages();
    } else if (!userLoading && !isAdmin) {
      setIsLoading(false);
    }
  }, [userLoading, isAdmin]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await SupportMessage.list('-created_date');
      setMessages(data);
    } catch (error) {
      luderror.validation("Failed to load messages:", error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את ההודעה? לא ניתן לשחזר פעולה זו.')) return;
    
    try {
      await SupportMessage.delete(id);
      setFeedback({ type: 'success', text: 'ההודעה נמחקה בהצלחה' });
      loadMessages();
    } catch (error) {
      setFeedback({ type: 'error', text: 'שגיאה במחיקת ההודעה' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  if (userLoading || isLoading) {
    return <div className="p-8">טוען הודעות...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>אין לך הרשאות גישה לדף זה.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">הודעות תמיכה</h1>
          <p className="text-gray-500">ניהול פניות שהתקבלו מטופס יצירת הקשר</p>
        </div>

        {feedback && (
          <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            <AlertDescription>{feedback.text}</AlertDescription>
          </Alert>
        )}

        {messages.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Inbox className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">אין הודעות חדשות</h3>
              <p className="text-gray-500">כאשר משתמשים ישלחו פניות, הן יופיעו כאן.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <Card key={msg.id} className="border-none shadow-lg">
                <CardHeader className="flex flex-row justify-between items-start bg-gray-50 p-4 rounded-t-lg">
                  <div>
                    <CardTitle className="text-lg">{msg.subject}</CardTitle>
                    <div className="text-sm text-gray-500 mt-1 space-y-1">
                      <p className="flex items-center gap-2"><strong>{msg.name}</strong></p>
                      <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {msg.email}</p>
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {msg.phone}</p>
                    </div>
                  </div>
                  <div className="text-left">
                     <Button variant="ghost" size="icon" onClick={() => handleDelete(msg.id)}>
                       <Trash2 className="w-5 h-5 text-red-500" />
                     </Button>
                     <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                       <Calendar className="w-3 h-3" />
                       {format(new Date(msg.created_date), 'dd/MM/yy HH:mm', { locale: he })}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}