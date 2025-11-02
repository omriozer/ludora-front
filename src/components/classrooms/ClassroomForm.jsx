import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GraduationCap, Save, X } from "lucide-react";

export default function ClassroomForm({ isOpen, onClose, onSubmit, classroom = null, isLoading = false }) {
  const [formData, setFormData] = useState({
    name: "",
    grade_level: "",
    year: "",
    description: ""
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (classroom) {
      setFormData({
        name: classroom.name || "",
        grade_level: classroom.grade_level || "",
        year: classroom.year || "",
        description: classroom.description || ""
      });
    } else {
      setFormData({
        name: "",
        grade_level: "",
        year: "",
        description: ""
      });
    }
    setErrors({});
  }, [classroom, isOpen]);

  const gradeOptions = [
    { value: "kindergarten", label: "גן חובה" },
    { value: "grade_1", label: "כיתה א" },
    { value: "grade_2", label: "כיתה ב" },
    { value: "grade_3", label: "כיתה ג" },
    { value: "grade_4", label: "כיתה ד" },
    { value: "grade_5", label: "כיתה ה" },
    { value: "grade_6", label: "כיתה ו" },
    { value: "grade_7", label: "כיתה ז" },
    { value: "grade_8", label: "כיתה ח" },
    { value: "grade_9", label: "כיתה ט" },
    { value: "grade_10", label: "כיתה י" },
    { value: "grade_11", label: "כיתה יא" },
    { value: "grade_12", label: "כיתה יב" }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    // Check if at least one field is filled
    if (!formData.name.trim() && !formData.grade_level && !formData.year.trim()) {
      newErrors.general = "חובה למלא לפחות אחד מהשדות: שם כיתה, שכבה או מחזור";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clean up empty fields
    const cleanData = {};
    Object.keys(formData).forEach(key => {
      if (formData[key] && formData[key].trim && formData[key].trim() !== "") {
        cleanData[key] = formData[key].trim();
      } else if (formData[key] && !formData[key].trim) {
        cleanData[key] = formData[key];
      }
    });

    onSubmit(cleanData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.general) {
      setErrors({});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {classroom ? "ערוך כיתה" : "כיתה חדשה"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Classroom Name */}
          <div className="space-y-2">
            <Label htmlFor="name">שם הכיתה</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="לדוגמה: כיתה א1, כיתת הדקלים..."
            />
          </div>

          {/* Grade Level */}
          <div className="space-y-2">
            <Label htmlFor="grade_level">שכבה</Label>
            <Select value={formData.grade_level} onValueChange={(value) => handleInputChange("grade_level", value)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר שכבה" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Year */}
          <div className="space-y-2">
            <Label htmlFor="year">מחזור/שנת לימודים</Label>
            <Input
              id="year"
              value={formData.year}
              onChange={(e) => handleInputChange("year", e.target.value)}
              placeholder="לדוגמה: 2024-2025"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">תיאור נוסף (אופציונלי)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="תיאור קצר על הכיתה..."
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
            >
              <Save className="w-4 h-4 ml-2" />
              {isLoading ? "שומר..." : classroom ? "עדכן" : "צור כיתה"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}