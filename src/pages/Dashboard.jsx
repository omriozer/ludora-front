import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { getApiBase } from "@/utils/api.js";
import { apiRequest } from "@/services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NAVIGATION_KEYS, SYSTEM_KEYS, getSetting } from '@/constants/settings';
import {
  Crown,
  Gift,
  Plus,
  Edit3,
  Save,
  X,
  Trash2,
  GripVertical,
  Settings,
  Maximize2,
  Minimize2,
  Square
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import PurchaseHistory from "@/components/PurchaseHistory";
import LessonModeWidget from "@/components/dashboard/widgets/LessonModeWidget";
import DiceRollerWidget from "@/components/dashboard/widgets/DiceRollerWidget";
import ColorWheelWidget from "@/components/dashboard/widgets/ColorWheelWidget";
import TableDisplayWidget from "@/components/dashboard/widgets/TableDisplayWidget";
import MyProductsWidget from "@/components/dashboard/widgets/MyProductsWidget";
import GameSharingWidget from "@/components/dashboard/widgets/GameSharingWidget";
import SubscriptionUsageDashboard from "@/components/subscription/SubscriptionUsageDashboard";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { ludlog, luderror } from '@/lib/ludlog';
import { toast } from "@/components/ui/use-toast";
import "@/styles/dashboard.css";
import SEOHead from '@/components/SEOHead';

// Widget picker modal component
const WidgetPickerModal = ({ isOpen, onClose, availableWidgets, onAddWidget, onRemoveWidget, userWidgets }) => {
  if (!isOpen) return null;

  // Check if a widget is already added
  const isWidgetAdded = (widgetType) => {
    return userWidgets.some(widget => widget.type === widgetType);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 mobile-padding mobile-safe-container">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto mobile-safe-container">
        <div className="mobile-padding border-b mobile-safe-container">
          <div className="mobile-safe-flex items-center justify-between mobile-gap">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mobile-safe-text">נהל ווידג'טים</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2 text-sm md:text-base mobile-safe-text">הוסף או הסר ווידג'טים מהדאשבורד שלך</p>
        </div>

        <div className="mobile-padding mobile-safe-container">
          <div className="mobile-safe-grid grid-cols-1 mobile-gap">
            {Object.values(availableWidgets).map((widget) => {
              const isAdded = isWidgetAdded(widget.id);
              const addedWidget = userWidgets.find(w => w.type === widget.id);

              return (
                <div
                  key={widget.id}
                  className={`border rounded-lg mobile-padding transition-colors mobile-safe-card ${
                    isAdded
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="mobile-safe-flex flex-col sm:flex-row sm:items-start sm:justify-between mobile-gap">
                    <div className="flex-1 min-w-0 mobile-safe-container">
                      <h3 className="font-semibold text-gray-900 mb-1 mobile-safe-text mobile-truncate">{widget.name}</h3>
                      <p className="text-xs md:text-sm text-gray-600 mb-3 mobile-safe-text">{widget.description}</p>
                      <div className="mobile-safe-flex items-center mobile-gap flex-wrap">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">
                          {widget.category === 'purchases' ? 'רכישות' :
                           widget.category === 'tools' ? 'כלים' :
                           widget.category === 'classroom' ? 'כיתה' :
                           widget.category}
                        </span>
                        {isAdded && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded whitespace-nowrap">
                            ✓ נוסף
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto">
                      {isAdded ? (
                        <Button
                          onClick={() => onRemoveWidget(addedWidget.id)}
                          variant="destructive"
                          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm px-2 md:px-3"
                          size="sm"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                          הסר
                        </Button>
                      ) : (
                        <Button
                          onClick={() => onAddWidget(widget.id)}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-2 md:px-3"
                          size="sm"
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                          הוסף
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Widget component renderer
const WidgetRenderer = ({ widget, isEditMode, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, user, onResize }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onRemove(widget.id);
    setShowDeleteConfirm(false);
  };

  const handleSizeChange = (newSize) => {
    onResize(widget.id, newSize);
  };

  // Widget size configuration
  const getWidgetSizeConfig = (widgetType) => {
    const sizeConfigs = {
      'purchase-history': ['medium', 'large'], // Only medium and large
      'lesson-mode': ['small', 'medium'],      // Small and medium only
      'dice-roller': ['small', 'medium'],      // Small and medium only
      'color-wheel': ['small', 'medium'],      // Small and medium only
      'table-display': ['medium', 'large'],    // Medium and large only
      'my-products': ['small', 'medium', 'large'], // All sizes
      'game-sharing': ['small', 'medium'],     // Small and medium only
      'subscription-status': ['medium', 'large'] // Medium and large only
    };

    return sizeConfigs[widgetType] || ['medium']; // Default to medium only
  };

  const availableSizes = getWidgetSizeConfig(widget.type);
  const currentSize = widget.size || 'medium';

  const getSizeIcon = (size) => {
    switch (size) {
      case 'small': return Minimize2;
      case 'large': return Maximize2;
      default: return Square;
    }
  };

  const getSizeLabel = (size) => {
    switch (size) {
      case 'small': return 'קטן';
      case 'large': return 'גדול';
      default: return 'בינוני';
    }
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'purchase-history':
        return (
          <div className="h-full">
            <PurchaseHistory
              user={user}
              title={widget.settings?.title || "היסטוריית רכישות"}
              showHeader={true}
              className="h-full"
            />
          </div>
        );
      case 'lesson-mode':
        return (
          <Card className="h-full border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0 h-full">
              <LessonModeWidget
                widgetId={widget.id}
                settings={widget.settings}
              />
            </CardContent>
          </Card>
        );
      case 'dice-roller':
        return (
          <Card className="h-full border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0 h-full">
              <DiceRollerWidget
                widgetId={widget.id}
                settings={widget.settings}
              />
            </CardContent>
          </Card>
        );
      case 'color-wheel':
        return (
          <Card className="h-full border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0 h-full">
              <ColorWheelWidget
                widgetId={widget.id}
                settings={widget.settings}
              />
            </CardContent>
          </Card>
        );
      case 'table-display':
        return (
          <Card className="h-full border-0 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0 h-full">
              <TableDisplayWidget
                widgetId={widget.id}
                settings={widget.settings}
              />
            </CardContent>
          </Card>
        );
      case 'my-products':
        return (
          <Card className="h-full border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0 h-full">
              <MyProductsWidget
                widgetId={widget.id}
                settings={widget.settings}
                size={widget.size || 'medium'}
              />
            </CardContent>
          </Card>
        );
      case 'game-sharing':
        return (
          <Card className="h-full border-0 bg-gradient-to-br from-teal-50 to-blue-50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-0 h-full">
              <GameSharingWidget
                widgetId={widget.id}
                settings={widget.settings}
              />
            </CardContent>
          </Card>
        );
      case 'subscription-status':
        return (
          <Card className="h-full border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4 h-full">
              <SubscriptionUsageDashboard
                currentUser={user}
                className="h-full"
                showTitle={false}
                compact={widget.size === 'medium'}
              />
            </CardContent>
          </Card>
        );
      default:
        return (
          <Card className="h-full border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg">
            <CardContent className="p-6 text-center h-full flex items-center justify-center">
              <p className="text-red-600 font-medium">ווידג'ט לא זמין: {widget.type}</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className={`
      relative w-full h-full min-h-[280px] mobile-safe-container
      ${isEditMode ? 'widget-edit-mode' : ''}
      widget-item transition-all duration-200 ease-in-out
      ${isEditMode ? 'hover:scale-[1.02] hover:shadow-xl hover:z-10' : ''}
    `}>
      {isEditMode && (
        <div className="absolute top-2 md:top-3 left-2 md:left-3 z-20 mobile-safe-flex items-center mobile-gap bg-white/95 backdrop-blur-sm rounded-lg md:rounded-xl shadow-lg border border-gray-200/50 mobile-padding">
          {/* Drag Handle */}
          <div
            className="cursor-move p-1 text-gray-400 hover:text-gray-600 transition-colors drag-handle"
            title="גרור ווידג'ט"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3 md:w-4 md:h-4" />
          </div>

          {/* Size Controls */}
          {availableSizes.length > 1 && (
            <div className="mobile-safe-flex items-center gap-0.5 md:gap-1 bg-gray-100 rounded-md md:rounded-lg p-0.5 md:p-1">
              {availableSizes.map((size) => {
                const Icon = getSizeIcon(size);
                return (
                  <Button
                    key={size}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSizeChange(size)}
                    className={`h-5 w-5 md:h-6 md:w-6 p-0 rounded ${
                      currentSize === size
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                    }`}
                    title={getSizeLabel(size)}
                  >
                    <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  </Button>
                );
              })}
            </div>
          )}

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-6 w-6 md:h-8 md:w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md md:rounded-lg"
            title="הסר ווידג'ט"
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
          </Button>

          {/* Size Indicator - Hidden on very small screens */}
          <div className="hidden xs:block text-xs text-gray-500 px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-100 rounded-md whitespace-nowrap">
            {getSizeLabel(currentSize)}
          </div>
        </div>
      )}

      <div className={`
        w-full h-full
        transition-all duration-300 ease-in-out
        ${isEditMode ? 'ring-2 ring-blue-300/30 ring-offset-2 rounded-xl shadow-lg' : 'shadow-md hover:shadow-lg'}
        ${isEditMode ? 'transform' : ''}
      `}>
        {renderWidgetContent()}
      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="הסר ווידג'ט"
        message={`האם אתה בטוח שברצונך להסיר את הווידג'ט "${widget.settings?.title || widget.type}"?`}
        confirmText="הסר"
        cancelText="ביטול"
        variant="destructive"
      />
    </div>
  );
};

export default function Dashboard() {
  const { currentUser, isLoading: userLoading, settings: globalSettings, canUserSeeNavItem } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [availableWidgets, setAvailableWidgets] = useState({});
  const [userWidgets, setUserWidgets] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Filter widgets based on visibility settings
  const filterWidgetsByVisibility = useCallback((widgets) => {
    // Check games visibility permission using centralized function
    const gamesVisibility = getSetting(globalSettings, NAVIGATION_KEYS.NAV_GAMES_VISIBILITY, 'public');
    const canSeeGames = canUserSeeNavItem(gamesVisibility);

    const filteredWidgets = { ...widgets };

    // Filter out game-sharing widget if user cannot see games navigation
    if (!canSeeGames && filteredWidgets['game-sharing']) {
      delete filteredWidgets['game-sharing'];
    }

    return filteredWidgets;
  }, [globalSettings, canUserSeeNavItem]);

  // Load available widgets from API
  const loadAvailableWidgets = useCallback(async () => {
    try {
      ludlog.api('[Dashboard] Loading available widgets...');
      const data = await apiRequest('/dashboard/widgets');
      ludlog.api('[Dashboard] Available widgets loaded:', { data: data });

      if (data.success) {
        const widgets = data.data || {};

        // Add My Products widget if it doesn't exist in the API
        if (!widgets['my-products']) {
          widgets['my-products'] = {
            id: 'my-products',
            name: 'המוצרים שלי',
            description: 'גישה מהירה למוצרים שרכשת ללא פרטי רכישה',
            category: 'purchases',
            icon: 'package',
            defaultSettings: {
              title: 'המוצרים שלי',
              size: 'medium'
            }
          };
        }

        // Add Subscription Status widget if it doesn't exist in the API and subscription system is enabled
        const isSubscriptionSystemEnabled = getSetting(globalSettings, SYSTEM_KEYS.SUBSCRIPTION_SYSTEM_ENABLED, false);
        if (!widgets['subscription-status'] && isSubscriptionSystemEnabled) {
          widgets['subscription-status'] = {
            id: 'subscription-status',
            name: 'סטטוס מנוי',
            description: 'עקוב אחרי השימוש שלך בגבולות המנוי החודשיים',
            category: 'subscriptions',
            icon: 'crown',
            defaultSettings: {
              title: 'סטטוס מנוי',
              size: 'medium'
            }
          };
        }

        // Filter out game-sharing widget based on NAV_GAMES_VISIBILITY setting
        const filteredWidgets = filterWidgetsByVisibility(widgets);
        setAvailableWidgets(filteredWidgets);
      }
    } catch (error) {
      luderror.validation('[Dashboard] Error loading available widgets:', error);

      // Fallback: provide basic widgets if API fails
      const fallbackWidgets = {
        'lesson-mode': {
          id: 'lesson-mode',
          name: 'מצב שיעור',
          description: 'כלים למצב מצגת עם טיימר ואפקטים',
          category: 'classroom'
        },
        'dice-roller': {
          id: 'dice-roller',
          name: 'קוביות',
          description: 'זריקת קוביות אקראיות לפעילויות',
          category: 'tools'
        },
        'color-wheel': {
          id: 'color-wheel',
          name: 'גלגל צבעים',
          description: 'בחירת צבע אקראי מגלגל מסתובב',
          category: 'tools'
        },
        'table-display': {
          id: 'table-display',
          name: 'הצגת טבלה',
          description: 'טבלה לארגון מידע עם יכולות CSV',
          category: 'tools'
        },
        'my-products': {
          id: 'my-products',
          name: 'המוצרים שלי',
          description: 'גישה מהירה למוצרים שרכשת ללא פרטי רכישה',
          category: 'purchases'
        },
        'purchase-history': {
          id: 'purchase-history',
          name: 'היסטוריית רכישות',
          description: 'צפייה מפורטת בהיסטוריית הרכישות שלך',
          category: 'purchases'
        },
        'game-sharing': {
          id: 'game-sharing',
          name: 'שיתוף המשחקים',
          description: 'שתף את קטלוג המשחקים שלך עם תלמידים',
          category: 'classroom'
        }
      };

      // Add subscription widget only if subscription system is enabled
      const isSubscriptionSystemEnabled = getSetting(globalSettings, SYSTEM_KEYS.SUBSCRIPTION_SYSTEM_ENABLED, false);
      if (isSubscriptionSystemEnabled) {
        fallbackWidgets['subscription-status'] = {
          id: 'subscription-status',
          name: 'סטטוס מנוי',
          description: 'עקוב אחרי השימוש שלך בגבולות המנוי החודשיים',
          category: 'subscriptions'
        };
      }

      // Filter fallback widgets as well
      const filteredFallbackWidgets = filterWidgetsByVisibility(fallbackWidgets);
      setAvailableWidgets(filteredFallbackWidgets);

      toast({
        title: "טעינה חלקית",
        description: "טענו ווידג'טים בסיסיים - חלק מהתכונות עלולות להיות מוגבלות",
        variant: "default"
      });
    }
  }, []);

  // Load user's dashboard configuration
  const loadDashboardConfig = useCallback(async () => {
    try {
      ludlog.api('[Dashboard] Loading user dashboard config...');
      const data = await apiRequest('/dashboard/config');
      ludlog.api('[Dashboard] Dashboard config loaded:', { data: data });

      if (data.success) {
        const config = data.data || { widgets: [] };
        // Sort widgets by order
        const sortedWidgets = config.widgets.sort((a, b) => a.order - b.order);

        // Filter widgets based on visibility settings
        const visibleWidgets = sortedWidgets.filter(widget => {
          // Check if this widget type should be visible
          if (widget.type === 'game-sharing') {
            const gamesVisibility = getSetting(globalSettings, NAVIGATION_KEYS.NAV_GAMES_VISIBILITY, 'public');
            return canUserSeeNavItem(gamesVisibility);
          }

          // Check if subscription widget should be visible
          if (widget.type === 'subscription-status') {
            return getSetting(globalSettings, SYSTEM_KEYS.SUBSCRIPTION_SYSTEM_ENABLED, false);
          }

          // For other widget types, allow them (can add more checks later)
          return true;
        });

        setUserWidgets(visibleWidgets);
      }
    } catch (error) {
      luderror.validation('[Dashboard] Error loading dashboard config:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את תצורת הדאשבורד",
        variant: "destructive"
      });
    }
  }, [globalSettings, canUserSeeNavItem]);

  // Save dashboard configuration
  const saveDashboardConfig = useCallback(async (widgets) => {
    try {
      ludlog.api('[Dashboard] Saving dashboard config:', { data: widgets });
      const data = await apiRequest('/dashboard/config', {
        method: 'PUT',
        body: JSON.stringify({ widgets })
      });
      ludlog.general('[Dashboard] Dashboard config saved:', { data: data });

      if (!data.success) {
        throw new Error(data.message || 'Failed to save dashboard config');
      }

      toast({
        title: "נשמר",
        description: "תצורת הדאשבורד נשמרה בהצלחה",
        variant: "default"
      });
    } catch (error) {
      luderror.validation('[Dashboard] Error saving dashboard config:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לשמור את תצורת הדאשבורד",
        variant: "destructive"
      });
      throw error;
    }
  }, []);

  // Load initial data
  const loadDashboardData = useCallback(async () => {
    try {
      // Load available widgets and user config in parallel
      await Promise.all([
        loadAvailableWidgets(),
        loadDashboardConfig()
      ]);
    } catch (error) {
      luderror.validation("Error loading dashboard data:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את נתוני הדאשבורד",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadAvailableWidgets, loadDashboardConfig]);

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadDashboardData();
    }
  }, [loadDashboardData, userLoading, currentUser]);

  // Add widget handler
  const handleAddWidget = async (widgetType) => {
    try {
      ludlog.api('[Dashboard] Adding widget:', { data: widgetType });
      const data = await apiRequest('/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({ type: widgetType })
      });
      ludlog.general('[Dashboard] Widget added:', { data: data });

      if (data.success) {
        // Reload dashboard config to get updated widgets
        await loadDashboardConfig();
        setShowWidgetPicker(false);

        toast({
          title: "ווידג'ט נוסף",
          description: "הווידג'ט נוסף בהצלחה לדאשבורד",
          variant: "default"
        });
      }
    } catch (error) {
      luderror.validation('[Dashboard] Error adding widget:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להוסיף את הווידג'ט",
        variant: "destructive"
      });
    }
  };

  // Remove widget handler
  const handleRemoveWidget = async (widgetId) => {
    try {
      ludlog.api('[Dashboard] Removing widget:', { data: widgetId });
      const data = await apiRequest(`/dashboard/widgets/${widgetId}`, {
        method: 'DELETE'
      });
      ludlog.general('[Dashboard] Widget removed:', { data: data });

      if (data.success) {
        // Reload dashboard config to get updated widgets
        await loadDashboardConfig();

        toast({
          title: "ווידג'ט הוסר",
          description: "הווידג'ט הוסר בהצלחה מהדאשבורד",
          variant: "default"
        });
      }
    } catch (error) {
      luderror.validation('[Dashboard] Error removing widget:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להסיר את הווידג'ט",
        variant: "destructive"
      });
    }
  };

  // Move widget up/down
  const handleMoveWidget = async (widgetId, direction) => {
    const currentIndex = userWidgets.findIndex(w => w.id === widgetId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= userWidgets.length) return;

    // Create new array with swapped positions
    const newWidgets = [...userWidgets];
    [newWidgets[currentIndex], newWidgets[newIndex]] = [newWidgets[newIndex], newWidgets[currentIndex]];

    // Update order values
    newWidgets.forEach((widget, index) => {
      widget.order = index;
    });

    try {
      // Save the new order
      await saveDashboardConfig(newWidgets);
      setUserWidgets(newWidgets);
    } catch (error) {
      // Error handling is in saveDashboardConfig
    }
  };

  // Resize widget
  const handleResizeWidget = async (widgetId, newSize) => {
    const updatedWidgets = userWidgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, size: newSize }
        : widget
    );

    try {
      await saveDashboardConfig(updatedWidgets);
      setUserWidgets(updatedWidgets);

      toast({
        title: "גודל ווידג'ט עודכן",
        description: `גודל הווידג'ט שונה ל${newSize === 'small' ? 'קטן' : newSize === 'large' ? 'גדול' : 'בינוני'}`,
        variant: "default"
      });
    } catch (error) {
      // Error handling is in saveDashboardConfig
    }
  };

  // Save edit mode changes
  const handleSaveChanges = () => {
    setIsEditMode(false);
    toast({
      title: "שינויים נשמרו",
      description: "השינויים בדאשבורד נשמרו בהצלחה",
      variant: "default"
    });
  };

  // Helper function to determine widget grid span based on widget type and size
  const getWidgetGridSpan = (widgetType, size = 'medium') => {
    const sizeToSpanMap = {
      small: 'col-span-1',                           // Small = 1 column
      medium: 'col-span-1 md:col-span-2',           // Medium = 1-2 columns
      large: 'col-span-1 md:col-span-2 xl:col-span-3' // Large = 1-3 columns
    };

    // Special cases for certain widgets
    const specialCases = {
      'purchase-history': {
        medium: 'col-span-1 md:col-span-2',
        large: 'col-span-1 md:col-span-2 xl:col-span-3'
      },
      'table-display': {
        medium: 'col-span-1 md:col-span-2',
        large: 'col-span-1 md:col-span-2 xl:col-span-3'
      },
      'my-products': {
        small: 'col-span-1',
        medium: 'col-span-1 md:col-span-2',
        large: 'col-span-1 md:col-span-2 xl:col-span-3'
      },
      'subscription-status': {
        medium: 'col-span-1 md:col-span-2',
        large: 'col-span-1 md:col-span-2 xl:col-span-3'
      }
    };

    // Check for special cases first
    if (specialCases[widgetType] && specialCases[widgetType][size]) {
      return specialCases[widgetType][size];
    }

    // Use general size mapping
    return sizeToSpanMap[size] || sizeToSpanMap.medium;
  };

  // Drag and Drop handlers
  const handleDragStart = (e, widget, index) => {
    setDraggedWidget({ widget, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widget.id);

    // Add visual feedback
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedWidget(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedWidget || draggedWidget.index === dropIndex) {
      setDraggedWidget(null);
      return;
    }

    // Create new widgets array with reordered items
    const newWidgets = [...userWidgets];
    const [draggedItem] = newWidgets.splice(draggedWidget.index, 1);
    newWidgets.splice(dropIndex, 0, draggedItem);

    // Update order values
    newWidgets.forEach((widget, index) => {
      widget.order = index;
    });

    try {
      // Save the new order
      await saveDashboardConfig(newWidgets);
      setUserWidgets(newWidgets);

      toast({
        title: "סדר הווידג'טים עודכן",
        description: "סדר הווידג'טים נשמר בהצלחה",
        variant: "default"
      });
    } catch (error) {
      // Error handling is in saveDashboardConfig
    }

    setDraggedWidget(null);
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <LudoraLoadingSpinner
          message="טוען דאשבורד..."
          size="lg"
        />
      </div>
    );
  }

  return (
    <>
      <SEOHead title="דאשבורד" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 mobile-padding-y mobile-no-scroll-x mobile-safe-container">
      <div className="max-w-6xl mx-auto mobile-padding-x mobile-safe-container">

        {/* Header Section */}
        <div className="mobile-safe-flex flex-col sm:flex-row sm:items-center sm:justify-between mobile-gap mb-6 md:mb-8 mobile-no-scroll-x">
          {/* Welcome message */}
          <div className="text-right mobile-safe-container flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mobile-safe-text">
              שלום, {currentUser?.display_name || currentUser?.full_name} 👋
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 mobile-safe-text">הדאשבורד האישי שלך</p>
          </div>

          {/* Actions */}
          <div className="mobile-safe-flex items-center mobile-gap flex-shrink-0">
            {userWidgets.length > 0 && (
              <>
                {!isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                    size="sm"
                  >
                    <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">עריכה</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveChanges}
                    className="flex items-center gap-1 md:gap-2 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm px-2 md:px-3"
                    size="sm"
                  >
                    <Save className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">שמור</span>
                  </Button>
                )}
              </>
            )}

            <Button
              onClick={() => setShowWidgetPicker(true)}
              className="flex items-center gap-1 md:gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-2 md:px-3"
              size="sm"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden xs:inline">הוסף ווידג'ט</span>
              <span className="xs:hidden">הוסף</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        {userWidgets.length === 0 ? (
          /* Empty State */
          <div className="text-center mobile-padding-y mobile-safe-container">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl mobile-padding md:p-12 shadow-xl border border-gray-200/50 mobile-safe-card">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
                <Settings className="w-8 h-8 md:w-12 md:h-12 text-white" />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4 mobile-safe-text">
                התאם את הדאשבורד שלך
              </h2>

              <p className="text-gray-600 text-sm md:text-lg leading-relaxed max-w-2xl mx-auto mb-6 md:mb-8 mobile-safe-text mobile-padding-x">
                הוסף ווידג'טים כדי ליצור דאשבורד מותאם אישית עם כל המידע והכלים שאתה צריך.
                <br className="hidden md:block" />
                <span className="md:hidden"> </span>
                התחל על ידי לחיצה על כפתור "הוסף ווידג'ט" למעלה.
              </p>

              <Button
                onClick={() => setShowWidgetPicker(true)}
                size="default"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base px-4 md:px-6 py-2 md:py-3"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                הוסף ווידג'ט ראשון
              </Button>
            </div>
          </div>
        ) : (
          /* Modern Responsive Grid Layout */
          <div className="dashboard-grid mobile-safe-grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mobile-gap auto-rows-min mobile-safe-container">
            {userWidgets.map((widget, index) => (
              <div
                key={widget.id}
                className={`
                  widget-container
                  ${getWidgetGridSpan(widget.type, widget.size || 'medium')}
                  ${isEditMode ? 'edit-mode' : ''}
                  ${dragOverIndex === index ? 'drag-over' : ''}
                  ${isEditMode ? 'cursor-move' : ''}
                  transition-all duration-200 ease-in-out
                `}
                data-widget-id={widget.id}
                data-widget-type={widget.type}
                data-widget-size={widget.size || 'medium'}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, widget, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <WidgetRenderer
                  widget={widget}
                  isEditMode={isEditMode}
                  onRemove={handleRemoveWidget}
                  onResize={handleResizeWidget}
                  onMoveUp={() => handleMoveWidget(widget.id, 'up')}
                  onMoveDown={() => handleMoveWidget(widget.id, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < userWidgets.length - 1}
                  user={currentUser}
                />
              </div>
            ))}
          </div>
        )}

        {/* Widget Picker Modal */}
        <WidgetPickerModal
          isOpen={showWidgetPicker}
          onClose={() => setShowWidgetPicker(false)}
          availableWidgets={availableWidgets}
          onAddWidget={handleAddWidget}
          onRemoveWidget={handleRemoveWidget}
          userWidgets={userWidgets}
        />
      </div>
    </div>
    </>
  );
}