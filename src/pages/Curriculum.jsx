import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUser } from "@/contexts/UserContext";
import { Settings, Curriculum as CurriculumAPI, CurriculumItem, Product, apiRequest } from "@/services/apiClient";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import EntityForm from "@/components/ui/EntityForm";
import ClassSelector from "@/components/ui/ClassSelector";
import AssociateProductDialog from "@/components/ui/AssociateProductDialog";
import {
  BookOpen,
  GraduationCap,
  CheckCircle,
  Circle,
  ArrowRight,
  Share2,
  BookMarked,
  Target,
  Layers,
  ChevronUp,
  ChevronDown,
  Edit3,
  Plus,
  Edit,
  Trash2,
  Settings as SettingsIcon,
  Link,
  Users,
  Copy
} from "lucide-react";


export default function Curriculum() {
  const { currentUser } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current selections from URL
  const selectedSubject = searchParams.get('subject') || '';
  const selectedGrade = searchParams.get('grade') || '';

  // State management
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [curriculumItems, setCurriculumItems] = useState([]);
  const [currentCurriculum, setCurrentCurriculum] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectorsCollapsed, setSelectorsCollapsed] = useState(false);

  // Available combinations state for non-admin disable logic
  const [availableCombinations, setAvailableCombinations] = useState(new Set());
  const [combinationsLoading, setCombinationsLoading] = useState(false);

  // Admin functionality state
  const [showCreateCurriculumDialog, setShowCreateCurriculumDialog] = useState(false);
  const [showCreateRangeCurriculumDialog, setShowCreateRangeCurriculumDialog] = useState(false);
  const [showEditCurriculumDialog, setShowEditCurriculumDialog] = useState(false);
  const [showCreateItemDialog, setShowCreateItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [showAssociateProductDialog, setShowAssociateProductDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [associatingItem, setAssociatingItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [resetFormKey, setResetFormKey] = useState(0); // Used to force form reset

  // Class association state
  const [showAssociateClassDialog, setShowAssociateClassDialog] = useState(false);
  const [associatingCurriculum, setAssociatingCurriculum] = useState(null);
  const [copyStatus, setCopyStatus] = useState({}); // Track copy status for curricula
  const [associationLoading, setAssociationLoading] = useState(false);
  const [selectedClassForAssociation, setSelectedClassForAssociation] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher' || isAdmin;

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Load available combinations for non-admin users
  useEffect(() => {
    if (!isAdmin && settings) {
      loadAvailableCombinations();
    }
  }, [isAdmin, settings]);

  // Note: Removed automatic loading of all item counts for performance

  // Load curriculum items when subject/grade selection changes
  useEffect(() => {
    // Always clear current state first when selections change
    setCurriculumItems([]);
    setCurrentCurriculum(null);

    if (selectedSubject && selectedGrade) {
      loadCurriculumItems();
      // Auto-collapse selectors when both selections are made
      setTimeout(() => setSelectorsCollapsed(true), 500); // Small delay for better UX
    } else {
      // Expand selectors when selections are incomplete
      setSelectorsCollapsed(false);
    }
  }, [selectedSubject, selectedGrade]);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const settingsData = await Settings.find();
      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
      }
    } catch (error) {
      cerror('Error loading settings:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת הגדרות המערכת",
        variant: "destructive"
      });
    }
    setSettingsLoading(false);
  };

  // Load available subject/grade combinations for non-admin users using optimized API
  const loadAvailableCombinations = async () => {
    setCombinationsLoading(true);
    try {
      // Use the new optimized endpoint that returns only combinations with curriculum items
      const response = await apiRequest('/entities/curriculum/available-combinations');

      // Convert the response format to the Set format used by the disable logic
      const combinationsSet = new Set();

      // Response format: { combinations: { subject: [grade1, grade2, ...], ... } }
      Object.entries(response.combinations).forEach(([subject, grades]) => {
        grades.forEach(grade => {
          combinationsSet.add(`${subject}-${grade}`);
        });
      });

      setAvailableCombinations(combinationsSet);
      clog('Available combinations for non-admin users (optimized):', Array.from(combinationsSet));
      clog('API response stats:', {
        totalSubjects: response.total_subjects,
        totalCombinations: response.total_combinations
      });
    } catch (error) {
      cerror('Error loading available combinations:', error);
      // On error, allow access to everything to avoid blocking users
      setAvailableCombinations(new Set());
    }
    setCombinationsLoading(false);
  };

  // Simplified: Load item count for a specific subject+grade combination when needed
  const loadItemCountForCombination = async (subject, grade) => {
    try {
      const curricula = await CurriculumAPI.find({
        subject: subject,
        find_by_grade: grade,
        teacher_user_id: null,
        class_id: null,
        is_active: true
      });

      let totalItems = 0;
      for (const curriculum of curricula) {
        const items = await CurriculumItem.find({
          curriculum_id: curriculum.id
        });
        totalItems += items.length;
      }

      return totalItems;
    } catch (error) {
      cerror(`Error loading items count for ${subject} grade ${grade}:`, error);
      return 0;
    }
  };

  const loadCurriculumItems = async () => {
    if (!selectedSubject || !selectedGrade) return;

    setItemsLoading(true);
    try {
      clog('Loading curriculum items for:', { selectedSubject, selectedGrade });

      // First, find the system curriculum for this subject/grade
      // Use the new find_by_grade parameter to find curricula that include this grade
      const curricula = await CurriculumAPI.find({
        subject: selectedSubject,
        find_by_grade: selectedGrade, // This will find both single grade and range curricula
        teacher_user_id: null,
        class_id: null,
        is_active: true
      });

      clog('Found curricula:', curricula);

      if (curricula.length === 0) {
        // No curriculum found for this combination
        clog('No curriculum found for this subject/grade combination');
        setCurriculumItems([]);
        setCurrentCurriculum(null);
        setItemsLoading(false);
        return;
      }

      const curriculum = curricula[0];
      setCurrentCurriculum(curriculum);
      clog('Selected curriculum:', curriculum);

      // Now fetch curriculum items
      const items = await CurriculumItem.find({
        curriculum_id: curriculum.id
      });

      clog('Found curriculum items:', items);

      // Sort items by order (mandatory_order first, then custom_order)
      const sortedItems = items.sort((a, b) => {
        const aOrder = a.custom_order !== null ? a.custom_order : a.mandatory_order || 999;
        const bOrder = b.custom_order !== null ? b.custom_order : b.mandatory_order || 999;
        return aOrder - bOrder;
      });

      setCurriculumItems(sortedItems);
      clog('Final sorted curriculum items:', sortedItems);

      // Load copy status for system curriculum (if this is a system curriculum and user is a teacher)
      if (isTeacher && curriculum.teacher_user_id === null && curriculum.class_id === null) {
        loadCopyStatus(curriculum.id);
      }

    } catch (error) {
      cerror('Error loading curriculum items:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת פריטי תכנית הלימודים",
        variant: "destructive"
      });
      setCurriculumItems([]);
      setCurrentCurriculum(null);
    }
    setItemsLoading(false);
  };

  const handleSubjectSelect = (subject) => {
    const newParams = new URLSearchParams(searchParams);
    if (subject) {
      newParams.set('subject', subject);
    } else {
      newParams.delete('subject');
    }
    setSearchParams(newParams);
  };

  const handleGradeSelect = (grade) => {
    const newParams = new URLSearchParams(searchParams);
    if (grade) {
      newParams.set('grade', grade);
    } else {
      newParams.delete('grade');
    }
    setSearchParams(newParams);
  };

  const handleShareCurriculum = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "הועתק!",
        description: "קישור תכנית הלימודים הועתק לתמונה",
        variant: "default"
      });
    } catch (error) {
      cerror('Error copying to clipboard:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן להעתיק את הקישור",
        variant: "destructive"
      });
    }
  };

  const toggleSelectorsCollapse = () => {
    setSelectorsCollapsed(!selectorsCollapsed);
  };

  const loadCopyStatus = async (curriculumId) => {
    try {
      const status = await apiRequest(`/entities/curriculum/${curriculumId}/copy-status`);
      setCopyStatus(prev => ({
        ...prev,
        [curriculumId]: status
      }));
    } catch (error) {
      cerror('Error loading copy status:', error);
      // Don't show error toast for this, it's not critical
    }
  };

  const handleAssociateCurriculumWithClass = (curriculum) => {
    setAssociatingCurriculum(curriculum);
    setSelectedClassForAssociation(null);
    setShowAssociateClassDialog(true);
  };

  const handleClassSelection = (classroom) => {
    setSelectedClassForAssociation(classroom);
  };

  const handleConfirmAssociation = async () => {
    if (!associatingCurriculum || !selectedClassForAssociation) return;

    setAssociationLoading(true);
    try {
      const response = await apiRequest('/entities/curriculum/copy-to-class', {
        method: 'POST',
        body: JSON.stringify({
          systemCurriculumId: associatingCurriculum.id,
          classId: selectedClassForAssociation.id
        })
      });

      setShowAssociateClassDialog(false);
      setAssociatingCurriculum(null);
      setSelectedClassForAssociation(null);

      toast({
        title: "תכנית הועתקה לכיתה",
        description: `תכנית הלימודים הועתקה בהצלחה לכיתה "${selectedClassForAssociation.name || selectedClassForAssociation.grade_level}". ${response.copiedItemsCount} נושאים הועתקו.`,
        variant: "default"
      });

      // Reload copy status
      loadCopyStatus(associatingCurriculum.id);

    } catch (error) {
      cerror('Error associating curriculum with class:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהעתקת תכנית הלימודים לכיתה",
        variant: "destructive"
      });
    }
    setAssociationLoading(false);
  };

  // Admin functions
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 11);
  };

  const getNextOrder = (items, isMandatory) => {
    if (!items || items.length === 0) return 1;

    const relevantItems = items.filter(item => item.is_mandatory === isMandatory);
    if (relevantItems.length === 0) return 1;

    const maxOrder = Math.max(...relevantItems.map(item =>
      item.custom_order !== null ? item.custom_order : (item.mandatory_order || 0)
    ));

    return maxOrder + 1;
  };


  const handleCreateCurriculum = async () => {
    setFormLoading(true);
    setFormErrors({});
    try {
      const curriculumData = {
        id: generateId(),
        subject: selectedSubject,
        grade: parseInt(selectedGrade),
        teacher_user_id: null, // System curriculum
        class_id: null, // System curriculum
        is_active: true
      };

      const newCurriculum = await CurriculumAPI.create(curriculumData);
      setCurrentCurriculum(newCurriculum);
      setShowCreateCurriculumDialog(false);

      toast({
        title: "תכנית נוצרה",
        description: "תכנית הלימודים נוצרה בהצלחה",
        variant: "default"
      });

      // Reload curriculum items
      loadCurriculumItems();
    } catch (error) {
      cerror('Error creating curriculum:', error);
      setFormErrors({ general: error.message || 'שגיאה ביצירת תכנית הלימודים' });
    }
    setFormLoading(false);
  };

  const handleCreateRangeCurriculum = async (formData) => {
    setFormLoading(true);
    setFormErrors({});
    try {
      const response = await apiRequest('/entities/curriculum/create-range', {
        method: 'POST',
        body: JSON.stringify({
          subject: formData.subject,
          grade_from: parseInt(formData.grade_from),
          grade_to: parseInt(formData.grade_to),
          description: formData.description || ''
        })
      });

      setShowCreateRangeCurriculumDialog(false);

      const fromGrade = settings?.school_grades?.[formData.grade_from] || `כיתה ${formData.grade_from}`;
      const toGrade = settings?.school_grades?.[formData.grade_to] || `כיתה ${formData.grade_to}`;
      const gradeRange = fromGrade === toGrade ? fromGrade : `${fromGrade.replace('כיתה ', '')} - ${toGrade.replace('כיתה ', '')}`;

      toast({
        title: "תכנית טווח נוצרה",
        description: `תכנית לימודים ל${gradeRange} נוצרה בהצלחה`,
        variant: "default"
      });

      // Reload curriculum items if this range includes the currently selected grade
      if (selectedSubject === formData.subject &&
          selectedGrade >= formData.grade_from &&
          selectedGrade <= formData.grade_to) {
        loadCurriculumItems();
      }
    } catch (error) {
      cerror('Error creating range curriculum:', error);
      setFormErrors({ general: error.message || 'שגיאה ביצירת תכנית טווח הלימודים' });
    }
    setFormLoading(false);
  };

  const handleEditCurriculum = async (formData) => {
    if (!currentCurriculum) return;

    setFormLoading(true);
    setFormErrors({});
    try {
      // Check if this is a system curriculum being set to inactive and has copies
      const isSystemCurriculum = currentCurriculum.teacher_user_id === null && currentCurriculum.class_id === null;
      const isBeingSetToInactive = currentCurriculum.is_active === true && formData.is_active === false;
      const hasCopies = copyStatus[currentCurriculum.id]?.hasCopies;
      const copiesCount = copyStatus[currentCurriculum.id]?.copiedCount || 0;

      if (isSystemCurriculum && isBeingSetToInactive && hasCopies) {
        // Show confirmation dialog for cascade update
        const confirmMessage = `תכנית זו הועתקה ל-${copiesCount} כיתות. העברת התכנית ללא פעיל תשבית אותה גם בכל הכיתות. האם להמשיך?`;
        if (!confirm(confirmMessage)) {
          setFormLoading(false);
          return;
        }

        // Use cascade update endpoint
        const response = await apiRequest(`/entities/curriculum/${currentCurriculum.id}/cascade-update`, {
          method: 'PUT',
          body: JSON.stringify({ is_active: formData.is_active })
        });

        setCurrentCurriculum(response.curriculum);
        setShowEditCurriculumDialog(false);

        toast({
          title: "תכנית עודכנה",
          description: `תכנית הלימודים עודכנה בהצלחה. ${response.copiesUpdated} עותקים נוספים עודכנו בכיתות.`,
          variant: "default"
        });

        // Reload copy status since it may have changed
        loadCopyStatus(currentCurriculum.id);
      } else {
        // Regular update
        const updatedCurriculum = await CurriculumAPI.update(currentCurriculum.id, {
          ...currentCurriculum,
          is_active: formData.is_active
        });

        setCurrentCurriculum(updatedCurriculum);
        setShowEditCurriculumDialog(false);

        toast({
          title: "תכנית עודכנה",
          description: "תכנית הלימודים עודכנה בהצלחה",
          variant: "default"
        });
      }
    } catch (error) {
      cerror('Error updating curriculum:', error);
      setFormErrors({ general: error.message || 'שגיאה בעדכון תכנית הלימודים' });
    }
    setFormLoading(false);
  };

  const handleDeleteCurriculum = async () => {
    if (!currentCurriculum) return;

    // Check if this system curriculum has copies (only for system curricula)
    const isSystemCurriculum = currentCurriculum.teacher_user_id === null && currentCurriculum.class_id === null;
    if (isSystemCurriculum && copyStatus[currentCurriculum.id]?.hasCopies) {
      toast({
        title: "לא ניתן למחוק",
        description: "לא ניתן למחוק תכנית לימודים שהועתקה לכיתות. קיימות כיתות המשתמשות בתכנית זו.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('האם אתה בטוח שברצונך למחוק את תכנית הלימודים? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      await CurriculumAPI.delete(currentCurriculum.id);
      setCurrentCurriculum(null);
      setCurriculumItems([]);

      toast({
        title: "תכנית נמחקה",
        description: "תכנית הלימודים נמחקה בהצלחה",
        variant: "default"
      });
    } catch (error) {
      cerror('Error deleting curriculum:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה במחיקת תכנית הלימודים",
        variant: "destructive"
      });
    }
  };

  const handleCreateCurriculumItem = async (formData) => {
    if (!currentCurriculum) return;

    setFormLoading(true);
    setFormErrors({});
    try {
      // Calculate next order number automatically
      const isMandatory = formData.is_mandatory ?? true;
      const nextOrder = getNextOrder(curriculumItems, isMandatory);

      const itemData = {
        id: generateId(),
        curriculum_id: currentCurriculum.id,
        study_topic: formData.study_topic,
        content_topic: formData.content_topic,
        is_mandatory: isMandatory,
        mandatory_order: isMandatory ? nextOrder : null,
        custom_order: null, // Always start with null, can be customized later
        description: formData.description || null,
        is_completed: false
      };

      await CurriculumItem.create(itemData);

      // SUCCESS - Only now reset form and show success message
      toast({
        title: "נושא נוסף",
        description: "נושא הלימוד נוסף בהצלחה לתכנית. ניתן להוסיף נושא נוסף.",
        variant: "default"
      });

      // Reload curriculum items
      await loadCurriculumItems();

      // Reset form for next item but keep modal open - ONLY after success
      setFormErrors({});
      setResetFormKey(prev => prev + 1); // Force form reset
    } catch (error) {
      cerror('Error creating curriculum item:', error);
      setFormErrors({ general: error.message || 'שגיאה ביצירת נושא הלימוד' });
    }
    setFormLoading(false);
  };

  // Modal handlers with proper state management
  const handleOpenCreateItemDialog = () => {
    setFormErrors({});
    setResetFormKey(prev => prev + 1);
    setShowCreateItemDialog(true);
  };

  const handleCloseCreateItemDialog = () => {
    setFormErrors({});
    setResetFormKey(prev => prev + 1);
    setShowCreateItemDialog(false);
  };

  const handleOpenEditItemDialog = (item) => {
    setFormErrors({});
    setEditingItem(item);
    setShowEditItemDialog(true);
  };

  const handleCloseEditItemDialog = () => {
    setFormErrors({});
    setEditingItem(null);
    setShowEditItemDialog(false);
  };

  const handleOpenAssociateProductDialog = (item) => {
    setFormErrors({});
    setAssociatingItem(item);
    setShowAssociateProductDialog(true);
  };

  const handleCloseAssociateProductDialog = () => {
    setFormErrors({});
    setAssociatingItem(null);
    setShowAssociateProductDialog(false);
  };

  const handleEditCurriculumItem = async (formData) => {
    if (!editingItem) return;

    setFormLoading(true);
    setFormErrors({});
    try {
      // Recalculate order if mandatory status changed
      const newIsMandatory = formData.is_mandatory ?? true;
      let newMandatoryOrder = editingItem.mandatory_order;
      let newCustomOrder = editingItem.custom_order;

      if (newIsMandatory !== editingItem.is_mandatory) {
        // Mandatory status changed, recalculate order
        const nextOrder = getNextOrder(curriculumItems, newIsMandatory);
        if (newIsMandatory) {
          newMandatoryOrder = nextOrder;
          newCustomOrder = null;
        } else {
          newMandatoryOrder = null;
          // For optional items, we could assign a custom order, but keeping it null for simplicity
        }
      }

      const itemData = {
        ...editingItem,
        study_topic: formData.study_topic,
        content_topic: formData.content_topic,
        is_mandatory: newIsMandatory,
        mandatory_order: newMandatoryOrder,
        custom_order: newCustomOrder,
        description: formData.description || null
      };

      await CurriculumItem.update(editingItem.id, itemData);

      setShowEditItemDialog(false);
      setEditingItem(null);

      toast({
        title: "נושא עודכן",
        description: "נושא הלימוד עודכן בהצלחה",
        variant: "default"
      });

      // Reload curriculum items
      loadCurriculumItems();
    } catch (error) {
      cerror('Error updating curriculum item:', error);
      setFormErrors({ general: error.message || 'שגיאה בעדכון נושא הלימוד' });
    }
    setFormLoading(false);
  };

  const handleDeleteCurriculumItem = async (item) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את נושא הלימוד? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      await CurriculumItem.delete(item.id);

      toast({
        title: "נושא נמחק",
        description: "נושא הלימוד נמחק בהצלחה",
        variant: "default"
      });

      // Reload curriculum items
      loadCurriculumItems();
    } catch (error) {
      cerror('Error deleting curriculum item:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה במחיקת נושא הלימוד",
        variant: "destructive"
      });
    }
  };

  const handleAssociateProduct = async (formData) => {
    if (!associatingItem) return;

    setFormLoading(true);
    setFormErrors({});
    try {
      const associationData = {
        curriculum_item_id: associatingItem.id,
        product_id: formData.product_id
      };

      await apiRequest('/entities/curriculumproduct', {
        method: 'POST',
        body: JSON.stringify(associationData)
      });

      setShowAssociateProductDialog(false);
      setAssociatingItem(null);

      toast({
        title: "מוצר קושר",
        description: "המוצר קושר בהצלחה לנושא הלימוד",
        variant: "default"
      });
    } catch (error) {
      cerror('Error associating product:', error);
      setFormErrors({ general: error.message || 'שגיאה בקישור המוצר לנושא הלימוד' });
    }
    setFormLoading(false);
  };

  // Helper to check if both selections are made
  const hasBothSelections = selectedSubject && selectedGrade;

  // Helper to format grade display using Hebrew names from settings
  const formatGradeDisplay = (curriculum) => {
    if (!curriculum) return '';

    if (curriculum.is_grade_range && curriculum.grade_from && curriculum.grade_to) {
      const fromGrade = settings?.school_grades?.[curriculum.grade_from] || `כיתה ${curriculum.grade_from}`;
      const toGrade = settings?.school_grades?.[curriculum.grade_to] || `כיתה ${curriculum.grade_to}`;

      if (curriculum.grade_from === curriculum.grade_to) {
        return fromGrade;
      }
      return `${fromGrade.replace('כיתה ', '')} - ${toGrade.replace('כיתה ', '')}`;
    }

    // Single grade curriculum
    const grade = curriculum.grade || curriculum.grade_from || curriculum.grade_to;
    return settings?.school_grades?.[grade] || `כיתה ${grade}`;
  };

  // Helper to get curriculum scope description for better UX clarity
  const getCurriculumScopeDescription = (curriculum) => {
    if (!curriculum) return '';

    if (curriculum.is_grade_range && curriculum.grade_from && curriculum.grade_to) {
      const fromGrade = settings?.school_grades?.[curriculum.grade_from] || `כיתה ${curriculum.grade_from}`;
      const toGrade = settings?.school_grades?.[curriculum.grade_to] || `כיתה ${curriculum.grade_to}`;

      if (curriculum.grade_from === curriculum.grade_to) {
        return `תכנית לכיתה ספציפית: ${fromGrade}`;
      }
      return `תכנית לטווח כיתות: ${fromGrade.replace('כיתה ', '')} - ${toGrade.replace('כיתה ', '')}`;
    }

    // Single grade curriculum
    const grade = curriculum.grade || curriculum.grade_from || curriculum.grade_to;
    const gradeName = settings?.school_grades?.[grade] || `כיתה ${grade}`;
    return `תכנית לכיתה ספציפית: ${gradeName}`;
  };

  // Disable logic for non-admin users based on available curriculum items
  const isSubjectDisabled = (subjectKey) => {
    // Admin users can access everything
    if (isAdmin) return false;

    // If still loading combinations, don't disable to avoid blocking
    if (combinationsLoading) return false;

    // Check if this subject has any grades with curriculum items
    if (!settings?.school_grades) return false;

    for (const gradeKey of Object.keys(settings.school_grades)) {
      if (availableCombinations.has(`${subjectKey}-${gradeKey}`)) {
        return false; // Subject has at least one grade with items
      }
    }

    return true; // Subject has no grades with curriculum items
  };

  const isGradeDisabled = (gradeKey) => {
    // Admin users can access everything
    if (isAdmin) return false;

    // If still loading combinations, don't disable to avoid blocking
    if (combinationsLoading) return false;

    // If no subject is selected, check if grade has any subjects with items
    if (!selectedSubject) {
      if (!settings?.study_subjects) return false;

      for (const subjectKey of Object.keys(settings.study_subjects)) {
        if (availableCombinations.has(`${subjectKey}-${gradeKey}`)) {
          return false; // Grade has at least one subject with items
        }
      }
      return true; // Grade has no subjects with curriculum items
    }

    // If subject is selected, check if this specific combination has items
    return !availableCombinations.has(`${selectedSubject}-${gradeKey}`);
  };

  // Helper to get item count for display (simplified)
  const getItemCount = (subjectKey, gradeKey = null) => {
    // For now, return null to indicate counts are not loaded
    // This removes the expensive loading but keeps the UI structure
    return null;
  };


  // Show loading spinner while essential data is being loaded
  if (settingsLoading || (!isAdmin && combinationsLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <LudoraLoadingSpinner
            size="lg"
            text="טוען דף תכניות הלימודים..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* Hero Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">תכניות לימודים</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            בחר מקצוע וכיתה כדי לעיין בתכנית הלימודים המפורטת
          </p>
        </div>

        {/* Selection Interface - Collapsible */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-center flex-1">
                {hasBothSelections && selectorsCollapsed
                  ? `${settings?.study_subjects?.[selectedSubject]} - ${settings?.school_grades?.[selectedGrade]}`
                  : 'בחר תכנית לימודים'
                }
              </CardTitle>
              {hasBothSelections && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectorsCollapse}
                  className="flex items-center gap-2"
                >
                  {selectorsCollapsed ? (
                    <>
                      <span className="text-sm">הרחב</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span className="text-sm">כווץ</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <AnimatePresence>
            {!selectorsCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <CardContent className="space-y-6">
                  {/* Subject Selection */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BookMarked className="w-5 h-5 text-blue-600" />
                      בחר מקצוע
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                      {settings?.study_subjects && Object.entries(settings.study_subjects)
                        .sort(([keyA, labelA], [keyB, labelB]) => {
                          const disabledA = isSubjectDisabled(keyA);
                          const disabledB = isSubjectDisabled(keyB);

                          // First sort by enabled/disabled status (enabled first)
                          if (disabledA !== disabledB) {
                            return disabledA ? 1 : -1;
                          }

                          // Then sort alphabetically by Hebrew label
                          return labelA.localeCompare(labelB, 'he');
                        })
                        .map(([key, label]) => {
                        const disabled = isSubjectDisabled(key);
                        return (
                          <Card
                            key={key}
                            className={`transition-all duration-200 ${
                              disabled
                                ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                : 'cursor-pointer hover:shadow-md'
                            } ${
                              selectedSubject === key
                                ? 'ring-2 ring-blue-500 bg-blue-50'
                                : !disabled ? 'hover:bg-gray-50' : ''
                            }`}
                            onClick={() => !disabled && handleSubjectSelect(key)}
                          >
                            <CardContent className="p-2 text-center">
                              <p className={`font-medium text-base ${disabled ? 'text-gray-400' : ''}`}>
                                {label}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grade Selection */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                      בחר כיתה
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                      {settings?.school_grades && Object.entries(settings.school_grades)
                        .sort(([keyA, labelA], [keyB, labelB]) => {
                          const disabledA = isGradeDisabled(keyA);
                          const disabledB = isGradeDisabled(keyB);

                          // First sort by enabled/disabled status (enabled first)
                          if (disabledA !== disabledB) {
                            return disabledA ? 1 : -1;
                          }

                          // Then sort alphabetically by Hebrew label
                          return labelA.localeCompare(labelB, 'he');
                        })
                        .map(([key, label]) => {
                        const disabled = isGradeDisabled(key);
                        return (
                          <Card
                            key={key}
                            className={`transition-all duration-200 ${
                              disabled
                                ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                : 'cursor-pointer hover:shadow-md'
                            } ${
                              selectedGrade === key
                                ? 'ring-2 ring-purple-500 bg-purple-50'
                                : !disabled ? 'hover:bg-gray-50' : ''
                            }`}
                            onClick={() => !disabled && handleGradeSelect(key)}
                          >
                            <CardContent className="p-2 text-center">
                              <p className={`font-medium text-base ${disabled ? 'text-gray-400' : ''}`}>
                                {label}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selection Summary */}
                  {(selectedSubject || selectedGrade) && (
                    <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">בחירה נוכחית:</span>
                          <span className="text-blue-700">
                            {selectedSubject && settings?.study_subjects?.[selectedSubject]}
                            {selectedSubject && selectedGrade && ' • '}
                            {selectedGrade && settings?.school_grades?.[selectedGrade]}
                          </span>
                        </div>
                        {selectedSubject && selectedGrade && (
                          <Button variant="outline" size="sm" onClick={handleShareCurriculum}>
                            <Share2 className="w-4 h-4 ml-2" />
                            שתף
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed state action bar */}
          {selectorsCollapsed && hasBothSelections && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 pb-4"
            >
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    {settings?.study_subjects?.[selectedSubject]} • {settings?.school_grades?.[selectedGrade]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectorsCollapse}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit3 className="w-4 h-4 ml-1" />
                    שנה
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShareCurriculum}>
                    <Share2 className="w-4 h-4 ml-2" />
                    שתף
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </Card>

        {/* Curriculum Items Display */}
        {selectedSubject && selectedGrade && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-green-600" />
                  {settings?.study_subjects?.[selectedSubject]} - {formatGradeDisplay(currentCurriculum)}
                </CardTitle>
                <div className="flex items-center gap-3">
                  {curriculumItems.length > 0 && (
                    <Badge variant="secondary">
                      {curriculumItems.length} נושאים
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    {/* Show associate with class button for system curricula for teachers */}
                    {isTeacher && currentCurriculum && currentCurriculum.teacher_user_id === null && currentCurriculum.class_id === null && copyStatus[currentCurriculum.id] && !copyStatus[currentCurriculum.id].hasCopies && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAssociateCurriculumWithClass(currentCurriculum)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Users className="w-4 h-4 ml-2" />
                        קשר לכיתה
                      </Button>
                    )}
                    {isAdmin && currentCurriculum && (
                      <>
                        <Dialog open={showCreateItemDialog} onOpenChange={(open) => open ? handleOpenCreateItemDialog() : handleCloseCreateItemDialog()}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Plus className="w-4 h-4 ml-2" />
                              הוסף נושא
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        <Dialog open={showEditCurriculumDialog} onOpenChange={setShowEditCurriculumDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <SettingsIcon className="w-4 h-4 ml-2" />
                              ניהול תכנית
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <LudoraLoadingSpinner text="טוען נושאי לימוד..." />
              ) : curriculumItems.length === 0 ? (
                <div className="space-y-4">
                  <Alert>
                    <BookOpen className="h-4 w-4" />
                    <AlertDescription>
                      {!currentCurriculum
                        ? 'עדיין לא הוגדרה תכנית לימודים עבור צירוף זה של מקצוע וכיתה.'
                        : 'עדיין לא הוגדרו נושאי לימוד עבור תכנית זו.'
                      }
                    </AlertDescription>
                  </Alert>
                  {isAdmin && !currentCurriculum && (
                    <div className="text-center space-y-3">
                      <div className="flex gap-3 justify-center">
                        <Dialog open={showCreateCurriculumDialog} onOpenChange={setShowCreateCurriculumDialog}>
                          <DialogTrigger asChild>
                            <Button>
                              <Plus className="w-4 h-4 ml-2" />
                              צור תכנית לכיתה אחת
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        <Dialog open={showCreateRangeCurriculumDialog} onOpenChange={setShowCreateRangeCurriculumDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Plus className="w-4 h-4 ml-2" />
                              צור תכנית לטווח כיתות
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                      <p className="text-sm text-gray-500">
                        תכנית לכיתה אחת מתאימה לכיתה ספציפית, ואילו תכנית טווח מתאימה למספר כיתות
                      </p>
                    </div>
                  )}
                  {isAdmin && currentCurriculum && (
                    <div className="text-center">
                      <Dialog open={showCreateItemDialog} onOpenChange={(open) => open ? handleOpenCreateItemDialog() : handleCloseCreateItemDialog()}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 ml-2" />
                            הוסף נושא לימוד ראשון
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {curriculumItems.map((item, index) => (
                    <Card key={item.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">
                                  {item.study_topic}
                                </h4>
                                <p className="text-gray-600">
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
                                {isAdmin && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenAssociateProductDialog(item)}
                                      title="קשר למוצר"
                                    >
                                      <Link className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenEditItemDialog(item)}
                                      title="ערוך נושא"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteCurriculumItem(item)}
                                      title="מחק נושא"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-500">
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

        {/* Call to Action when nothing selected */}
        {!selectedSubject && !selectedGrade && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <ArrowRight className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-xl font-semibold text-gray-700">התחל בבחירת מקצוע וכיתה</h3>
              <p className="text-gray-500">
                לאחר הבחירה, תוכל לעיין בתכנית הלימודים המפורטת ולשתף אותה עם אחרים
              </p>
            </CardContent>
          </Card>
        )}

        {/* Admin Dialogs */}
        {isAdmin && (
          <>
            {/* Create Curriculum Dialog */}
            <Dialog open={showCreateCurriculumDialog} onOpenChange={setShowCreateCurriculumDialog}>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>צור תכנית לימודים חדשה</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <BookOpen className="h-4 w-4" />
                    <AlertDescription>
                      תכנית לימודים חדשה תיווצר עבור {settings?.study_subjects?.[selectedSubject]} כיתה {settings?.school_grades?.[selectedGrade]}
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleCreateCurriculum} disabled={formLoading} className="flex-1">
                      {formLoading ? (
                        <>
                          <LudoraLoadingSpinner size="sm" />
                          <span className="mr-2">יוצר...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 ml-2" />
                          צור תכנית
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateCurriculumDialog(false)} disabled={formLoading}>
                      ביטול
                    </Button>
                  </div>
                  {formErrors.general && (
                    <Alert variant="destructive">
                      <AlertDescription>{formErrors.general}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Create Range Curriculum Dialog */}
            <Dialog open={showCreateRangeCurriculumDialog} onOpenChange={setShowCreateRangeCurriculumDialog}>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>צור תכנית לימודים לטווח כיתות</DialogTitle>
                </DialogHeader>
                <EntityForm
                  fields={[
                    {
                      key: 'subject',
                      type: 'select',
                      label: 'מקצוע',
                      required: true,
                      options: settings?.study_subjects ? Object.entries(settings.study_subjects).map(([key, label]) => ({
                        value: key,
                        label: label
                      })) : [],
                      placeholder: 'בחר מקצוע'
                    },
                    {
                      key: 'grade_from',
                      type: 'select',
                      label: 'מכיתה',
                      required: true,
                      options: settings?.school_grades ? Object.entries(settings.school_grades).map(([key, label]) => ({
                        value: key,
                        label: label
                      })) : [],
                      placeholder: 'בחר כיתת התחלה'
                    },
                    {
                      key: 'grade_to',
                      type: 'select',
                      label: 'עד כיתה',
                      required: true,
                      options: settings?.school_grades ? Object.entries(settings.school_grades).map(([key, label]) => ({
                        value: key,
                        label: label
                      })) : [],
                      placeholder: 'בחר כיתת סיום'
                    },
                    {
                      key: 'description',
                      type: 'textarea',
                      label: 'תיאור (אופציונלי)',
                      placeholder: 'תיאור קצר של תכנית הלימודים',
                      rows: 3
                    }
                  ]}
                  initialData={{
                    subject: selectedSubject || '',
                    grade_from: '',
                    grade_to: '',
                    description: ''
                  }}
                  onSubmit={handleCreateRangeCurriculum}
                  onCancel={() => setShowCreateRangeCurriculumDialog(false)}
                  loading={formLoading}
                  errors={formErrors}
                  title=""
                  submitText="צור תכנית טווח"
                />
              </DialogContent>
            </Dialog>

            {/* Edit Curriculum Dialog */}
            <Dialog open={showEditCurriculumDialog} onOpenChange={setShowEditCurriculumDialog}>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>ניהול תכנית לימודים</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {currentCurriculum && (
                    <EntityForm
                      fields={[
                        {
                          key: 'is_active',
                          type: 'checkbox',
                          label: 'תכנית פעילה',
                          description: 'האם התכנית פעילה ונגישה למשתמשים'
                        }
                      ]}
                      initialData={{ is_active: currentCurriculum.is_active }}
                      onSubmit={handleEditCurriculum}
                      onCancel={() => setShowEditCurriculumDialog(false)}
                      loading={formLoading}
                      errors={formErrors}
                      title=""
                      submitText="עדכן תכנית"
                      showCancel={false}
                    />
                  )}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={handleDeleteCurriculum}
                      disabled={formLoading}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      מחק תכנית
                    </Button>
                    <Button variant="outline" onClick={() => setShowEditCurriculumDialog(false)} disabled={formLoading}>
                      ביטול
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Create Curriculum Item Dialog */}
            <Dialog open={showCreateItemDialog} onOpenChange={(open) => open ? handleOpenCreateItemDialog() : handleCloseCreateItemDialog()}>
              <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    הוסף נושא לימוד חדש
                  </DialogTitle>
                </DialogHeader>

                {/* Clear curriculum scope indicator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <BookOpen className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">{settings?.study_subjects?.[selectedSubject]}</p>
                      <p className="text-sm">{getCurriculumScopeDescription(currentCurriculum)}</p>
                    </div>
                  </div>
                </div>
                <EntityForm
                  key={resetFormKey} // Force form reset when this changes
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
                      key: 'is_mandatory',
                      type: 'checkbox',
                      label: 'נושא חובה',
                      description: `הנושא יתווסף לתכנית הלימודים ${formatGradeDisplay(currentCurriculum)} (הסדר יחושב אוטומטית)`
                    }
                  ]}
                  initialData={{ is_mandatory: true }}
                  onSubmit={handleCreateCurriculumItem}
                  onCancel={handleCloseCreateItemDialog}
                  loading={formLoading}
                  errors={formErrors}
                  title=""
                  submitText="הוסף נושא"
                />
              </DialogContent>
            </Dialog>

            {/* Edit Curriculum Item Dialog */}
            <Dialog open={showEditItemDialog} onOpenChange={(open) => open ? null : handleCloseEditItemDialog()}>
              <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    ערוך נושא לימוד - {settings?.study_subjects?.[selectedSubject]} {formatGradeDisplay(currentCurriculum)}
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
                        key: 'is_mandatory',
                        type: 'checkbox',
                        label: 'נושא חובה',
                        description: `הנושא שייך לתכנית הלימודים ${formatGradeDisplay(currentCurriculum)} (שינוי הסדר יחושב אוטומטית)`
                      }
                    ]}
                    initialData={{
                      study_topic: editingItem.study_topic,
                      content_topic: editingItem.content_topic,
                      description: editingItem.description || '',
                      is_mandatory: editingItem.is_mandatory
                    }}
                    onSubmit={handleEditCurriculumItem}
                    onCancel={handleCloseEditItemDialog}
                    loading={formLoading}
                    errors={formErrors}
                    title=""
                    submitText="עדכן נושא"
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Associate Product Dialog */}
            <AssociateProductDialog
              open={showAssociateProductDialog}
              onOpenChange={(open) => open ? null : handleCloseAssociateProductDialog()}
              item={associatingItem}
              onAssociate={handleAssociateProduct}
              loading={formLoading}
              errors={formErrors}
            />

            {/* Associate Curriculum with Class Dialog */}
            <Dialog open={showAssociateClassDialog} onOpenChange={setShowAssociateClassDialog}>
              <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    קשר תכנית לימודים לכיתה
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {associatingCurriculum && (
                    <Alert>
                      <Copy className="h-4 w-4" />
                      <AlertDescription>
                        העתק את תכנית הלימודים "{settings?.study_subjects?.[associatingCurriculum.subject]} - {settings?.school_grades?.[associatingCurriculum.grade]}" לכיתה נבחרת
                      </AlertDescription>
                    </Alert>
                  )}

                  <ClassSelector
                    onClassSelect={handleClassSelection}
                    selectedClassId={selectedClassForAssociation?.id}
                    title="בחר כיתה לקישור תכנית הלימודים"
                    description="בחר כיתה קיימת או צור כיתה חדשה עבור תכנית הלימודים"
                    currentUser={currentUser}
                    disabled={associationLoading}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleConfirmAssociation}
                      disabled={!selectedClassForAssociation || associationLoading}
                      className="flex-1"
                    >
                      {associationLoading ? (
                        <>
                          <LudoraLoadingSpinner size="sm" />
                          <span className="mr-2">מעתיק...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 ml-2" />
                          העתק לכיתה
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAssociateClassDialog(false)}
                      disabled={associationLoading}
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}