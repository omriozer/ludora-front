import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUser } from "@/contexts/UserContext";
import { Curriculum as CurriculumAPI, CurriculumItem, Product, apiRequest } from "@/services/apiClient";
import ProductCard from "@/components/ProductCard";
import { PRODUCT_TYPES } from "@/config/productTypes";
import { toast } from "@/components/ui/use-toast";
import { ludlog, luderror } from '@/lib/ludlog';
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import EntityForm from "@/components/ui/EntityForm";
import ClassSelector from "@/components/ui/ClassSelector";
import AssociateProductDialog from "@/components/ui/AssociateProductDialog";
import SEOHead from '@/components/SEOHead';
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { haveAdminAccess } from "@/utils/adminCheck";
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
  Copy,
  X,
  AlertCircle
} from "lucide-react";


export default function Curriculum() {
  const { currentUser, settings, settingsLoading } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current selections from URL
  const selectedSubject = searchParams.get('subject') || '';
  const selectedGrade = searchParams.get('grade') || '';

  // State management
  const [curriculumItems, setCurriculumItems] = useState([]);
  const [currentCurriculum, setCurrentCurriculum] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectorsCollapsed, setSelectorsCollapsed] = useState(false);

  // Linked products state
  const [linkedProducts, setLinkedProducts] = useState({}); // { curriculumItemId: [products] }
  const [linkedProductsLoading, setLinkedProductsLoading] = useState(false);
  const [relatedProductsOpen, setRelatedProductsOpen] = useState({}); // { curriculumItemId: boolean } - default closed

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

  const isAdmin = haveAdminAccess(currentUser?.role, 'admin_access', settings);
  const isTeacher = currentUser?.role === 'teacher' || isAdmin;

  // Load available combinations for all users when settings are available
  useEffect(() => {
    if (settings) {
      loadAvailableCombinations();
    }
  }, [settings]);

  // Note: Removed automatic loading of all item counts for performance

  // Load curriculum items when subject/grade selection changes
  useEffect(() => {
    // Always clear current state first when selections change
    setCurriculumItems([]);
    setCurrentCurriculum(null);
    setLinkedProducts({}); // Clear linked products when changing selections

    if (selectedSubject && selectedGrade) {
      loadCurriculumItems();
      // Auto-collapse selectors when both selections are made
      setTimeout(() => setSelectorsCollapsed(true), 500); // Small delay for better UX
    } else {
      // Expand selectors when selections are incomplete
      setSelectorsCollapsed(false);
    }
  }, [selectedSubject, selectedGrade]);

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
      ludlog.api('Available combinations for non-admin users (optimized);:', Array.from(combinationsSet));
    } catch (error) {
      luderror.validation('Error loading available combinations:', error);
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
      luderror.validation(`Error loading items count for ${subject} grade ${grade}:`, error);
      return 0;
    }
  };

  const loadCurriculumItems = async () => {
    if (!selectedSubject || !selectedGrade) return;

    setItemsLoading(true);
    try {
      ludlog.general('Loading curriculum items for:', { data: { selectedSubject, selectedGrade } });

      // First, find the system curriculum for this subject/grade
      // Use the new find_by_grade parameter to find curricula that include this grade
      const curricula = await CurriculumAPI.find({
        subject: selectedSubject,
        find_by_grade: selectedGrade, // This will find both single grade and range curricula
        teacher_user_id: null,
        class_id: null,
        is_active: true
      });

      ludlog.general('Found curricula:', { data: curricula });

      if (curricula.length === 0) {
        // No curriculum found for this combination
        ludlog.general('No curriculum found for this subject/grade combination');
        setCurriculumItems([]);
        setCurrentCurriculum(null);
        setItemsLoading(false);
        return;
      }

      const curriculum = curricula[0];
      setCurrentCurriculum(curriculum);
      ludlog.general('Selected curriculum:', { data: curriculum });

      // Now fetch curriculum items (content topics will be loaded through products)
      const items = await CurriculumItem.find({
        curriculum_id: curriculum.id
      });

      ludlog.general('Found curriculum items:', { data: items });

      // Sort items by order (mandatory_order first, then custom_order)
      const sortedItems = items.sort((a, b) => {
        const aOrder = a.custom_order !== null ? a.custom_order : a.mandatory_order || 999;
        const bOrder = b.custom_order !== null ? b.custom_order : b.mandatory_order || 999;
        return aOrder - bOrder;
      });

      setCurriculumItems(sortedItems);
      ludlog.general('Final sorted curriculum items:', { data: sortedItems });

      // Load copy status for system curriculum (if this is a system curriculum and user is a teacher)
      if (isTeacher && curriculum.teacher_user_id === null && curriculum.class_id === null) {
        loadCopyStatus(curriculum.id);
      }

      // Load linked products for the curriculum items
      await loadLinkedProducts(sortedItems);

    } catch (error) {
      luderror.validation('Error loading curriculum items:', error);
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
      luderror.validation('Error copying to clipboard:', error);
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
      luderror.api('Error loading copy status:', error);
      // Don't show error toast for this, it's not critical
    }
  };

  const loadLinkedProducts = async (curriculumItems) => {
    if (!curriculumItems || curriculumItems.length === 0) {
      setLinkedProducts({});
      return;
    }

    setLinkedProductsLoading(true);
    try {
      const linkedProductsMap = {};

      // Load linked products for each curriculum item
      for (const item of curriculumItems) {
        try {
          // Get product associations for this curriculum item
          const associations = await apiRequest(`/entities/curriculumproduct?curriculum_item_id=${item.id}`);

          if (associations && associations.length > 0) {
            // Extract product IDs and fetch product details
            const productIds = associations.map(assoc => assoc.product_id);
            const products = [];

            // Fetch each product with content topics
            for (const productId of productIds) {
              try {
                const product = await apiRequest(`/entities/product/${productId}?include=contentTopic`);
                if (product) {
                  products.push(product);
                }
              } catch (productError) {
                luderror.validation(`Error loading product ${productId}:`, null, { context: productError });
              }
            }

            linkedProductsMap[item.id] = products;
          } else {
            linkedProductsMap[item.id] = [];
          }
        } catch (itemError) {
          luderror.validation(`Error loading linked products for curriculum item ${item.id}:`, itemError);
          linkedProductsMap[item.id] = [];
        }
      }

      setLinkedProducts(linkedProductsMap);
      ludlog.validation('Loaded linked products:', { data: linkedProductsMap });
    } catch (error) {
      luderror.validation('Error loading linked products:', error);
      setLinkedProducts({});
    }
    setLinkedProductsLoading(false);
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
      luderror.validation('Error associating curriculum with class:', error);
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
      luderror.ui('Error creating curriculum:', error);
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
      luderror.ui('Error creating range curriculum:', error);
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
      luderror.ui('Error updating curriculum:', error);
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
      luderror.validation('Error deleting curriculum:', error);
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
        is_mandatory: isMandatory,
        mandatory_order: isMandatory ? nextOrder : null,
        custom_order: null, // Always start with null, can be customized later
        description: formData.description || null,
        is_completed: false
      };

      const newItem = await CurriculumItem.create(itemData);


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
      luderror.ui('Error creating curriculum item:', error);
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
      luderror.ui('Error updating curriculum item:', error);
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
      luderror.validation('Error deleting curriculum item:', error);
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

      // Reload linked products to show the new association
      await loadLinkedProducts(curriculumItems);

      toast({
        title: "מוצר קושר",
        description: "המוצר קושר בהצלחה לנושא הלימוד",
        variant: "default"
      });
    } catch (error) {
      luderror.ui('Error associating product:', error);
      setFormErrors({ general: error.message || 'שגיאה בקישור המוצר לנושא הלימוד' });

      toast({
        title: "שגיאה בקישור מוצר",
        description: error.message || 'שגיאה בקישור המוצר לנושא הלימוד',
        variant: "destructive"
      });
    }
    setFormLoading(false);
  };

  const handleRemoveConnectedProduct = async (curriculumItemId, productId) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר את הקישור למוצר זה? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      // Find and delete the curriculum product association
      const associations = await apiRequest(`/entities/curriculumproduct?curriculum_item_id=${curriculumItemId}&product_id=${productId}`);

      if (associations && associations.length > 0) {
        // Delete the association
        await apiRequest(`/entities/curriculumproduct/${associations[0].id}`, {
          method: 'DELETE'
        });

        // Reload linked products to reflect the removal
        await loadLinkedProducts(curriculumItems);

        toast({
          title: "קישור הוסר",
          description: "הקישור למוצר הוסר בהצלחה מנושא הלימוד",
          variant: "default"
        });
      }
    } catch (error) {
      luderror.validation('Error removing connected product:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהסרת הקישור למוצר",
        variant: "destructive"
      });
    }
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

  // Check if a combination has curriculum items (used for both disable logic and admin indicators)
  const hasCurriculumItems = (subjectKey, gradeKey = null) => {
    // If still loading combinations, assume has items to avoid blocking
    if (combinationsLoading) return true;

    if (gradeKey) {
      // Check specific subject-grade combination
      return availableCombinations.has(`${subjectKey}-${gradeKey}`);
    } else {
      // Check if subject has any grades with curriculum items
      if (!settings?.school_grades) return true;

      for (const gKey of Object.keys(settings.school_grades)) {
        if (availableCombinations.has(`${subjectKey}-${gKey}`)) {
          return true; // Subject has at least one grade with items
        }
      }
      return false; // Subject has no grades with curriculum items
    }
  };

  // Disable logic for non-admin users based on available curriculum items
  const isSubjectDisabled = (subjectKey) => {
    // Admin users can access everything
    if (isAdmin) return false;

    return !hasCurriculumItems(subjectKey);
  };

  const isGradeDisabled = (gradeKey) => {
    // Admin users can access everything
    if (isAdmin) return false;

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

  // Helper to group linked products by type
  const groupProductsByType = (products) => {
    if (!products || products.length === 0) return {};

    const grouped = {};
    products.forEach(product => {
      const type = product.product_type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(product);
    });

    return grouped;
  };

  // Helper to get product type display name
  const getProductTypeDisplayName = (type) => {
    return PRODUCT_TYPES[type]?.plural || type;
  };

  // Helper to toggle related products open state
  const toggleRelatedProducts = (curriculumItemId) => {
    setRelatedProductsOpen(prev => ({
      ...prev,
      [curriculumItemId]: !prev[curriculumItemId] // Default is false (closed)
    }));
  };

  // Helper to extract unique content topics from linked products
  const getContentTopicsFromProducts = (curriculumItemId) => {
    const products = linkedProducts[curriculumItemId] || [];
    const topicsMap = new Map();

    products.forEach(product => {
      if (product.contentTopic) {
        topicsMap.set(product.contentTopic.id, product.contentTopic);
      }
    });

    return Array.from(topicsMap.values());
  };



  // Show loading spinner while essential data is being loaded
  if (settingsLoading || combinationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
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
    <>
      <SEOHead title="תכניות לימודים" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 mobile-no-scroll-x mobile-safe-container relative overflow-hidden" dir="rtl">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-300/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-slate-300/8 to-blue-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/3 left-1/4 w-60 h-60 bg-gradient-to-br from-indigo-300/5 to-blue-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="container mx-auto mobile-padding-x py-1 md:py-2 space-y-2 md:space-y-3 max-w-6xl mobile-safe-container relative z-10">

          {/* Compact Elegant Hero */}
          <div className="text-center space-y-1 md:space-y-2 mobile-safe-container">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative"
            >
              {/* Streamlined Hero Content */}
              <div className="relative bg-white/15 backdrop-blur-xl rounded-2xl p-3 md:p-4 shadow-xl border border-white/20">
                {/* Compact Title Section */}
                <div className="space-y-1 md:space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                      תכניות לימודים
                    </h1>
                  </div>

                  <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    בחר מקצוע וכיתה כדי לעיין בתכנית הלימודים המפורטת
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

        {/* Compact Selection Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          <Card className="w-full shadow-lg border-0 bg-white/25 backdrop-blur-xl mobile-safe-card rounded-2xl overflow-hidden">
            <CardHeader className="mobile-padding py-2 bg-gradient-to-r from-blue-500/6 via-indigo-500/6 to-slate-500/6">
              <div className="mobile-safe-flex items-center justify-between gap-3">
                <CardTitle className="flex-1 mobile-safe-text min-w-0">
                  <span className="text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mobile-truncate block text-center">
                    {hasBothSelections && selectorsCollapsed
                      ? `${settings?.study_subjects?.[selectedSubject]} - ${settings?.school_grades?.[selectedGrade]}`
                      : 'בחר מקצוע וכיתה'
                    }
                  </span>
                </CardTitle>
                {hasBothSelections && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectorsCollapse}
                    className="flex items-center mobile-gap text-xs shrink-0 px-3 py-1.5 rounded-xl hover:bg-white/30 transition-all duration-200"
                  >
                    {selectorsCollapsed ? (
                      <>
                        <span className="hidden sm:inline text-blue-600 font-medium">הרחב</span>
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline text-blue-600 font-medium">כווץ</span>
                        <ChevronUp className="w-4 h-4 text-blue-600" />
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
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <CardContent className="space-y-4 md:space-y-5 mobile-padding">
                    {/* Compact Subject Selection */}
                    <div className="space-y-3 md:space-y-4 mobile-safe-container">
                      <div className="text-center space-y-2">
                        <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
                          <BookMarked className="w-5 h-5 text-blue-600" />
                          בחר מקצוע
                        </h3>
                        <p className="text-sm text-gray-600 max-w-lg mx-auto">
                          גלה את המקצוע שמעניין אותך ביותר
                        </p>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                      {settings?.study_subjects && Object.entries(settings.study_subjects)
                        .sort(([keyA, labelA], [keyB, labelB]) => {
                          const hasItemsA = hasCurriculumItems(keyA);
                          const hasItemsB = hasCurriculumItems(keyB);

                          // First sort by availability (items available first)
                          if (hasItemsA !== hasItemsB) {
                            return hasItemsA ? -1 : 1;
                          }

                          // Then sort alphabetically by Hebrew label
                          return labelA.localeCompare(labelB, 'he');
                        })
                        .map(([key, label]) => {
                        const disabled = isSubjectDisabled(key);
                        const hasItems = hasCurriculumItems(key);
                        const showEmptyIndicator = isAdmin && !hasItems;

                        return (
                          <div key={key} className="relative">
                            {/* Compact Subject Card */}
                            <div
                              className={`relative group transition-all duration-300 cursor-pointer rounded-xl overflow-hidden ${
                                disabled
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'hover:shadow-lg'
                              } ${
                                selectedSubject === key
                                  ? 'ring-2 ring-violet-500 shadow-lg'
                                  : 'shadow-sm hover:shadow-md'
                              }`}
                              onClick={() => !disabled && handleSubjectSelect(key)}
                            >
                              {/* Background */}
                              <div className={`absolute inset-0 ${
                                selectedSubject === key
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                  : disabled
                                    ? 'bg-gradient-to-br from-gray-200 to-gray-300'
                                    : 'bg-gradient-to-br from-blue-400 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-600'
                              }`}></div>

                              {/* Content */}
                              <div className="relative p-3 text-center min-h-[80px] flex flex-col justify-center">
                                {/* Icon */}
                                <div className="mb-2">
                                  <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-transform duration-200 ${
                                    selectedSubject === key
                                      ? 'bg-white/30'
                                      : disabled
                                        ? 'bg-white/20'
                                        : 'bg-white/25 group-hover:bg-white/35'
                                  }`}>
                                    <BookOpen className="w-4 h-4 text-white" />
                                  </div>
                                </div>

                                {/* Text - Always Centered */}
                                <div>
                                  <h4 className="font-medium text-white text-xs leading-tight">
                                    {label}
                                  </h4>
                                </div>

                                {/* Selection Indicator */}
                                {selectedSubject === key && (
                                  <div className="absolute top-1.5 right-1.5">
                                    <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                      <CheckCircle className="w-3 h-3 text-violet-600" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* No Curriculum Badge for admin view */}
                            {showEmptyIndicator && (
                              <div className="absolute -top-1 -left-1 z-20">
                                <span className="inline-block bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                                  ללא תכנית
                                </span>
                              </div>
                            )}

                            {/* Coming Soon Badge for disabled subjects */}
                            {disabled && !isAdmin && (
                              <div className="absolute -top-1 -right-1 z-20">
                                <ComingSoonBadge size="sm" variant="warning" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Compact Grade Selection */}
                  <div className="space-y-3 md:space-y-4 mobile-safe-container">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
                        <GraduationCap className="w-5 h-5 text-emerald-600" />
                        בחר כיתה
                      </h3>
                      <p className="text-sm text-gray-600 max-w-lg mx-auto">
                        איזו כיתה אתה רוצה לחקור?
                      </p>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 xl:grid-cols-12 gap-3 md:gap-4">
                      {settings?.school_grades && Object.entries(settings.school_grades)
                        .sort(([keyA, labelA], [keyB, labelB]) => {
                          const hasItemsA = selectedSubject
                            ? hasCurriculumItems(selectedSubject, keyA)
                            : Object.keys(settings?.study_subjects || {}).some(subjectKey =>
                                hasCurriculumItems(subjectKey, keyA)
                              );
                          const hasItemsB = selectedSubject
                            ? hasCurriculumItems(selectedSubject, keyB)
                            : Object.keys(settings?.study_subjects || {}).some(subjectKey =>
                                hasCurriculumItems(subjectKey, keyB)
                              );

                          // First sort by availability (items available first)
                          if (hasItemsA !== hasItemsB) {
                            return hasItemsA ? -1 : 1;
                          }

                          // Then sort alphabetically by Hebrew label
                          return labelA.localeCompare(labelB, 'he');
                        })
                        .map(([key, label]) => {
                        const disabled = isGradeDisabled(key);
                        const hasItems = selectedSubject
                          ? hasCurriculumItems(selectedSubject, key)
                          : Object.keys(settings?.study_subjects || {}).some(subjectKey =>
                              hasCurriculumItems(subjectKey, key)
                            );
                        const showEmptyIndicator = isAdmin && !hasItems;

                        return (
                          <div key={key} className="relative">
                            {/* Compact Grade Card */}
                            <div
                              className={`relative group transition-all duration-300 cursor-pointer rounded-xl overflow-hidden aspect-square ${
                                disabled
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'hover:shadow-lg'
                              } ${
                                selectedGrade === key
                                  ? 'ring-2 ring-emerald-500 shadow-lg'
                                  : 'shadow-sm hover:shadow-md'
                              }`}
                              onClick={() => !disabled && handleGradeSelect(key)}
                            >
                              {/* Background */}
                              <div className={`absolute inset-0 ${
                                selectedGrade === key
                                  ? 'bg-gradient-to-br from-emerald-500 to-blue-600'
                                  : disabled
                                    ? 'bg-gradient-to-br from-gray-200 to-gray-300'
                                    : 'bg-gradient-to-br from-teal-500 to-blue-600 group-hover:from-emerald-500 group-hover:to-cyan-600'
                              }`}></div>

                              {/* Content */}
                              <div className="relative h-full flex flex-col items-center justify-center p-3 text-center">
                                {/* Grade Number - Always Centered */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-transform duration-200 ${
                                  selectedGrade === key
                                    ? 'bg-white/30'
                                    : disabled
                                      ? 'bg-white/20'
                                      : 'bg-white/25 group-hover:bg-white/35'
                                }`}>
                                  <span className="text-sm">
                                    {label.replace('כיתה ', '').replace(/^\d+\s*/, '')}
                                  </span>
                                </div>

                                {/* Selection Indicator */}
                                {selectedGrade === key && (
                                  <div className="absolute top-1.5 right-1.5">
                                    <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* No Curriculum Badge for admin view */}
                            {showEmptyIndicator && (
                              <div className="absolute -top-1 -left-1 z-20">
                                <span className="inline-block bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                                  ללא תכנית
                                </span>
                              </div>
                            )}

                            {/* Coming Soon Badge for disabled grades */}
                            {disabled && !isAdmin && (
                              <div className="absolute -top-1 -right-1 z-20">
                                <ComingSoonBadge size="sm" variant="warning" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Compact Selection Summary */}
                  {(selectedSubject || selectedGrade) && (
                    <div className="bg-gradient-to-r from-blue-100/60 to-indigo-100/60 rounded-xl mobile-padding mobile-safe-container border border-blue-200/40 backdrop-blur-sm">
                      <div className="mobile-safe-flex items-center justify-between flex-wrap mobile-gap">
                        <div className="mobile-safe-flex items-center mobile-gap flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Target className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm text-blue-700 block">בחירה נוכחית</span>
                            <div className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent mobile-safe-text mobile-truncate">
                              {selectedSubject && settings?.study_subjects?.[selectedSubject]}
                              {selectedSubject && selectedGrade && ' • '}
                              {selectedGrade && settings?.school_grades?.[selectedGrade]}
                            </div>
                          </div>
                        </div>
                        {selectedSubject && selectedGrade && (
                          <Button
                            onClick={handleShareCurriculum}
                            size="sm"
                            className="mt-2 md:mt-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-4 py-2 text-sm"
                          >
                            <Share2 className="w-4 h-4 ml-1.5" />
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

          {/* Compact Collapsed Action Bar */}
          {selectorsCollapsed && hasBothSelections && (
            <div className="mobile-padding-x pb-4">
              <div className="bg-gradient-to-r from-blue-100/60 to-indigo-100/60 rounded-xl mobile-padding border border-blue-200/40 backdrop-blur-sm">
                <div className="mobile-safe-flex items-center justify-between flex-wrap mobile-gap">
                  <div className="mobile-safe-flex items-center mobile-gap flex-1 min-w-0">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent mobile-safe-text mobile-truncate">
                      {settings?.study_subjects?.[selectedSubject]} • {settings?.school_grades?.[selectedGrade]}
                    </span>
                  </div>
                  <div className="mobile-safe-flex items-center mobile-gap mt-2 md:mt-0">
                    <Button
                      onClick={toggleSelectorsCollapse}
                      variant="outline"
                      size="sm"
                      className="bg-white/80 hover:bg-white border-blue-300 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 ml-1" />
                      <span className="hidden sm:inline">שנה</span>
                    </Button>
                    <Button
                      onClick={handleShareCurriculum}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <Share2 className="w-3.5 h-3.5 ml-1.5" />
                      שתף
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
        </motion.div>

        {/* Curriculum Items Display */}
        {selectedSubject && selectedGrade && (
          <Card className="w-full shadow-2xl border-0 bg-white/90 backdrop-blur-sm mobile-safe-card">
            <CardHeader className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-b border-green-100 mobile-padding">
              <div className="mobile-safe-flex items-start justify-between mobile-gap flex-col lg:flex-row">
                <CardTitle className="mobile-safe-flex items-center mobile-gap text-xl md:text-2xl flex-col sm:flex-row">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mb-3 sm:mb-0">
                    <Layers className="w-7 h-7 md:w-8 md:h-8 text-white drop-shadow-sm" />
                  </div>
                  <div className="space-y-2 text-center sm:text-right">
                    <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent font-bold mobile-truncate">
                      {settings?.study_subjects?.[selectedSubject]} - {formatGradeDisplay(currentCurriculum)}
                    </div>
                    <div className="text-sm font-normal text-gray-600">תכנית לימודים מפורטת</div>
                  </div>
                </CardTitle>
                <div className="mobile-safe-flex items-center mobile-gap flex-wrap w-full lg:w-auto justify-center lg:justify-end mt-4 lg:mt-0">
                  {curriculumItems.length > 0 && (
                    <Badge variant="secondary" className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 px-4 py-2 text-sm font-semibold shadow-sm">
                      {curriculumItems.length} נושאים
                    </Badge>
                  )}
                  <div className="mobile-safe-flex items-center mobile-gap flex-wrap">
                    {/* Show associate with class button for system curricula for teachers */}
                    {isTeacher && currentCurriculum && currentCurriculum.teacher_user_id === null && currentCurriculum.class_id === null && copyStatus[currentCurriculum.id] && !copyStatus[currentCurriculum.id].hasCopies && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAssociateCurriculumWithClass(currentCurriculum)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-2 text-sm"
                      >
                        <Users className="w-4 h-4 ml-2" />
                        <span className="hidden sm:inline">קשר לכיתה</span>
                        <span className="sm:hidden">קשר</span>
                      </Button>
                    )}
                    {isAdmin && currentCurriculum && (
                      <>
                        <Dialog open={showCreateItemDialog} onOpenChange={(open) => open ? handleOpenCreateItemDialog() : handleCloseCreateItemDialog()}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-300 px-4 py-2 text-sm">
                              <Plus className="w-4 h-4 ml-2" />
                              <span className="hidden sm:inline">הוסף נושא</span>
                              <span className="sm:hidden">הוסף</span>
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                        <Dialog open={showEditCurriculumDialog} onOpenChange={setShowEditCurriculumDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-300 px-4 py-2 text-sm">
                              <SettingsIcon className="w-4 h-4 ml-2" />
                              <span className="hidden sm:inline">ניהול תכנית</span>
                              <span className="sm:hidden">ניהול</span>
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mobile-padding space-y-6 md:space-y-8 mobile-safe-container">
              {itemsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <LudoraLoadingSpinner text="טוען נושאי לימוד..." size="lg" />
                </div>
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
                <div className="space-y-6">
                  {curriculumItems.map((item, index) => (
                    <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-r from-white via-gray-50/30 to-white hover:from-green-50/30 hover:via-emerald-50/50 hover:to-teal-50/30 shadow-lg">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300 flex-shrink-0">
                                <span className="text-green-700 font-bold text-lg">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h4 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors duration-300">
                                    {item.study_topic}
                                  </h4>
                                  <div className="mt-1">
                                    {(() => {
                                      const contentTopics = getContentTopicsFromProducts(item.id);
                                      return contentTopics.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {contentTopics.map((topic) => (
                                            <Badge
                                              key={topic.id}
                                              variant="outline"
                                              className="bg-blue-50 text-blue-700 border-blue-200 text-sm"
                                            >
                                              {topic.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 text-sm">
                                            ללא נושאי תוכן
                                          </Badge>
                                          {isAdmin && (
                                            <span className="text-xs text-gray-400">קשר מוצרים עם נושאי תוכן לנושא זה</span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border-r-4 border-green-200">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-3 flex-shrink-0">
                              <Badge variant={item.is_mandatory ? "default" : "outline"}
                                     className={`px-3 py-1 text-sm font-semibold shadow-sm ${
                                       item.is_mandatory
                                         ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-md'
                                         : 'border-gray-300 text-gray-600 bg-white'
                                     }`}>
                                {item.is_mandatory ? "חובה" : "רשות"}
                              </Badge>
                              {isAdmin && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenAssociateProductDialog(item)}
                                    title="קשר למוצר"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl p-2 transition-all duration-200"
                                  >
                                    <Link className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEditItemDialog(item)}
                                    title="ערוך נושא"
                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-xl p-2 transition-all duration-200"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteCurriculumItem(item)}
                                    title="מחק נושא"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl p-2 transition-all duration-200"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Linked Products Display - Collapsible */}
                          {linkedProducts[item.id] && linkedProducts[item.id].length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-100">
                              <Collapsible
                                open={relatedProductsOpen[item.id] || false}
                                onOpenChange={() => toggleRelatedProducts(item.id)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-between px-3 py-2 h-auto bg-white/80 hover:bg-blue-50/80 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 group"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded flex items-center justify-center">
                                        <Link className="w-3 h-3 text-white" />
                                      </div>
                                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors duration-200">
                                        מוצרים קשורים ({linkedProducts[item.id].length})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                                        {linkedProducts[item.id].length}
                                      </Badge>
                                      {relatedProductsOpen[item.id] ? (
                                        <ChevronUp className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                                      )}
                                    </div>
                                  </Button>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="mt-2 space-y-3">
                                  {(() => {
                                    const groupedProducts = groupProductsByType(linkedProducts[item.id]);
                                    return Object.entries(groupedProducts).map(([productType, typeProducts]) => (
                                      <div key={productType} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">
                                              {typeProducts.length}
                                            </span>
                                          </div>
                                          <p className="text-sm font-semibold text-gray-700">
                                            {getProductTypeDisplayName(productType)}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {typeProducts.map((product) => (
                                            <div key={product.id} className="relative group">
                                              <ProductCard
                                                product={product}
                                                userPurchases={currentUser?.purchases || []}
                                                showActionBar={true}
                                                onFileAccess={null}
                                                onPdfPreview={null}
                                              />
                                              {isAdmin && (
                                                <button
                                                  onClick={() => handleRemoveConnectedProduct(item.id, product.id)}
                                                  className="absolute top-2 left-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50"
                                                  title="הסר קישור למוצר"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          )}

                          {/* Loading indicator for linked products */}
                          {linkedProductsLoading && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <LudoraLoadingSpinner size="sm" />
                                <span className="text-sm text-blue-700 font-medium">טוען מוצרים קשורים...</span>
                              </div>
                            </div>
                          )}

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
          <Card className="max-w-4xl mx-auto shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 mobile-safe-card">
            <CardContent className="mobile-padding text-center space-y-4 md:space-y-5 py-6 md:py-8 mobile-safe-container">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl mx-auto transform hover:shadow-3xl transition-all duration-300">
                <ArrowRight className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-sm" />
              </div>
              <div className="space-y-4 md:space-y-6 mobile-safe-container">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mobile-truncate">
                  התחל בבחירת מקצוע וכיתה
                </h3>
                <div className="w-20 md:w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mobile-safe-text mobile-padding-x">
                  לאחר הבחירה, תוכל לעיין בתכנית הלימודים המפורטת ולשתף אותה עם אחרים
                </p>
              </div>
              <div className="mobile-safe-flex items-center justify-center mobile-gap pt-4 md:pt-6 flex-wrap">
                <div className="mobile-safe-flex items-center mobile-gap text-gray-500">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm md:text-base">תכניות מפורטות</span>
                </div>
                <div className="mobile-safe-flex items-center mobile-gap text-gray-500">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm md:text-base">שיתוף קל</span>
                </div>
                <div className="mobile-safe-flex items-center mobile-gap text-gray-500">
                  <Users className="w-5 h-5" />
                  <span className="text-sm md:text-base">ניהול כיתות</span>
                </div>
              </div>
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
    </>
  );
}