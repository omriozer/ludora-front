
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, GraduationCap, Phone, User as UserIcon, CheckCircle, AlertTriangle } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { cerror } from "@/lib/utils";

export default function ContentCreatorSignup() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    phone: "",
    full_name: "",
    education_level: ""
  });

  useEffect(() => {
    if (!userLoading && currentUser) {
      // Check if already a content creator
      if (currentUser.content_creator_agreement_sign_date) {
        navigate("/creator-portal");
        return;
      }

      // Pre-fill form with existing user data
      setFormData({
        phone: currentUser.phone || "",
        full_name: currentUser.full_name || "",
        education_level: currentUser.education_level || ""
      });
    } else if (!userLoading && !currentUser) {
      // Redirect to login if not logged in
      User.login();
    }
  }, [userLoading, currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.phone.trim() || !formData.full_name.trim() || !formData.education_level) {
      setMessage({ type: 'error', text: 'אנא מלאו את כל השדות החובה' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Update user with content creator status and form data
      await User.updateMyUserData({
        phone: formData.phone,
        full_name: formData.full_name,
        education_level: formData.education_level,
        content_creator_agreement_sign_date: new Date().toISOString()
      });

      setMessage({ type: 'success', text: 'ברכותינו! הצטרפת בהצלחה למשפחת יוצרי התוכן של לודורה' });
      
      // Redirect to content creator portal after a short delay
      setTimeout(() => {
        navigate("/creator-portal");
      }, 2000);

    } catch (error) {
      cerror("Error signing up:", error);
      setMessage({ type: 'error', text: 'שגיאה בהרשמה. אנא נסו שוב.' });
    }
    
    setIsSubmitting(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-teal-50 py-8" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 rounded-full px-4 py-2 text-sm font-medium mb-4">
            <Users className="w-4 h-4" />
            יוצרי תוכן
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">הצטרפות ליוצרי התוכן של לודורה</h1>
          <p className="text-xl text-gray-600">הפכו לחלק ממשפחת היוצרים שלנו וקבלו תגמול על התכנים שלכם</p>
        </div>

        {/* Explanation Card */}
        <Card className="mb-8 border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">יש להשלים הסבר</h3>
            <p className="text-gray-600 leading-relaxed">
              כאן יופיע הסבר מפורט על מערכת יוצרי התוכן, התגמולים, ותנאי השימוש
            </p>
          </CardContent>
        </Card>

        {/* Signup Form */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              טופס הרשמה
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="full_name">שם מלא *</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="הזינו את שמכם המלא"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">מספר טלפון *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="050-1234567"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="education_level">השכלה *</Label>
                <Select 
                  value={formData.education_level} 
                  onValueChange={(value) => handleInputChange('education_level', value)}
                  required
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחרו את רמת ההשכלה שלכם" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_education_degree">ללא תואר בחינוך</SelectItem>
                    <SelectItem value="bachelor_education">תואר ראשון בחינוך</SelectItem>
                    <SelectItem value="master_education">תואר שני בחינוך</SelectItem>
                    <SelectItem value="phd_education">דוקטורט</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-3 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                    מעבד הרשמה...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 ml-2" />
                    הצטרפות ליוצרי תוכן
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
