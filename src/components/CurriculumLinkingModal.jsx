import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { showError, showSuccess } from '@/utils/messaging';
import { ludlog } from '@/lib/ludlog';
import {
  BookOpen,
  GraduationCap,
  Target,
  CheckCircle,
  Info,
  Trash2,
  Package,
  Search,
  Filter
} from 'lucide-react';
import { apiRequest } from '@/services/apiClient';

/**
 * CurriculumLinkingModal - Modal for automatic curriculum linking based on product metadata
 *
 * Displays intelligent curriculum suggestions based on product grade ranges and subjects,
 * allowing users to easily apply or remove curriculum links.
 */
export default function CurriculumLinkingModal({
  isOpen,
  onClose,
  product,
  onLinksUpdated
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedCurriculumItems, setSelectedCurriculumItems] = useState(new Set());
  const [applying, setApplying] = useState(false);
  const [removingLinks, setRemovingLinks] = useState(new Set());

  // Manual browsing state
  const [manualBrowsing, setManualBrowsing] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableGradeRanges, setAvailableGradeRanges] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGradeRange, setSelectedGradeRange] = useState(null);
  const [manualResults, setManualResults] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);

  /**
   * Helper to format user-friendly error messages
   */
  const formatErrorMessage = (error) => {
    // Extract the error message
    const rawMessage = error.response?.data?.error?.message || error.message || '';

    // Parse and improve common backend error messages
    if (rawMessage.includes('curriculumproduct')) {
      return 'שגיאה בקישור תכנית לימודים למוצר. יתכן שהקישור כבר קיים.';
    }

    if (rawMessage.includes('Validation error')) {
      return 'שגיאת אימות - נא לבדוק שכל הפרטים נכונים ולנסות שוב.';
    }

    if (rawMessage.includes('not found')) {
      return 'פריט תכנית הלימודים לא נמצא במערכת.';
    }

    if (rawMessage.includes('access denied')) {
      return 'אין לך הרשאה לבצע פעולה זו.';
    }

    // Return the original message if no specific match
    return rawMessage || 'שגיאה לא צפויה בקישור תכניות לימודים';
  };

  // Load curriculum suggestions when modal opens
  useEffect(() => {
    if (isOpen && product?.id) {
      loadCurriculumSuggestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id]);

  // Reset selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCurriculumItems(new Set());
      setRemovingLinks(new Set());
      setSuggestions(null);
      resetManualBrowsing();
    }
  }, [isOpen]);

  // Check if manual browsing should be enabled
  useEffect(() => {
    if (suggestions && isOpen) {
      const hasNoMetadata = !suggestions.gradeRanges?.length && !suggestions.subjects?.length;
      const hasNoSuggestions = !suggestions.matches?.perfect?.length &&
                              !suggestions.matches?.good?.length &&
                              !suggestions.matches?.partial?.length &&
                              !suggestions.matches?.suggestions?.length;

      if (hasNoMetadata || hasNoSuggestions) {
        loadAvailableOptions();
      }
    }
  }, [suggestions, isOpen]);

  /**
   * Load curriculum suggestions for the product
   */
  const loadCurriculumSuggestions = async () => {
    try {
      setLoading(true);
      ludlog.ui('Loading curriculum suggestions for product:', product.id);
      const response = await apiRequest(`/curriculum-linking/suggestions/${product.id}`);

      ludlog.ui('Curriculum suggestions response:', {
        success: response.success,
        dataKeys: response.data ? Object.keys(response.data) : null,
        hasMatches: !!response.data?.matches,
        hasExistingLinks: !!response.data?.existingLinks
      });

      if (response.success) {
        setSuggestions(response.data);
        ludlog.ui('Curriculum suggestions loaded successfully');
      } else {
        ludlog.ui('Curriculum suggestions response failed:', response);
        showError('Failed to load curriculum suggestions');
      }
    } catch (error) {
      ludlog.ui('Error loading curriculum suggestions:', error);
      showError(formatErrorMessage(error) || 'שגיאה בטעינת הצעות לתכניות לימודים');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load available subjects and grade ranges for manual browsing
   */
  const loadAvailableOptions = async () => {
    try {
      ludlog.ui('Loading manual browsing options...');
      const [subjectsResponse, gradeRangesResponse] = await Promise.all([
        apiRequest('/curriculum-linking/browse?subjects=true'),
        apiRequest('/curriculum-linking/browse?gradeRanges=true')
      ]);

      ludlog.ui('Manual browsing API responses:', {
        subjectsResponse: subjectsResponse.success,
        gradeRangesResponse: gradeRangesResponse.success,
        subjectsData: subjectsResponse.data?.subjects,
        gradeRangesData: gradeRangesResponse.data?.gradeRanges
      });

      if (subjectsResponse.success) {
        setAvailableSubjects(subjectsResponse.data.subjects || []);
      } else {
        ludlog.ui('Subjects response failed:', subjectsResponse);
      }

      if (gradeRangesResponse.success) {
        setAvailableGradeRanges(gradeRangesResponse.data.gradeRanges || []);
      } else {
        ludlog.ui('Grade ranges response failed:', gradeRangesResponse);
      }

      setManualBrowsing(true);
    } catch (error) {
      ludlog.ui('Error loading manual browsing options:', error);
      showError('שגיאה בטעינת אפשרויות חיפוש ידני');
    }
  };

  /**
   * Perform manual curriculum browsing
   */
  const handleManualBrowse = async () => {
    if (!selectedSubject && !selectedGradeRange) {
      showError('נא לבחור מקצוע או כיתה');
      return;
    }

    try {
      setManualLoading(true);
      const params = new URLSearchParams();

      if (selectedSubject && selectedSubject !== 'all') {
        params.append('subject', selectedSubject);
      }

      if (selectedGradeRange) {
        params.append('gradeMin', selectedGradeRange.min);
        params.append('gradeMax', selectedGradeRange.max);
      }

      params.append('limit', '50');

      const response = await apiRequest(`/curriculum-linking/browse?${params.toString()}`);

      if (response.success) {
        const curricula = response.data.curricula || [];

        // Transform curricula to match expected format
        const transformedResults = curricula.flatMap(curriculum =>
          curriculum.items?.map(item => ({
            curriculum,
            curriculumItem: item,
            confidence: 0 // No confidence for manual browsing
          })) || []
        );

        setManualResults(transformedResults);
      } else {
        showError('שגיאה בחיפוש תכניות לימודים');
      }
    } catch (error) {
      ludlog.ui('Error browsing curricula:', error);
      showError(formatErrorMessage(error) || 'שגיאה בחיפוש תכניות לימודים');
    } finally {
      setManualLoading(false);
    }
  };

  /**
   * Reset manual browsing state
   */
  const resetManualBrowsing = () => {
    setManualBrowsing(false);
    setAvailableSubjects([]);
    setAvailableGradeRanges([]);
    setSelectedSubject('all');
    setSelectedGradeRange(null);
    setManualResults([]);
    setManualLoading(false);
  };

  /**
   * Apply selected curriculum links
   */
  const handleApplyLinks = async () => {
    if (selectedCurriculumItems.size === 0) {
      showError('נא לבחור לפחות פריט תכנית לימודים אחד לקישור');
      return;
    }

    try {
      setApplying(true);
      const curriculumItemIds = Array.from(selectedCurriculumItems);

      const response = await apiRequest('/curriculum-linking/apply', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          curriculumItemIds
        })
      });

      if (response.success) {
        const results = response.data;

        // Only show success message if items were actually linked
        if (results.success && results.success.length > 0) {
          showSuccess(`קושרו בהצלחה ${results.success.length} תכניות לימודים`);
        }

        if (results.errors && results.errors.length > 0) {
          showError(`${results.errors.length} קישורים נכשלו. יתכן שהם כבר קיימים.`);
        }

        // If no successes and no errors, show a generic error
        if ((!results.success || results.success.length === 0) &&
            (!results.errors || results.errors.length === 0)) {
          showError('לא ניתן היה לקשר תכניות לימודים. נסה שוב מאוחר יותר.');
        }

        // Refresh suggestions to show updated state
        await loadCurriculumSuggestions();
        setSelectedCurriculumItems(new Set());

        // Notify parent component
        if (onLinksUpdated) {
          onLinksUpdated();
        }
      } else {
        showError('שגיאה בקישור תכניות לימודים');
      }
    } catch (error) {
      ludlog.ui('Error applying curriculum links:', error);
      showError(formatErrorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  /**
   * Remove an existing curriculum link
   */
  const handleRemoveLink = async (curriculumProductId) => {
    try {
      setRemovingLinks(prev => new Set(prev).add(curriculumProductId));

      const response = await apiRequest(`/curriculum-linking/${curriculumProductId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        showSuccess('קישור תכנית לימודים הוסר בהצלחה');

        // Refresh suggestions to show updated state
        await loadCurriculumSuggestions();

        // Notify parent component
        if (onLinksUpdated) {
          onLinksUpdated();
        }
      } else {
        showError('שגיאה בהסרת קישור תכנית לימודים');
      }
    } catch (error) {
      ludlog.ui('Error removing curriculum link:', error);
      showError(formatErrorMessage(error) || 'שגיאה בהסרת קישור תכנית לימודים');
    } finally {
      setRemovingLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(curriculumProductId);
        return newSet;
      });
    }
  };

  /**
   * Toggle curriculum item selection
   */
  const handleToggleSelection = (curriculumItemId) => {
    setSelectedCurriculumItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(curriculumItemId)) {
        newSet.delete(curriculumItemId);
      } else {
        newSet.add(curriculumItemId);
      }
      return newSet;
    });
  };

  /**
   * Select all items in a category
   */
  const handleSelectAll = (items) => {
    const itemIds = items.map(item => item.curriculumItem.id);
    setSelectedCurriculumItems(prev => {
      const newSet = new Set(prev);
      itemIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  /**
   * Get confidence badge variant based on score
   */
  const getConfidenceBadgeVariant = (confidence) => {
    if (confidence >= 80) return 'default'; // High confidence - green
    if (confidence >= 60) return 'secondary'; // Medium confidence - yellow
    return 'outline'; // Low confidence - gray
  };

  /**
   * Get confidence text based on score
   */
  const getConfidenceText = (confidence) => {
    if (confidence >= 80) return 'התאמה גבוהה';
    if (confidence >= 60) return 'התאמה בינונית';
    return 'התאמה חלקית';
  };

  /**
   * Get grade range display text
   */
  const getGradeRangeText = (gradeRanges) => {
    if (!gradeRanges?.length) return 'לא צוין';

    return gradeRanges.map(range =>
      range.min === range.max ?
        `כיתה ${convertGradeToHebrew(range.min)}` :
        `כיתות ${convertGradeToHebrew(range.min)}-${convertGradeToHebrew(range.max)}`
    ).join(', ');
  };

  /**
   * Convert grade number to Hebrew letter
   */
  const convertGradeToHebrew = (grade) => {
    const hebrewGrades = {
      1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו',
      7: 'ז', 8: 'ח', 9: 'ט', 10: 'י', 11: 'יא', 12: 'יב'
    };
    return hebrewGrades[grade] || grade;
  };

  /**
   * Convert subject database key to Hebrew display name
   */
  const getSubjectDisplayName = (subjectKey) => {
    if (!subjectKey) return 'כלל מקצועות';

    // Subject key to Hebrew display name mapping (same as backend)
    const subjectMappings = {
      'hebrew_language': 'לשון והבעה',
      'mathematics': 'מתמטיקה',
      'english_language': 'אנגלית',
      'science': 'מדעים',
      'history': 'היסטוריה',
      'geography': 'גיאוגרפיה',
      'civics': 'אזרחות',
      'bible': 'תנ"ך',
      'talmud': 'תלמוד',
      'art': 'אמנות',
      'music': 'מוזיקה',
      'physical_education': 'חינוך גופני',
      'technology': 'טכנולוגיה',
      'computer_science': 'מדעי המחשב',
      'life_skills': 'כישורי חיים'
    };

    return subjectMappings[subjectKey] || subjectKey;
  };

  /**
   * Render curriculum item card
   */
  const renderCurriculumItemCard = (match, isSelected, showCheckbox = true) => {
    const { curriculum, curriculumItem, confidence } = match;
    const isBeingRemoved = false; // This is for suggestions, not existing links

    return (
      <Card key={curriculumItem.id} className={`transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-between mb-2 flex-row-reverse">
                {confidence && (
                  <Badge variant={getConfidenceBadgeVariant(confidence)} className="mr-2">
                    {confidence}% • {getConfidenceText(confidence)}
                  </Badge>
                )}
                <h4 className="font-medium text-gray-900 truncate text-right">
                  {curriculumItem.study_topic}
                </h4>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2 flex-row-reverse text-right">
                  <span className="text-right">
                    {getSubjectDisplayName(curriculum.subject)} •
                    כיתה {curriculum.is_grade_range ?
                      `${convertGradeToHebrew(curriculum.grade_from)}-${convertGradeToHebrew(curriculum.grade_to)}` :
                      convertGradeToHebrew(curriculum.grade)
                    }
                  </span>
                  <GraduationCap className="w-4 h-4" />
                </div>

                {curriculumItem.description && (
                  <p className="text-gray-500 line-clamp-2 text-right">
                    {curriculumItem.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400 flex-row-reverse">
                  {curriculum.teacher_user_id ? (
                    <span className="text-right">תכנית כיתתית</span>
                  ) : (
                    <span className="text-right">תכנית מערכתית</span>
                  )}
                  {curriculumItem.is_mandatory && (
                    <span className="flex items-center gap-1 flex-row-reverse">
                      <span className="text-right">חובה</span>
                      <Target className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {showCheckbox && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleSelection(curriculumItem.id)}
                disabled={isBeingRemoved}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  /**
   * Render existing curriculum links
   */
  const renderExistingLinks = () => {
    if (!suggestions?.existingLinks?.length) {
      return (
        <div className="text-center py-6 text-gray-500">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-right">אין קישורים לתכניות לימודים עדיין</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {suggestions.existingLinks.map((link) => (
          <Card key={link.id} className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 flex-row-reverse">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveLink(link.id)}
                  disabled={removingLinks.has(link.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {removingLinks.has(link.id) ? (
                    <LudoraLoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex-1 min-w-0 text-right">
                  <h4 className="font-medium text-gray-900 truncate text-right">
                    {link.curriculumItem.study_topic}
                  </h4>
                  <div className="text-sm text-gray-600 mt-1">
                    <div className="flex items-center gap-2 flex-row-reverse text-right">
                      <span className="text-right">
                        {getSubjectDisplayName(link.curriculumItem.curriculum.subject)} •
                        כיתה {link.curriculumItem.curriculum.is_grade_range ?
                          `${convertGradeToHebrew(link.curriculumItem.curriculum.grade_from)}-${convertGradeToHebrew(link.curriculumItem.curriculum.grade_to)}` :
                          convertGradeToHebrew(link.curriculumItem.curriculum.grade)
                        }
                      </span>
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * Render suggestions category
   */
  const renderSuggestionsCategory = (title, items, categoryColor = 'blue') => {
    if (!items?.length) return null;

    const colorClasses = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        icon: 'text-blue-600',
        iconBg: 'bg-blue-100'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        icon: 'text-green-600',
        iconBg: 'bg-green-100'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-900',
        icon: 'text-yellow-600',
        iconBg: 'bg-yellow-100'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        icon: 'text-purple-600',
        iconBg: 'bg-purple-100'
      }
    };

    const colors = colorClasses[categoryColor] || colorClasses.blue;

    return (
      <div className="space-y-4">
        <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 mobile-safe-container`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:flex-row-reverse">
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectAll(items)}
                className={`border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 whitespace-nowrap`}
              >
                בחר הכל ({items.length})
              </Button>
            )}

            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="text-right">
                <h4 className={`font-semibold ${colors.text} text-right`}>
                  {title}
                </h4>
                <p className="text-sm text-gray-600 text-right">
                  {items.length} תכניות זמינות
                </p>
              </div>
              <div className={`flex items-center justify-center w-8 h-8 ${colors.iconBg} rounded-lg`}>
                <Target className={`w-4 h-4 ${colors.icon}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="mobile-safe-grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((match) => renderCurriculumItemCard(
            match,
            selectedCurriculumItems.has(match.curriculumItem.id)
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl h-[95vh] flex flex-col p-0 gap-0 mobile-safe-container" dir="rtl">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-3 text-lg md:text-xl font-semibold text-right">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-blue-900 text-right">קישור לתכניות לימודים</div>
              <div className="text-sm font-normal text-gray-600 mobile-truncate mt-1 text-right">
                {product?.title}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <LudoraLoadingSpinner
                size="lg"
                message="טוען הצעות לתכניות לימודים..."
              />
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 mobile-safe-container">
            <div className="p-6 space-y-8 mobile-padding">
              {/* Product metadata display */}
              {suggestions && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-3 text-blue-900 text-right">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-200 rounded-lg">
                        {product.type_attributes?.is_bundle ? (
                          <Package className="w-4 h-4 text-blue-700" />
                        ) : (
                          <Target className="w-4 h-4 text-blue-700" />
                        )}
                      </div>
                      מאפייני המוצר
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="mobile-safe-grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-blue-100 text-right">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-sm font-medium text-gray-600 mb-1 text-right">כיתות יעד</div>
                          <div className="text-base font-semibold text-gray-900 mobile-safe-text text-right">
                            {getGradeRangeText(suggestions.gradeRanges)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-blue-100 text-right">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-sm font-medium text-gray-600 mb-1 text-right">מקצועות</div>
                          <div className="text-base font-semibold text-gray-900 mobile-safe-text text-right">
                            {suggestions.subjects?.length ? suggestions.subjects.join(', ') : 'לא צוין'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Existing curriculum links */}
              <div>
                <div className="flex items-center gap-3 mb-6 flex-row-reverse">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 text-right">תכניות לימודים מקושרות</h3>
                    <p className="text-sm text-gray-600 mt-1 text-right">
                      {suggestions?.existingLinks?.length || 0} תכניות מקושרות כרגע
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                {renderExistingLinks()}
              </div>

              <Separator />

              {/* Manual browsing section */}
              {manualBrowsing && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mobile-safe-container">
                    <div className="flex items-center gap-3 mb-4 flex-row-reverse">
                      <div className="text-right">
                        <h3 className="font-semibold text-lg text-gray-900 text-right">חיפוש ידני בתכניות לימודים</h3>
                        <p className="text-sm text-gray-600 mt-1 text-right">
                          חפש תכניות לימודים לפי מקצוע וכיתה
                        </p>
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-yellow-200 rounded-lg">
                        <Search className="w-5 h-5 text-yellow-700" />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-yellow-100 mb-6">
                      <p className="text-sm text-gray-700 flex items-center gap-2 flex-row-reverse text-right">
                        <span className="mobile-safe-text text-right">
                          המוצר לא כולל מידע על כיתות או מקצוע. בחר מקצוע וכיתה לחיפוש תכניות מתאימות.
                        </span>
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      </p>
                    </div>

                    <div className="mobile-safe-grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Subject selector */}
                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                          בחר מקצוע
                        </label>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="בחר מקצוע..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">כל המקצועות</SelectItem>
                            {availableSubjects.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Grade range selector */}
                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                          בחר כיתה
                        </label>
                        <Select
                          value={selectedGradeRange ? `${selectedGradeRange.min}-${selectedGradeRange.max}` : 'all'}
                          onValueChange={(value) => {
                            if (value && value !== "all") {
                              const [min, max] = value.split('-').map(Number);
                              setSelectedGradeRange({ min, max });
                            } else {
                              setSelectedGradeRange(null);
                            }
                          }}
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="בחר כיתה..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">כל הכיתות</SelectItem>
                            {availableGradeRanges.map((range) => (
                              <SelectItem
                                key={`${range.min}-${range.max}`}
                                value={`${range.min}-${range.max}`}
                              >
                                {range.min === range.max ?
                                  `כיתה ${convertGradeToHebrew(range.min)}` :
                                  `כיתות ${convertGradeToHebrew(range.min)}-${convertGradeToHebrew(range.max)}`
                                }
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:flex-row-reverse">
                      {manualResults.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={resetManualBrowsing}
                          className="flex-1 sm:flex-none border-gray-300 text-gray-700 hover:bg-gray-50 py-3 px-6 rounded-lg font-medium text-right"
                          size="lg"
                        >
                          נקה חיפוש
                        </Button>
                      )}

                      <Button
                        onClick={handleManualBrowse}
                        disabled={manualLoading || (!selectedSubject && !selectedGradeRange)}
                        className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-6 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                        size="lg"
                      >
                        {manualLoading ? (
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <span>מחפש...</span>
                            <LudoraLoadingSpinner size="sm" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <span>חפש תכניות לימודים</span>
                            <Search className="w-5 h-5" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Manual browsing results */}
                  {manualResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2 flex-row-reverse text-right">
                        <span>תוצאות חיפוש ידני ({manualResults.length})</span>
                        <Filter className="w-4 h-4" />
                      </h4>

                      <div className="space-y-2">
                        {manualResults.map((match) => renderCurriculumItemCard(
                          match,
                          selectedCurriculumItems.has(match.curriculumItem.id)
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Curriculum suggestions */}
              {suggestions?.matches && (
                <div className="space-y-8">
                  <div className="flex items-center gap-3 flex-row-reverse">
                    <div className="text-right">
                      <h3 className="font-semibold text-lg text-gray-900 text-right">הצעות לקישור</h3>
                      <p className="text-sm text-gray-600 mt-1 text-right">
                        בחר תכניות לימודים מתאימות למוצר שלך
                      </p>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                      <Info className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>

                  {renderSuggestionsCategory(
                    "התאמות מושלמות",
                    suggestions.matches.perfect,
                    'green'
                  )}

                  {renderSuggestionsCategory(
                    "התאמות טובות",
                    suggestions.matches.good,
                    'blue'
                  )}

                  {renderSuggestionsCategory(
                    "התאמות חלקיות",
                    suggestions.matches.partial,
                    'yellow'
                  )}

                  {renderSuggestionsCategory(
                    "הצעות נוספות",
                    suggestions.matches.suggestions,
                    'purple'
                  )}

                  {/* No suggestions message */}
                  {!suggestions.matches.perfect?.length &&
                   !suggestions.matches.good?.length &&
                   !suggestions.matches.partial?.length &&
                   !suggestions.matches.suggestions?.length && (
                    <div className="text-center py-8 text-gray-500">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-right">לא נמצאו הצעות לתכניות לימודים המתאימות למאפייני המוצר</p>
                      <p className="text-sm mt-1 text-right">נסה להוסיף כיתות או מקצוע למוצר</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-shrink-0 border-t border-gray-100 p-6 bg-gray-50">
          <div className="w-full mobile-safe-flex flex-col sm:flex-row gap-4 sm:flex-row-reverse">
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 min-w-0 sm:flex-row-reverse">
              <Button
                onClick={handleApplyLinks}
                disabled={selectedCurriculumItems.size === 0 || applying}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {applying ? (
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span>מקשר...</span>
                    <LudoraLoadingSpinner size="sm" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="mobile-safe-text">
                      {selectedCurriculumItems.size > 0
                        ? `קשר ${selectedCurriculumItems.size} תכניות`
                        : 'בחר תכניות לקישור'
                      }
                    </span>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none border-gray-300 text-gray-700 hover:bg-gray-100 py-3 px-6 rounded-lg font-medium"
                size="lg"
              >
                סגור
              </Button>
            </div>

            {/* Selection count - mobile first */}
            <div className="flex-1 text-center sm:text-left">
              {selectedCurriculumItems.size > 0 ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 flex-row-reverse">
                  <span className="text-sm font-medium text-blue-900">
                    נבחרו {selectedCurriculumItems.size} תכניות לקישור
                  </span>
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-right sm:text-left">
                  בחר תכניות לימודים מהרשימה למעלה
                </p>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}