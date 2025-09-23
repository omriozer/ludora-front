import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Category, User } from "@/services/entities";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Star
} from "lucide-react";

export default function CategoryManagement() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    is_default: false
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm]);

  const loadData = async () => {
    try {
      // Check if user is admin
      const user = await User.me();
      if (user.role !== 'admin') {
        navigate('/');
        return;
      }
      setCurrentUser(user);

      // Load categories
      const categoriesData = await Category.find({}, "name");
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  };

  const filterCategories = () => {
    let filtered = categories;
    
    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredCategories(filtered);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      is_default: false
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      is_default: category.is_default || false
    });
    setEditingCategory(category);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage('error', 'שם הקטגוריה הוא שדה חובה');
      return;
    }

    // Check for duplicate names (excluding current category when editing)
    const duplicate = categories.find(cat => 
      cat.name.toLowerCase() === formData.name.trim().toLowerCase() &&
      cat.id !== editingCategory?.id
    );

    if (duplicate) {
      showMessage('error', 'קטגוריה עם שם זה כבר קיימת');
      return;
    }

    try {
      if (editingCategory) {
        await Category.update(editingCategory.id, formData);
        showMessage('success', 'הקטגוריה עודכנה בהצלחה');
      } else {
        await Category.create(formData);
        showMessage('success', 'הקטגוריה נוספה בהצלחה');
      }
      
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      showMessage('error', 'שגיאה בשמירת הקטגוריה');
    }
  };

  const handleDelete = async (category) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הקטגוריה "${category.name}"?`)) {
      return;
    }

    try {
      await Category.delete(category.id);
      showMessage('success', 'הקטגוריה נמחקה בהצלחה');
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      showMessage('error', 'שגיאה במחיקת הקטגוריה');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען קטגוריות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FolderTree className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ניהול קטגוריות</h1>
                <p className="text-gray-600">ניהול קטגוריות המוצרים במערכת</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף קטגוריה
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingCategory ? 'עריכת קטגוריה' : 'הוספת קטגוריה חדשה'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">שם הקטגוריה</Label>
                  <Input
                    id="category-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="הכנס שם קטגוריה..."
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="is-default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  />
                  <Label htmlFor="is-default" className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    קטגוריית ברירת מחדל
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 ml-2" />
                    {editingCategory ? 'עדכן' : 'שמור'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    <X className="w-4 h-4 ml-2" />
                    ביטול
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="חפש קטגוריות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>רשימת קטגוריות ({filteredCategories.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCategories.length > 0 ? (
              <div className="space-y-3">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FolderTree className="w-5 h-5 text-green-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            נוצר: {new Date(category.created_date).toLocaleDateString('he-IL')}
                          </span>
                          {category.is_default && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              ברירת מחדל
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'לא נמצאו קטגוריות' : 'אין קטגוריות במערכת'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'נסה לחפש עם מילות מפתח אחרות' : 'התחל ביצירת הקטגוריה הראשונה'}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף קטגוריה ראשונה
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}