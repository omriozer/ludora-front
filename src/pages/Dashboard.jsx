import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/services/entities";
import { getApiBase } from "@/utils/api.js";
import { apiRequest } from "@/services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Gift,
  Plus,
  Edit3,
  Save,
  X,
  Trash2,
  GripVertical,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import PurchaseHistory from "@/components/PurchaseHistory";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { clog, cerror } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

// Widget picker modal component
const WidgetPickerModal = ({ isOpen, onClose, availableWidgets, onAddWidget }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">הוסף ווידג'ט</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">בחר ווידג'ט להוספה ללוח המחוונים שלך</p>
        </div>

        <div className="p-6">
          <div className="grid gap-4">
            {Object.values(availableWidgets).map((widget) => (
              <div
                key={widget.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{widget.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{widget.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {widget.category === 'purchases' ? 'רכישות' : widget.category}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => onAddWidget(widget.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Widget component renderer
const WidgetRenderer = ({ widget, isEditMode, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, user }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onRemove(widget.id);
    setShowDeleteConfirm(false);
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'purchase-history':
        return (
          <PurchaseHistory
            user={user}
            title={widget.settings?.title || "היסטוריית רכישות"}
            showHeader={true}
            className=""
          />
        );
      default:
        return (
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <p className="text-red-600">ווידג'ט לא זמין: {widget.type}</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="relative">
      {isEditMode && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-white rounded-lg shadow-lg border p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="הסר ווידג'ט"
          >
            <Trash2 className="w-3 h-3" />
          </Button>

          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="h-4 w-6 p-0 text-gray-600 hover:text-gray-800 disabled:opacity-30"
              title="הזז למעלה"
            >
              <GripVertical className="w-3 h-3 rotate-90" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="h-4 w-6 p-0 text-gray-600 hover:text-gray-800 disabled:opacity-30"
              title="הזז למטה"
            >
              <GripVertical className="w-3 h-3 -rotate-90" />
            </Button>
          </div>
        </div>
      )}

      <div className={`transition-all ${isEditMode ? 'ring-2 ring-blue-200 ring-opacity-50 rounded-lg' : ''}`}>
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
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableWidgets, setAvailableWidgets] = useState({});
  const [userWidgets, setUserWidgets] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  // Load available widgets from API
  const loadAvailableWidgets = useCallback(async () => {
    try {
      clog('[Dashboard] Loading available widgets...');
      const data = await apiRequest('/dashboard/widgets');
      clog('[Dashboard] Available widgets loaded:', data);

      if (data.success) {
        setAvailableWidgets(data.data || {});
      }
    } catch (error) {
      cerror('[Dashboard] Error loading available widgets:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את הווידג'טים הזמינים",
        variant: "destructive"
      });
    }
  }, []);

  // Load user's dashboard configuration
  const loadDashboardConfig = useCallback(async () => {
    try {
      clog('[Dashboard] Loading user dashboard config...');
      const data = await apiRequest('/dashboard/config');
      clog('[Dashboard] Dashboard config loaded:', data);

      if (data.success) {
        const config = data.data || { widgets: [] };
        // Sort widgets by order
        const sortedWidgets = config.widgets.sort((a, b) => a.order - b.order);
        setUserWidgets(sortedWidgets);
      }
    } catch (error) {
      cerror('[Dashboard] Error loading dashboard config:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את תצורת הדאשבורד",
        variant: "destructive"
      });
    }
  }, []);

  // Save dashboard configuration
  const saveDashboardConfig = useCallback(async (widgets) => {
    try {
      clog('[Dashboard] Saving dashboard config:', widgets);
      const data = await apiRequest('/dashboard/config', {
        method: 'PUT',
        body: JSON.stringify({ widgets })
      });
      clog('[Dashboard] Dashboard config saved:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to save dashboard config');
      }

      toast({
        title: "נשמר",
        description: "תצורת הדאשבורד נשמרה בהצלחה",
        variant: "default"
      });
    } catch (error) {
      cerror('[Dashboard] Error saving dashboard config:', error);
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
      // Load current user
      const user = await User.me();
      setCurrentUser(user);

      // Load available widgets and user config in parallel
      await Promise.all([
        loadAvailableWidgets(),
        loadDashboardConfig()
      ]);
    } catch (error) {
      cerror("Error loading dashboard data:", error);
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
    loadDashboardData();
  }, [loadDashboardData]);

  // Add widget handler
  const handleAddWidget = async (widgetType) => {
    try {
      clog('[Dashboard] Adding widget:', widgetType);
      const data = await apiRequest('/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({ type: widgetType })
      });
      clog('[Dashboard] Widget added:', data);

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
      cerror('[Dashboard] Error adding widget:', error);
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
      clog('[Dashboard] Removing widget:', widgetId);
      const data = await apiRequest(`/dashboard/widgets/${widgetId}`, {
        method: 'DELETE'
      });
      clog('[Dashboard] Widget removed:', data);

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
      cerror('[Dashboard] Error removing widget:', error);
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

  // Save edit mode changes
  const handleSaveChanges = () => {
    setIsEditMode(false);
    toast({
      title: "שינויים נשמרו",
      description: "השינויים בדאשבורד נשמרו בהצלחה",
      variant: "default"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <LudoraLoadingSpinner
          message="טוען דאשבורד..."
          size="lg"
          theme="educational"
          showLogo={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          {/* Welcome message */}
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">
              שלום, {currentUser?.display_name || currentUser?.full_name} 👋
            </h1>
            <p className="text-gray-600 mt-1">הדאשבורד האישי שלך</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {userWidgets.length > 0 && (
              <>
                {!isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    עריכה
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveChanges}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4" />
                    שמור
                  </Button>
                )}
              </>
            )}

            <Button
              onClick={() => setShowWidgetPicker(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              הוסף ווידג'ט
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        {userWidgets.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-gray-200/50">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Settings className="w-12 h-12 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                התאם את הדאשבורד שלך
              </h2>

              <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
                הוסף ווידג'טים כדי ליצור דאשבורד מותאם אישית עם כל המידע והכלים שאתה צריך.
                <br />
                התחל על ידי לחיצה על כפתור "הוסף ווידג'ט" למעלה.
              </p>

              <Button
                onClick={() => setShowWidgetPicker(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-5 h-5 ml-2" />
                הוסף ווידג'ט ראשון
              </Button>
            </div>
          </div>
        ) : (
          /* Widgets Grid */
          <div className="space-y-6">
            {userWidgets.map((widget, index) => (
              <WidgetRenderer
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onRemove={handleRemoveWidget}
                onMoveUp={() => handleMoveWidget(widget.id, 'up')}
                onMoveDown={() => handleMoveWidget(widget.id, 'down')}
                canMoveUp={index > 0}
                canMoveDown={index < userWidgets.length - 1}
                user={currentUser}
              />
            ))}
          </div>
        )}

        {/* Widget Picker Modal */}
        <WidgetPickerModal
          isOpen={showWidgetPicker}
          onClose={() => setShowWidgetPicker(false)}
          availableWidgets={availableWidgets}
          onAddWidget={handleAddWidget}
        />
      </div>
    </div>
  );
}