
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye,
  Code,
  Palette,
  Type,
  Image as ImageIcon,
  Link,
  Mail,
  Sparkles,
  Copy,
  Download,
  Wand2,
  Plus,
  AlertTriangle,
  Info,
  MessageSquare,
  BookOpen,
  Shield
} from "lucide-react";

const EmailTemplateEditor = ({ 
  content, 
  onContentChange, 
  availableVariables = "", 
  triggerType = "manual",
  templateName = ""
}) => {
  const [activeTab, setActiveTab] = useState("visual");
  const [htmlContent, setHtmlContent] = useState(content || "");
  const [showComponentPalette, setShowComponentPalette] = useState(false);
  const iframeRef = useRef(null);

  // Initialize content when prop changes
  useEffect(() => {
    setHtmlContent(content || "");
  }, [content]);

  const handleContentChange = (newContent) => {
    setHtmlContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  // Parse available variables for display only
  const variables = availableVariables ? availableVariables.split(', ').filter(v => v.trim()) : [];

  // Component templates for quick insertion
  const emailComponents = {
    header: {
      name: "כותרת מעוצבת",
      icon: Type,
      template: `
<div style="background: linear-gradient(135deg, #FF6B6B, #4ECDC4); padding: 30px; text-align: center; color: white; border-radius: 15px; margin: 20px 0;">
  <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🛡️ כותרת המייל</h1>
  <p style="margin: 10px 0 0 0; opacity: 0.9;">{{site_name}}</p>
</div>`
    },
    infoBox: {
      name: "תיבת מידע",
      icon: Info,
      template: `
<div style="background: #f8f9fa; border-right: 5px solid #4ECDC4; padding: 20px; margin: 20px 0; border-radius: 10px;">
  <h3 style="margin: 0 0 10px 0; color: #4ECDC4;">📚 כותרת</h3>
  <p style="margin: 0;"><strong>תיאור:</strong> תוכן כאן...</p>
</div>`
    },
    highlightBox: {
      name: "תיבה מודגשת",
      icon: Sparkles,
      template: `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 15px; margin: 25px 0; text-align: center;">
  <h3 style="margin: 0 0 15px 0;">🎯 למה אנחנו צריכים את האישור שלכם?</h3>
  <p style="margin: 0;">המערכת משמשת למטרות חינוכיות בלבד ומיועדת לעזור לתלמידים להתקדם בלמידה באמצעות משחקים חינוכיים ופעילויות אינטראקטיביות.</p>
</div>`
    },
    warningBox: {
      name: "תיבת אזהרה",
      icon: AlertTriangle,
      template: `
<div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 10px; margin: 20px 0;">
  <strong>⚠️ חשוב לדעת:</strong> בהתאם לחוק הגנת הפרטיות, אנו זקוקים לאישורכם לאיסוף ועיבוד מידע על ילדכם למטרות חינוכיות.
</div>`
    },
    messageBox: {
      name: "הודעה אישית",
      icon: MessageSquare,
      template: `
<div style="background: #e3f2fd; border-right: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 8px; font-style: italic;">
  <h4 style="margin: 0 0 10px 0;">💬 הודעה אישית מהמורה:</h4>
  <p style="margin: 0;">{{personal_message}}</p>
</div>`
    },
    button: {
      name: "כפתור מעוצב",
      icon: Link,
      template: `
<div style="text-align: center; margin: 30px 0;">
  <a href="{{consent_link}}" style="display: inline-block; background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">🖊️ מתן אישור הורה</a>
</div>`
    },
    classroomInfo: {
      name: "פרטי כיתה",
      icon: BookOpen,
      template: `
<div style="background: #f8f9fa; border-right: 5px solid #4facfe; padding: 20px; margin: 20px 0; border-radius: 10px;">
  <h3 style="margin: 0 0 15px 0; color: #4facfe;">📚 פרטי הכיתה</h3>
  <p style="margin: 5px 0;"><strong>שם הכיתה:</strong> {{classroom_name}}</p>
  <p style="margin: 5px 0;"><strong>שכבה:</strong> {{classroom_grade}}</p>
  <p style="5px 0;"><strong>מחזור:</strong> {{classroom_year}}</p>
  <p style="5px 0;"><strong>המורה:</strong> {{teacher_name}}</p>
</div>`
    }
  };

  const insertComponent = (componentKey) => {
    const component = emailComponents[componentKey];
    if (component) {
      const newContent = htmlContent + component.template;
      handleContentChange(newContent);
    }
    setShowComponentPalette(false);
  };

  // Create a full email template wrapper for visual editing
  const createFullEmailTemplate = (innerContent) => {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${templateName}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; 
            padding: 20px; 
            direction: rtl;
            line-height: 1.6;
        }
        .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .email-content {
            padding: 20px;
            min-height: 300px;
        }
        .footer { 
            background: #f8f9fa; 
            padding: 30px; 
            text-align: center; 
            color: #666;
            border-radius: 0 0 20px 20px;
        }
        h1, h2, h3, h4 { color: #333; }
        p { color: #555; margin: 10px 0; }
        a { color: #4ECDC4; }
        [contenteditable="true"]:focus {
            outline: 2px solid #4ECDC4;
            outline-offset: 2px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-content" contenteditable="true" id="editableContent">
            ${innerContent || '<p>התחל לכתוב כאן או השתמש ברכיבים המוכנים...</p>'}
        </div>
        <div class="footer">
            <p><strong>{{site_name}}</strong> - מערכת למידה מתקדמת</p>
            <p>📅 {{current_date}}</p>
        </div>
    </div>
    <script>
        const editableContent = document.getElementById('editableContent');
        editableContent.addEventListener('input', function() {
            window.parent.postMessage({
                type: 'contentChange',
                content: this.innerHTML
            }, '*');
        });
        
        // Make sure content is editable
        editableContent.setAttribute('contenteditable', 'true');
    </script>
</body>
</html>`;
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'contentChange') {
        const newContent = event.data.content;
        setHtmlContent(newContent);
        if (onContentChange) {
          onContentChange(newContent);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onContentChange]);

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              עורך חזותי
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              עריכת HTML
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 items-center">
            {/* Show component button only in visual tab */}
            {activeTab === "visual" && (
              <Dialog open={showComponentPalette} onOpenChange={setShowComponentPalette}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    הוסף רכיב
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>הוסף רכיב למייל</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {Object.entries(emailComponents).map(([key, component]) => (
                      <Card 
                        key={key} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => insertComponent(key)}
                      >
                        <CardContent className="p-4 text-center">
                          <component.icon className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                          <div className="font-medium text-sm">{component.name}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Available variables display only */}
            {variables.length > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">משתנים זמינים: </span>
                {variables.join(', ')}
              </div>
            )}
          </div>
        </div>

        <TabsContent value="visual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>עורך חזותי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                <iframe
                  ref={iframeRef}
                  srcDoc={createFullEmailTemplate(htmlContent)}
                  className="w-full h-96 border-none"
                  title="Email Visual Editor"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>עריכת HTML</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={htmlContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="<div>תוכן HTML כאן...</div>"
                dir="ltr"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailTemplateEditor;
