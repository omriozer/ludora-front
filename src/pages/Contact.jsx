
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SupportMessage, User } from '@/services/entities';
import { SendEmail } from '@/services/integrations';
import { Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { getText } from "../components/utils/getText";
import { getProductTypeName } from "@/config/productTypes";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    content: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [contactTexts, setContactTexts] = useState({});

  useEffect(() => {
    loadContactTexts();
  }, []);

  const loadContactTexts = async () => {
    const texts = {
      title: await getText("contact.title", "צור קשר"),
      subtitle: await getText("contact.subtitle", "נשמח לעמוד לרשותך בכל שאלה או בקשה"),
      fullName: await getText("form.fullName", "שם מלא"),
      email: await getText("form.email", "דוא\"ל"), // Correctly escaped for JavaScript string
      phone: await getText("form.phone", "טלפון"),
      subject: await getText("contact.subject", "נושא"),
      content: await getText("contact.content", "תוכן הפנייה"),
      send: await getText("contact.send", "שלח פנייה"),
      sending: await getText("contact.sending", "שולח..."),
      successMessage: await getText("contact.success", "הפנייה נשלחה בהצלחה! ניצור איתך קשר בהקדם."),
      errorMessage: await getText("contact.error", "אירעה שגיאה בשליחת הפנייה. אנא נסה/י שנית מאוחר יותר.")
    };
    setContactTexts(texts);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // 1. Save the message to the database
      await SupportMessage.create(formData);

      // 2. Find admin email to send notification
      const admins = await User.filter({ role: 'admin' });
      const adminEmail = admins.length > 0 ? admins[0].email : 'gal.ozer2@gmail.com'; // Fallback email

      // 3. Send email notification to admin
      await SendEmail({
        to: adminEmail,
        subject: `פנייה חדשה מאתר ה${getProductTypeName('workshop', 'plural')}: ${formData.subject}`,
        body: `
          <div dir="rtl">
            <h2>התקבלה פנייה חדשה מטופס יצירת הקשר:</h2>
            <p><strong>שם:</strong> ${formData.name}</p>
            <p><strong>אימייל:</strong> ${formData.email}</p>
            <p><strong>טלפון:</strong> ${formData.phone}</p>
            <hr>
            <h3>תוכן הפנייה:</h3>
            <p>${formData.content.replace(/\n/g, '<br>')}</p>
            <hr>
            <p>ניתן לצפות בכל הפניות בדף "הודעות תמיכה" בפאנל הניהול.</p>
          </div>
        `,
        from_name: 'מערכת האתר'
      });

      setMessage({ type: 'success', text: contactTexts.successMessage });
      setFormData({ name: '', email: '', phone: '', subject: '', content: '' });

    } catch (error) {
      console.error("Error submitting contact form:", error);
      setMessage({ type: 'error', text: contactTexts.errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12" dir="rtl">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="border-none shadow-2xl">
          <CardHeader className="text-center">
            <Mail className="w-12 h-12 mx-auto text-blue-600 mb-2" />
            <CardTitle className="text-3xl">{contactTexts.title}</CardTitle>
            <p className="text-gray-500">{contactTexts.subtitle}</p>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
                <AlertDescription className="flex items-center gap-2">
                  {message.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{contactTexts.fullName} *</Label>
                  <Input id="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{contactTexts.email} *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{contactTexts.phone} *</Label>
                <Input id="phone" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">{contactTexts.subject} *</Label>
                <Input id="subject" value={formData.subject} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">{contactTexts.content} *</Label>
                <Textarea id="content" value={formData.content} onChange={handleChange} required className="h-32" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    {contactTexts.sending}
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-4 w-4" />
                    {contactTexts.send}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
