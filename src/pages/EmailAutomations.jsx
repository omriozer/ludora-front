
import React, { useState, useEffect } from "react";
import { EmailTemplate, User } from "@/services/entities";
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Zap,
  Settings
} from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AdvancedEmailEditor from "../components/email/AdvancedEmailEditor";
import { Link } from "react-router-dom"; // Import Link for navigation

export default function EmailAutomations() {
  const [templates, setTemplates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    html_content: "",
    trigger_type: "manual",
    trigger_hours_before: 24,
    trigger_hours_after: 2,
    target_product_types: [],
    target_product_ids: [],
    target_admin_emails: [],
    is_active: true,
    send_to_admins: false,
    access_expiry_days_before: 7
  });

  const triggerTypes = [
    { value: "manual", label: "ידני - לשליחה ידנית בלבד" },
    { value: "product_purchase", label: "רכישת מוצר" },
    { value: "workshop_reminder_before", label: `תזכורת לפני ${getProductTypeName('workshop', 'singular')}` },
    { value: "workshop_reminder_after_attended", label: `תזכורת אחרי ${getProductTypeName('workshop', 'singular')} - למשתתפים` },
    { value: "workshop_reminder_after_no_show", label: `תזכורת אחרי ${getProductTypeName('workshop', 'singular')} - לא השתתפו` },
    { value: "recording_published", label: "הקלטה פורסמה" },
    { value: "access_expiring", label: "גישה תפוג בקרוב" },
    { value: "admin_purchase_notification", label: "הודעה למנהלים על רכישה" },
    { value: "admin_workshop_reminder", label: `תזכורת למנהלים על ${getProductTypeName('workshop', 'singular')}` },
    { value: "student_invitation", label: "הזמנת תלמיד לכיתה" },
    { value: "parent_consent_request", label: "בקשת אישור הורה" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      if (user.role === 'admin') {
        const templatesData = await EmailTemplate.list('-created_date');
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.html_content.trim()) {
      setMessage({ type: 'error', text: 'אנא מלא את כל השדות הנדרשים' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      if (editingTemplate) {
        await EmailTemplate.update(editingTemplate.id, formData);
        setMessage({ type: 'success', text: 'התבנית עודכנה בהצלחה' });
      } else {
        await EmailTemplate.create(formData);
        setMessage({ type: 'success', text: 'התבנית נוצרה בהצלחה' });
      }

      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בשמירת התבנית' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      trigger_type: template.trigger_type,
      trigger_hours_before: template.trigger_hours_before || 24,
      trigger_hours_after: template.trigger_hours_after || 2,
      target_product_types: template.target_product_types || [],
      target_product_ids: template.target_product_ids || [],
      target_admin_emails: template.target_admin_emails || [],
      is_active: template.is_active,
      send_to_admins: template.send_to_admins || false,
      access_expiry_days_before: template.access_expiry_days_before || 7
    });
    setShowForm(true);
  };

  const handleDelete = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    
    if (template?.is_system_template) {
      setMessage({ type: 'error', text: 'לא ניתן למחוק תבנית מערכת. ניתן רק לערוך אותה.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!confirm("האם למחוק את התבנית? פעולה זו לא ניתנת לביטול.")) return;

    try {
      await EmailTemplate.delete(templateId);
      setMessage({ type: 'success', text: 'התבנית נמחקה בהצלחה' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה במחיקת התבנית' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      html_content: "",
      trigger_type: "manual",
      trigger_hours_before: 24,
      trigger_hours_after: 2,
      target_product_types: [],
      target_product_ids: [],
      target_admin_emails: [],
      is_active: true,
      send_to_admins: false,
      access_expiry_days_before: 7
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
    resetForm();
  };

  if (isLoading) {
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
              אין לך הרשאות גישה לניהול אוטומציות מייל. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const getTriggerLabel = (triggerType) => {
    const trigger = triggerTypes.find(t => t.value === triggerType);
    return trigger ? trigger.label : triggerType;
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-8 h-8" />
                <h1 className="text-2xl md:text-3xl font-bold">אוטומציות מייל</h1>
              </div>
              <p className="text-purple-100">צור ונהל תבניות מייל אוטומטיות</p>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {!showForm ? (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">תבניות מייל אוטומטיות</h2>
                <p className="text-gray-600">נהל תבניות שיישלחו אוטומטית בהתבסס על אירועים במערכת</p>
              </div>
              <div className="flex gap-3">
                <Link to="/emails">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    שלח מייל ידני
                  </Button>
                </Link>
                <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-5 h-5 mr-2" />
                  תבנית חדשה
                </Button>
              </div>
            </div>

            {/* Templates List */}
            <div className="grid gap-4">
              {templates.length === 0 ? (
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">אין תבניות עדיין</h3>
                    <p className="text-gray-500 mb-6">צור את התבנית הראשונה כדי להתחיל עם אוטומציות מייל</p>
                    <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-5 h-5 mr-2" />
                      צור תבנית ראשונה
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                templates.map((template) => (
                  <Card key={template.id} className="border-none shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{template.name}</h3>
                            <Badge variant={template.is_active ? "default" : "secondary"}>
                              {template.is_active ? "פעיל" : "לא פעיל"}
                            </Badge>
                            {template.is_system_template && (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                תבנית מערכת
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{template.subject}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTriggerLabel(template.trigger_type)}
                            </Badge>
                            {template.send_to_admins && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                למנהלים
                              </Badge>
                            )}
                            {template.target_product_types && template.target_product_types.length > 0 && (
                              <Badge variant="outline">
                                {template.target_product_types.map(type =>
                                  getProductTypeName(type, 'plural')
                                ).join(", ")}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            נוצר ב: {new Date(template.created_date).toLocaleDateString('he-IL')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!template.is_system_template && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Form */
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingTemplate ? "עריכת תבנית" : "תבנית חדשה"}</span>
                <Button variant="ghost" size="icon" onClick={handleCancel}>
                  <X className="w-5 h-5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם התבנית *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder={`לדוגמה: תזכורת לפני ${getProductTypeName('workshop', 'singular')}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger_type">טריגר *</Label>
                  <Select
                    value={formData.trigger_type}
                    onValueChange={(value) => setFormData({...formData, trigger_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Timing Settings */}
              {(formData.trigger_type === 'workshop_reminder_before') && (
                <div className="space-y-2">
                  <Label htmlFor="trigger_hours_before">כמה שעות לפני ה{getProductTypeName('workshop', 'singular')} לשלוח</Label>
                  <Input
                    id="trigger_hours_before"
                    type="number"
                    value={formData.trigger_hours_before}
                    onChange={(e) => setFormData({...formData, trigger_hours_before: parseInt(e.target.value) || 24})}
                  />
                </div>
              )}

              {(formData.trigger_type === 'workshop_reminder_after_attended' || formData.trigger_type === 'workshop_reminder_after_no_show') && (
                <div className="space-y-2">
                  <Label htmlFor="trigger_hours_after">כמה שעות אחרי ה{getProductTypeName('workshop', 'singular')} לשלוח</Label>
                  <Input
                    id="trigger_hours_after"
                    type="number"
                    value={formData.trigger_hours_after}
                    onChange={(e) => setFormData({...formData, trigger_hours_after: parseInt(e.target.value) || 2})}
                  />
                </div>
              )}

              {formData.trigger_type === 'access_expiring' && (
                <div className="space-y-2">
                  <Label htmlFor="access_expiry_days_before">כמה ימים לפני תפוגת הגישה לשלוח</Label>
                  <Input
                    id="access_expiry_days_before"
                    type="number"
                    value={formData.access_expiry_days_before}
                    onChange={(e) => setFormData({...formData, access_expiry_days_before: parseInt(e.target.value) || 7})}
                  />
                </div>
              )}

              {/* Product Type Targeting */}
              {(formData.trigger_type === 'product_purchase' || formData.trigger_type === 'admin_purchase_notification') && (
                <div className="space-y-2">
                  <Label>סוגי מוצרים רלוונטיים</Label>
                  <div className="flex gap-4">
                    {["workshop", "course", "file"].map((type) => (
                      <label key={type} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          checked={formData.target_product_types.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                target_product_types: [...formData.target_product_types, type]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                target_product_types: formData.target_product_types.filter(t => t !== type)
                              });
                            }
                          }}
                        />
                        <span className="text-sm">
                          {getProductTypeName(type, 'plural')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Targeting */}
              {(formData.trigger_type.startsWith('admin_') || formData.trigger_type === 'product_purchase') && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="send_to_admins"
                      checked={formData.send_to_admins}
                      onCheckedChange={(checked) => setFormData({...formData, send_to_admins: checked})}
                    />
                    <Label htmlFor="send_to_admins">שלח למנהלים</Label>
                  </div>

                  {formData.send_to_admins && (
                    <div className="space-y-2">
                      <Label htmlFor="target_admin_emails">מיילים של מנהלים ספציפיים (ריק = כל המנהלים)</Label>
                      <Textarea
                        id="target_admin_emails"
                        value={formData.target_admin_emails.join(', ')}
                        onChange={(e) => setFormData({
                          ...formData,
                          target_admin_emails: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                        })}
                        placeholder="admin1@example.com, admin2@example.com"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Email Content */}
              <div className="space-y-2">
                <Label htmlFor="subject">נושא המייל *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="נושא המייל - ניתן להשתמש ב {{recipient_name}}, {{product_title}} וכו'"
                />
              </div>

              <div className="space-y-2">
                <Label>תוכן המייל *</Label>
                {getAvailableVariables(formData.trigger_type) && (
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 mb-2">
                    <strong>משתנים זמינים:</strong> {getAvailableVariables(formData.trigger_type)} (השתמש עם סוגריים מסולסלים)
                  </div>
                )}
                
                {/* Replace ReactQuill with AdvancedEmailEditor */}
                <AdvancedEmailEditor
                  content={formData.html_content}
                  onContentChange={(content) => setFormData({...formData, html_content: content})}
                  availableVariables={getAvailableVariables(formData.trigger_type)}
                  triggerType={formData.trigger_type}
                  templateName={formData.name}
                />
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">תבנית פעילה</Label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  ביטול
                </Button>
                <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                  <Save className="w-4 h-4 mr-2" />
                  {editingTemplate ? "עדכן תבנית" : "צור תבנית"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  function getAvailableVariables(triggerType) {
    const variablesByTrigger = {
      manual: "recipient_name, recipient_email, current_date",
      product_purchase: "recipient_name, recipient_email, product_title, product_type, buyer_name, buyer_email, buyer_phone, payment_amount, purchase_date, current_date",
      workshop_reminder_before: "recipient_name, recipient_email, workshop_title, workshop_date, participant_name, participant_email, participant_phone, zoom_link, zoom_password, current_date",
      workshop_reminder_after_attended: "recipient_name, recipient_email, workshop_title, workshop_date, participant_name, participant_email, recording_url, access_until, current_date",
      workshop_reminder_after_no_show: "recipient_name, recipient_email, workshop_title, workshop_date, participant_name, participant_email, recording_url, access_until, current_date",
      recording_published: "recipient_name, recipient_email, workshop_title, recording_url, access_until, current_date",
      access_expiring: "recipient_name, recipient_email, product_title, product_type, days_remaining, access_until, current_date",
      admin_purchase_notification: "recipient_name, recipient_email, product_title, product_type, buyer_name, buyer_email, buyer_phone, payment_amount, purchase_date, admin_name, current_date",
      admin_workshop_reminder: "recipient_name, recipient_email, workshop_title, workshop_date, admin_name, registered_participants_count, max_participants, current_date",
      student_invitation: "recipient_name, recipient_email, student_name, teacher_name, classroom_name, classroom_grade, classroom_year, invitation_link, site_name, personal_message, current_date",
      parent_consent_request: "recipient_name, recipient_email, student_name, teacher_name, classroom_name, classroom_grade, classroom_year, consent_link, privacy_policy_link, terms_of_service_link, site_name, personal_message, current_date"
    };

    return variablesByTrigger[triggerType] || "recipient_name, recipient_email, current_date";
  }
}
