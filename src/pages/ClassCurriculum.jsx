import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/contexts/UserContext";
import { Curriculum as CurriculumAPI, CurriculumItem, Classroom, apiRequest } from "@/services/apiClient";
import { toast } from "@/components/ui/use-toast";
import { ludlog, luderror } from '@/lib/ludlog';
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import EntityForm from "@/components/ui/EntityForm";
import {
  BookOpen,
  GraduationCap,
  CheckCircle,
  Circle,
  ArrowLeft,
  Copy,
  BookMarked,
  Target,
  Layers,
  Edit,
  Trash2,
  Plus,
  Users
} from "lucide-react";

export default function ClassCurriculum() {
  const { currentUser, settings } = useUser();
  const { classId } = useParams();
  const navigate = useNavigate();

  // State management
  const [classroom, setClassroom] = useState(null);
  const [classCurriculum, setClassCurriculum] = useState(null);
  const [curriculumItems, setCurriculumItems] = useState([]);
  const [systemCurricula, setSystemCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [copyingCurriculum, setCopyingCurriculum] = useState(false);

  // Modal states
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  useEffect(() => {
    loadInitialData();
  }, [classId]);

  useEffect(() => {
    if (classCurriculum) {
      loadCurriculumItems();
    }
  }, [classCurriculum]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const classroomData = await Classroom.findById(classId);
      setClassroom(classroomData);

      // Verify user has access to this classroom
      if (currentUser?.role !== 'admin' && classroomData.teacher_id !== currentUser?.id) {
        toast({
          title: "אין הרשאה",
          description: "אין לך הרשאה לצפות בתכנית הלימודים של כיתה זו",
          variant: "destructive"
        });
        navigate('/classrooms');
        return;
      }

      // Look for existing class curriculum
      const existingCurricula = await CurriculumAPI.find({
        class_id: classId,
        teacher_user_id: currentUser.id,
        is_active: true
      });

      if (existingCurricula.length > 0) {
        setClassCurriculum(existingCurricula[0]);
      } else {
        // No curriculum exists, load system curricula for copying
        await loadSystemCurricula();
      }

    } catch (error) {
      luderror.validation('Error loading initial data:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני הכיתה",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const loadSystemCurricula = async () => {
    try {
      const systemData = await CurriculumAPI.find({
        teacher_user_id: null,
        class_id: null,
        is_active: true
      });
      setSystemCurricula(systemData);
    } catch (error) {
      luderror.validation('Error loading system curricula:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת תכניות הלימודים הקיימות",
        variant: "destructive"
      });
    }
  };

  const loadCurriculumItems = async () => {
    if (!classCurriculum) return;

    setItemsLoading(true);
    try {
      const items = await CurriculumItem.find({
        curriculum_id: classCurriculum.id
      });

      // Sort items by order
      const sortedItems = items.sort((a, b) => {
        const aOrder = a.custom_order !== null ? a.custom_order : a.mandatory_order || 999;
        const bOrder = b.custom_order !== null ? b.custom_order : b.mandatory_order || 999;
        return aOrder - bOrder;
      });

      setCurriculumItems(sortedItems);
    } catch (error) {
      luderror.validation('Error loading curriculum items:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת פריטי תכנית הלימודים",
        variant: "destructive"
      });
    }
    setItemsLoading(false);
  };

  const handleCopySystemCurriculum = async (systemCurriculumId) => {
    setCopyingCurriculum(true);
    try {
      const response = await apiRequest('/entities/curriculum/copy-to-class', {
        method: 'POST',
        body: JSON.stringify({
          systemCurriculumId,
          classId
        })
      });

      setClassCurriculum(response.curriculum);
      setShowCopyDialog(false);

      toast({
        title: "תכנית הועתקה",
        description: `תכנית הלימודים הועתקה בהצלחה לכיתה. ${response.copiedItemsCount} נושאים הועתקו.`,
        variant: "default"
      });

    } catch (error) {
      luderror.validation('Error copying curriculum:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהעתקת תכנית הלימודים",
        variant: "destructive"
      });
    }
    setCopyingCurriculum(false);
  };

  const handleToggleItemCompletion = async (item) => {
    try {
      const updatedItem = await CurriculumItem.update(item.id, {
        ...item,
        is_completed: !item.is_completed
      });

      // Update local state
      setCurriculumItems(items =>
        items.map(i => i.id === item.id ? { ...i, is_completed: !i.is_completed } : i)
      );

      toast({
        title: item.is_completed ? "בוטל סימון השלמה" : "סומן כהושלם",
        description: `נושא "${item.study_topic}" ${item.is_completed ? "בוטל" : "סומן כהושלם"}`,
        variant: "default"
      });

    } catch (error) {
      luderror.validation('Error updating item completion:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון מצב השלמת הנושא",
        variant: "destructive"
      });
    }
  };

  const handleEditCurriculumItem = async (formData) => {
    if (!editingItem) return;

    setFormLoading(true);
    setFormErrors({});
    try {
      const itemData = {
        ...editingItem,
        study_topic: formData.study_topic,
        content_topic: formData.content_topic,
        description: formData.description || null,
        is_completed: formData.is_completed ?? false
      };

      await CurriculumItem.update(editingItem.id, itemData);

      setShowEditItemDialog(false);
      setEditingItem(null);

      toast({
        title: "נושא עודכן",
        description: "נושא הלימוד עודכן בהצלחה",
        variant: "default"
      });

      await loadCurriculumItems();
    } catch (error) {
      luderror.ui('Error updating curriculum item:', error);
      setFormErrors({ general: error.message || 'שגיאה בעדכון נושא הלימוד' });
    }
    setFormLoading(false);
  };

  const getSubjectLabel = (subject) => {
    return settings?.study_subjects?.[subject] || subject;
  };

  const getGradeLabel = (grade) => {
    return settings?.school_grades?.[grade] || `כיתה ${grade}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <LudoraLoadingSpinner size="lg" text="טוען נתוני כיתה..." />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>כיתה לא נמצאה</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* Header with breadcrumb */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/classrooms')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            חזור לכיתות
          </Button>
          <div className="text-sm text-gray-500">
            הכיתות שלי / {classroom.name || getGradeLabel(classroom.grade_level)} / תכנית לימודים
          </div>
        </div>

        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">תכנית לימודים</h1>
          <div className="flex items-center justify-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="text-lg text-gray-600">
              {classroom.name || getGradeLabel(classroom.grade_level)}
            </span>
          </div>
        </div>

        {/* Main Content */}
        {!classCurriculum ? (
          /* No Curriculum - Show Copy Interface */
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">
                בחר תכנית לימודים להעתקה לכיתה
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemCurricula.length === 0 ? (
                <Alert>
                  <BookOpen className="h-4 w-4" />
                  <AlertDescription>
                    אין תכניות לימודים קיימות במערכת. צור תכנית לימודים במערכת תחילה.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 text-center">
                    בחר תכנית לימודים קיימת מהמערכת להעתקה לכיתה זו
                  </p>
                  <div className="grid gap-3">
                    {systemCurricula.map(curriculum => (
                      <Card
                        key={curriculum.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                        onClick={() => handleCopySystemCurriculum(curriculum.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">
                                {getSubjectLabel(curriculum.subject)} - {getGradeLabel(curriculum.grade)}
                              </h3>
                              <p className="text-sm text-gray-500">
                                תכנית מערכת
                              </p>
                            </div>
                            <Copy className="w-5 h-5 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Has Curriculum - Show Class Curriculum with Progress */
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-green-600" />
                  {getSubjectLabel(classCurriculum.subject)} - {getGradeLabel(classCurriculum.grade)}
                </CardTitle>
                <div className="flex items-center gap-3">
                  {curriculumItems.length > 0 && (
                    <Badge variant="secondary">
                      {curriculumItems.filter(item => item.is_completed).length} / {curriculumItems.length} הושלמו
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    תכנית כיתתית
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <LudoraLoadingSpinner text="טוען נושאי לימוד..." />
              ) : curriculumItems.length === 0 ? (
                <Alert>
                  <BookOpen className="h-4 w-4" />
                  <AlertDescription>
                    תכנית הלימודים עדיין לא מכילה נושאי לימוד
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {curriculumItems.map((item, index) => (
                    <Card key={item.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <button
                              onClick={() => handleToggleItemCompletion(item)}
                              className="hover:scale-110 transition-transform"
                            >
                              {item.is_completed ? (
                                <CheckCircle className="w-6 h-6 text-green-500 cursor-pointer" />
                              ) : (
                                <Circle className="w-6 h-6 text-gray-400 cursor-pointer hover:text-green-400" />
                              )}
                            </button>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className={`font-semibold ${item.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {item.study_topic}
                                </h4>
                                <p className={`${item.is_completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                  {item.content_topic}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={item.is_mandatory ? "default" : "outline"}>
                                  {item.is_mandatory ? "חובה" : "רשות"}
                                </Badge>
                                <Badge variant="secondary">
                                  #{index + 1}
                                </Badge>
                                {isTeacher && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingItem(item);
                                      setShowEditItemDialog(true);
                                    }}
                                    title="ערוך נושא"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {item.description && (
                              <p className={`text-sm ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Item Dialog */}
        {isTeacher && (
          <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  ערוך נושא לימוד - {classroom.name || getGradeLabel(classroom.grade_level)}
                </DialogTitle>
              </DialogHeader>
              {editingItem && (
                <EntityForm
                  fields={[
                    {
                      key: 'study_topic',
                      type: 'text',
                      label: 'נושא הלימוד',
                      required: true,
                      placeholder: 'לדוגמה: חיבור וחיסור עד 20'
                    },
                    {
                      key: 'content_topic',
                      type: 'text',
                      label: 'נושא התוכן',
                      required: true,
                      placeholder: 'לדוגמה: חנוכה'
                    },
                    {
                      key: 'description',
                      type: 'textarea',
                      label: 'תיאור נוסף',
                      placeholder: 'תיאור מפורט של הנושא ומה הלמידה כוללת',
                      rows: 3
                    },
                    {
                      key: 'is_completed',
                      type: 'checkbox',
                      label: 'הושלם',
                      description: 'האם הנושא הושלם בכיתה זו'
                    }
                  ]}
                  initialData={{
                    study_topic: editingItem.study_topic,
                    content_topic: editingItem.content_topic,
                    description: editingItem.description || '',
                    is_completed: editingItem.is_completed
                  }}
                  onSubmit={handleEditCurriculumItem}
                  onCancel={() => setShowEditItemDialog(false)}
                  loading={formLoading}
                  errors={formErrors}
                  title=""
                  submitText="עדכן נושא"
                />
              )}
            </DialogContent>
          </Dialog>
        )}

        {copyingCurriculum && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <LudoraLoadingSpinner text="מעתיק תכנית לימודים..." />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}