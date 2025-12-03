import React, { useState, useEffect } from "react";
import { Workshop, User, EmailTemplate, Purchase } from "@/services/entities";
import { SendEmail } from "@/services/integrations";
import { useUser } from "@/contexts/UserContext";
import { ludlog, luderror } from '@/lib/ludlog';
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Send,
  Users,
  Calendar,
  Search,
  Save,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Eye,
  X
} from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function Emails() {
  const { currentUser, isLoading: userLoading } = useUser();
  const [workshops, setWorkshops] = useState([]);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Email form state
  const [recipientType, setRecipientType] = useState("workshop");
  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadData();
    }
  }, [userLoading, currentUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      setIsAdmin(currentUser.role === 'admin');

      if (currentUser.role === 'admin') {
        const [workshopsData, usersData, templatesData] = await Promise.all([
          Workshop.find({}, "-created_date"),
          User.list("-created_date"),
          EmailTemplate.find()
        ]);

        setWorkshops(workshopsData);
        setUsers(usersData);
        setTemplates(templatesData);
      }
    } catch (error) {
      luderror.validation("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleTemplateChange = (templateId) => {
    if (!templateId) {
      setSelectedTemplate("");
      setSubject("");
      setContent("");
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template.id);
      setSubject(template.subject);
      setContent(template.html_content);
    }
  };

  const getRecipients = async () => {
    switch (recipientType) {
      case 'workshop':
        if (!selectedWorkshop) return [];
        const purchases = await Purchase.filter({ purchasable_type: 'workshop', purchasable_id: selectedWorkshop });
        // Get emails from user IDs in purchases
        const userIds = [...new Set(purchases.map(p => p.user_id).filter(id => id))];
        if (userIds.length === 0) return [];
        const users = await User.filter({ id: { $in: userIds } });
        return users.map(u => u.email);
      case 'all':
        return users.map(u => u.email);
      case 'custom':
        return customEmail ? customEmail.split(',').map(e => e.trim()).filter(e => e) : [];
      case 'specific':
        return selectedUsers.map(u => u.email);
      default:
        return [];
    }
  };

  const handleUserToggle = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleSendEmail = async () => {
    if (!subject.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'אנא מלאי נושא ותוכן למייל' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    const recipients = await getRecipients();
    if (recipients.length === 0) {
      setMessage({ type: 'error', text: 'לא נבחרו נמענים' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    setIsSending(true);
    let successCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      try {
        await SendEmail({ to: recipient, subject, body: content, from_name: "Ludora" });
        successCount++;
      } catch (e) {
        errorCount++;
      }
    }

    setMessage({ 
      type: successCount > 0 ? 'success' : 'error', 
      text: `שליחה הושלמה: ${successCount} נשלחו, ${errorCount} נכשלו.`
    });
    setIsSending(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveTemplate = async (asNew = false) => {
    const name = prompt("אנא הכניסי שם לתבנית:");
    if (!name) return;

    try {
      if (selectedTemplate && !asNew) {
        await EmailTemplate.update(selectedTemplate, { name, subject, html_content: content });
      } else {
        await EmailTemplate.create({ name, subject, html_content: content, trigger_type: 'manual' });
      }
      setMessage({ type: 'success', text: 'התבנית נשמרה בהצלחה' });
      loadData();
    } catch (e) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת התבנית' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate || !confirm("האם למחוק את התבנית הנבחרת?")) return;
    try {
      await EmailTemplate.delete(selectedTemplate);
      setMessage({ type: 'success', text: 'התבנית נמחקה' });
      handleTemplateChange("");
      loadData();
    } catch(e) {
      setMessage({ type: 'error', text: 'שגיאה במחיקת התבנית' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (userLoading || isLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
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
              אין לך הרשאות גישה לניהול מיילים. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-8 h-8" />
                <h1 className="text-2xl md:text-3xl font-bold">ניהול מיילים</h1>
              </div>
              <p className="text-blue-100">שליחת מיילים ונהלי תבניות</p>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {previewMode ? (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>תצוגה מקדימה</span>
                <Button variant="outline" onClick={() => setPreviewMode(false)}>
                  <X className="w-4 h-4 ml-2" />
                  סגור תצוגה מקדימה
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-6 border rounded-lg">
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-semibold">נושא: {subject}</h3>
                </div>
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setPreviewMode(false)}>
                  ערוך
                </Button>
                <Button onClick={handleSendEmail} disabled={isSending}>
                  {isSending ? 'שולח...' : 'שלח מייל'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  חיבור מייל חדש
                </span>
                <div className="flex gap-2">
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder={templates.length === 0 ? "לא קיימות תבניות לטעינה" : "טען תבנית קיימת"} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <SelectItem value={null} disabled>לא קיימות תבניות</SelectItem>
                      ) : (
                        templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <Button variant="ghost" size="icon" onClick={handleDeleteTemplate}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Recipient Selection */}
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>שלח אל</Label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workshop">משתתפי {getProductTypeName('workshop', 'singular')}</SelectItem>
                      <SelectItem value="all">כל המשתמשים הרשומים</SelectItem>
                      <SelectItem value="specific">משתמשים ספציפיים</SelectItem>
                      <SelectItem value="custom">כתובת מייל חופשית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  {recipientType === 'workshop' && (
                    <>
                    <Label>בחירת {getProductTypeName('workshop', 'singular')}</Label>
                    <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
                      <SelectTrigger>
                        <SelectValue placeholder={`בחרי ${getProductTypeName('workshop', 'singular')}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {workshops.map((ws) => (
                          <SelectItem key={ws.id} value={ws.id}>{ws.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </>
                  )}
                  {recipientType === 'custom' && (
                     <>
                     <Label>כתובת/ות מייל</Label>
                     <Input 
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="הפרד כתובות עם פסיק (,)"
                      />
                     </>
                  )}
                  {recipientType === 'specific' && (
                    <>
                    <Label>בחירת משתמשים</Label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="חיפוש משתמש..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                      {selectedUsers.length > 0 && (
                        <div className="text-sm text-gray-600">
                          נבחרו {selectedUsers.length} משתמשים
                        </div>
                      )}
                      <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                        {filteredUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id={user.id}
                              checked={selectedUsers.some(u => u.id === user.id)}
                              onCheckedChange={() => handleUserToggle(user)}
                            />
                            <label htmlFor={user.id} className="text-sm cursor-pointer">
                              {user.full_name} ({user.email})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">נושא המייל</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>תוכן המייל</Label>
                <div className="min-h-[400px]">
                  <ReactQuill 
                    value={content} 
                    onChange={setContent} 
                    className="bg-white"
                    style={{ minHeight: '350px' }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleSaveTemplate(false)} disabled={!subject || !content}>
                      <Save className="w-4 h-4 ml-2" />
                      {selectedTemplate ? 'עדכן תבנית' : 'שמור כתבנית'}
                    </Button>
                    {selectedTemplate && (
                      <Button variant="outline" onClick={() => handleSaveTemplate(true)} disabled={!subject || !content}>
                        <Plus className="w-4 h-4 ml-2" />
                        שמור כחדש
                      </Button>
                    )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewMode(true)} disabled={!subject || !content}>
                    <Eye className="w-4 h-4 ml-2" />
                    תצוגה מקדימה
                  </Button>
                  <Button onClick={handleSendEmail} disabled={isSending}>
                    {isSending ? 'שולח...' : <><Send className="w-4 h-4 ml-2" />שלח מייל</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}