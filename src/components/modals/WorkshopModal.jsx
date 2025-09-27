import React, { useState, useEffect } from "react";
import { Workshop, Category, Settings } from "@/services/entities";
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import {
  Save,
  X,
  Calendar,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play
} from "lucide-react";

export default function WorkshopModal({ 
  isOpen,
  onClose,
  editingWorkshop = null,
  onSave,
  currentUser
}) {
  const [categories, setCategories] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [message, setMessage] = useState(null);
  const [uploadStates, setUploadStates] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedVideoTab, setSelectedVideoTab] = useState('upload');

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    short_description: "",
    category: "",
    workshop_type: "recorded",
    scheduled_date: "",
    meeting_link: "",
    meeting_password: "",
    meeting_platform: "",
    video_file_url: "",
    max_participants: 20,
    duration_minutes: 90,
    price: 0,
    is_published: false,
    image_url: "",
    tags: [],
    target_audience: "",
    access_days: 30
  });

  // Load initial data on mount
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingWorkshop) {
        loadEditingWorkshop();
      } else {
        resetForm();
      }
    } else {
      resetForm();
      setMessage(null);
    }
  }, [isOpen, editingWorkshop]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, settingsData] = await Promise.all([
        Category.find({}),
        Settings.find()
      ]);
      
      setCategories(categoriesData);
      
      if (settingsData.length > 0) {
        const settings = settingsData[0];
        setGlobalSettings(settings);
        
        if (!editingWorkshop) {
          setFormData(prev => ({
            ...prev,
            access_days: settings.workshop_default_lifetime_access ? null : (settings.workshop_default_access_days || 30)
          }));
        }
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים ראשוניים' });
    }
  };

  const loadEditingWorkshop = () => {
    const workshop = editingWorkshop;
    setFormData({
      ...workshop,
      scheduled_date: workshop.scheduled_date ? 
        new Date(workshop.scheduled_date).toISOString().slice(0, 16) : "",
      tags: workshop.tags || [],
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      short_description: "",
      category: "",
      workshop_type: "recorded",
      scheduled_date: "",
      meeting_link: "",
      meeting_password: "",
      meeting_platform: "",
      video_file_url: "",
      max_participants: 20,
      duration_minutes: 90,
      price: 0,
      is_published: false,
      image_url: "",
      tags: [],
      target_audience: "",
      access_days: 30
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setMessage({ type: 'info', text: `שומר ${getProductTypeName('workshop', 'singular')}...` });
      
      // Prepare data for API
      const workshopData = {
        ...formData,
        scheduled_date: formData.scheduled_date ? 
          new Date(formData.scheduled_date).toISOString() : null,
        price: parseFloat(formData.price) || 0,
        max_participants: parseInt(formData.max_participants) || null,
        duration_minutes: parseInt(formData.duration_minutes) || null,
        access_days: formData.access_days === null || formData.access_days === '' ? null : parseInt(formData.access_days)
      };

      let result;
      if (editingWorkshop) {
        result = await Workshop.update(editingWorkshop.id, workshopData);
      } else {
        result = await Workshop.create(workshopData);
      }

      setMessage({ type: 'success', text: `ה${getProductTypeName('workshop', 'singular')} נשמרה בהצלחה` });
      
      if (onSave) {
        onSave(result);
      }
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error saving workshop:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || error.message || `שגיאה בשמירת ה${getProductTypeName('workshop', 'singular')}` 
      });
    }
  };

  const handleVideoUpload = async (file) => {
    try {
      setUploadStates(prev => ({ ...prev, video: 'uploading' }));
      setUploadProgress(prev => ({ ...prev, video: 0 }));

      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      
      // Add authentication header
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(prev => ({ ...prev, video: progress }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          handleInputChange('video_file_url', response.file_uri || response.url);
          setUploadStates(prev => ({ ...prev, video: 'success' }));
          setMessage({ type: 'success', text: 'הווידאו הועלה בהצלחה' });
        } else {
          throw new Error(`Upload failed: ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed');
      });

      xhr.open('POST', '/api/videos/upload');
      xhr.send(formData);
      
    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadStates(prev => ({ ...prev, video: 'error' }));
      setMessage({ 
        type: 'error', 
        text: `שגיאה בהעלאת הווידאו: ${error.message}` 
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">
            {editingWorkshop ? `עריכת ${getProductTypeName('workshop', 'singular')}` : `${getProductTypeName('workshop', 'singular')} חדשה`}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-500' : 
                             message.type === 'success' ? 'border-green-500' : 
                             'border-blue-500'}>
              {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : 
               message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : 
               <Loader2 className="h-4 w-4 animate-spin" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
              <TabsTrigger value="content">תוכן</TabsTrigger>
              <TabsTrigger value="access">גישה ומחיר</TabsTrigger>
              <TabsTrigger value="settings">הגדרות</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">כותרת *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder={`כותרת ה${getProductTypeName('workshop', 'singular')}`}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">קטגוריה</Label>
                  <Select 
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="short_description">תיאור קצר</Label>
                <Textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  placeholder={`תיאור קצר של ה${getProductTypeName('workshop', 'singular')}`}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="description">תיאור מלא</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={`תיאור מפורט של ה${getProductTypeName('workshop', 'singular')}`}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="target_audience">קהל יעד</Label>
                  <Input
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => handleInputChange('target_audience', e.target.value)}
                    placeholder={`למי מיועדת ה${getProductTypeName('workshop', 'singular')}`}
                  />
                </div>


                <div>
                  <Label htmlFor="duration_minutes">משך זמן (דקות)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                    placeholder="90"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="workshop_type">סוג {getProductTypeName('workshop', 'singular')}</Label>
                <Select 
                  value={formData.workshop_type}
                  onValueChange={(value) => handleInputChange('workshop_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorded">מוקלטת</SelectItem>
                    <SelectItem value="online_live">שידור חי</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.workshop_type === 'recorded' && (
                <div>
                  <Label>העלאת ווידאו</Label>
                  <Tabs value={selectedVideoTab} onValueChange={setSelectedVideoTab}>
                    <TabsList>
                      <TabsTrigger value="upload">העלאה</TabsTrigger>
                      <TabsTrigger value="url">קישור ישיר</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(file);
                          }}
                          className="hidden"
                          id="video-upload"
                        />
                        <label htmlFor="video-upload" className="cursor-pointer">
                          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-lg font-medium">גרור ושחרר קובץ ווידאו או לחץ כדי לבחור</p>
                          <p className="text-sm text-gray-500 mt-2">MP4, MOV, AVI עד 500MB</p>
                        </label>
                        
                        {uploadStates.video === 'uploading' && (
                          <div className="mt-4">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.video}%` }}
                              />
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              מעלה... {Math.round(uploadProgress.video)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="url">
                      <div>
                        <Label htmlFor="video_file_url">קישור לווידאו</Label>
                        <Input
                          id="video_file_url"
                          value={formData.video_file_url}
                          onChange={(e) => handleInputChange('video_file_url', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {formData.workshop_type === 'online_live' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduled_date">תאריך ושעה</Label>
                      <Input
                        id="scheduled_date"
                        type="datetime-local"
                        value={formData.scheduled_date}
                        onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="max_participants">מספר משתתפים מקסימלי</Label>
                      <Input
                        id="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => handleInputChange('max_participants', e.target.value)}
                        placeholder="20"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="meeting_platform">פלטפורמה</Label>
                    <Select 
                      value={formData.meeting_platform}
                      onValueChange={(value) => handleInputChange('meeting_platform', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר פלטפורמה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="meet">Google Meet</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="meeting_link">קישור למפגש</Label>
                    <Input
                      id="meeting_link"
                      value={formData.meeting_link}
                      onChange={(e) => handleInputChange('meeting_link', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="meeting_password">סיסמת מפגש</Label>
                    <Input
                      id="meeting_password"
                      value={formData.meeting_password}
                      onChange={(e) => handleInputChange('meeting_password', e.target.value)}
                      placeholder="סיסמה אופציונלית"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">מחיר (₪)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_lifetime_access"
                    checked={formData.access_days === null}
                    onCheckedChange={(checked) => handleInputChange('access_days', checked ? null : 30)}
                  />
                  <Label htmlFor="is_lifetime_access">גישה לכל החיים</Label>
                </div>
              </div>

              {formData.access_days !== null && (
                <div>
                  <Label htmlFor="access_days">ימי גישה</Label>
                  <Input
                    id="access_days"
                    type="number"
                    value={formData.access_days}
                    onChange={(e) => handleInputChange('access_days', e.target.value)}
                    placeholder="30"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => handleInputChange('is_published', checked)}
                />
                <Label htmlFor="is_published">פורסם</Label>
              </div>

              <div>
                <Label htmlFor="image_url">תמונה</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  placeholder="קישור לתמונה"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={!formData.title.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {editingWorkshop ? 'עדכן' : 'שמור'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}