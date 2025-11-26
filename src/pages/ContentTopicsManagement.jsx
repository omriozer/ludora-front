import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  FileText,
  BookOpen,
  Eye
} from 'lucide-react';
import { ContentTopic } from '@/services/entities';
import { contentTopicService } from '@/services/contentTopicService';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * ContentTopicsManagement - Admin page for managing content topics
 * Allows admins to create, edit, delete and view usage statistics for content topics
 */
export default function ContentTopicsManagement() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  // State management
  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  // Usage statistics state
  const [topicUsageMap, setTopicUsageMap] = useState(new Map());
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (!userLoading && currentUser) {
      loadTopics();
    }
  }, [userLoading, currentUser]);

  // Filter and sort topics
  useEffect(() => {
    filterAndSortTopics();
  }, [topics, searchTerm, statusFilter, sortBy, sortOrder]);

  // Load all topics
  const loadTopics = async () => {
    try {
      setIsLoading(true);
      const data = await ContentTopic.list();
      setTopics(Array.isArray(data) ? data : []);
    } catch (error) {
      luderror.validation('Failed to load content topics:', error);
      showMessage('error', 'שגיאה בטעינת נושאי התוכן');
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load usage statistics for a topic
  const loadTopicUsage = async (topicId) => {
    if (topicUsageMap.has(topicId)) return; // Already loaded

    try {
      const usage = await contentTopicService.getTopicUsage(topicId);
      setTopicUsageMap(prev => new Map(prev.set(topicId, usage)));
    } catch (error) {
      luderror.validation(`Failed to load usage for topic ${topicId}:`, error);
    }
  };

  // Load usage statistics for all visible topics
  const loadAllUsageStats = async () => {
    setLoadingUsage(true);
    try {
      const promises = filteredTopics.map(topic =>
        contentTopicService.getTopicUsage(topic.id)
          .then(usage => ({ topicId: topic.id, usage }))
          .catch(error => {
            luderror.validation(`Failed to load usage for topic ${topic.id}:`, error);
            return { topicId: topic.id, usage: null };
          })
      );

      const results = await Promise.all(promises);
      const newUsageMap = new Map();
      results.forEach(({ topicId, usage }) => {
        if (usage) newUsageMap.set(topicId, usage);
      });

      setTopicUsageMap(newUsageMap);
    } catch (error) {
      luderror.validation('Failed to load usage statistics:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  // Filter and sort logic
  const filterAndSortTopics = () => {
    let filtered = topics;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(topic =>
        topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(topic =>
        statusFilter === 'active' ? topic.is_active : !topic.is_active
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'created':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'updated':
          aVal = new Date(a.updated_at);
          bVal = new Date(b.updated_at);
          break;
        case 'status':
          aVal = a.is_active ? 1 : 0;
          bVal = b.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTopics(filtered);
  };

  // Toggle sort order
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Message helper
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Form handlers
  const handleOpenCreateForm = () => {
    setEditingTopic(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    setShowForm(true);
  };

  const handleOpenEditForm = (topic) => {
    setEditingTopic(topic);
    setFormData({
      name: topic.name || '',
      description: topic.description || '',
      is_active: topic.is_active !== false
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTopic(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showMessage('error', 'שם הנושא חובה');
      return;
    }

    try {
      if (editingTopic) {
        // Update existing topic
        await ContentTopic.update(editingTopic.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          is_active: formData.is_active
        });
        showMessage('success', 'נושא התוכן עודכן בהצלחה');
      } else {
        // Create new topic
        await ContentTopic.create({
          name: formData.name.trim(),
          description: formData.description.trim(),
          is_active: formData.is_active
        });
        showMessage('success', 'נושא תוכן חדש נוצר בהצלחה');
      }

      handleCloseForm();
      loadTopics(); // Refresh the list
    } catch (error) {
      luderror.validation('Error saving topic:', error);
      showMessage('error', editingTopic ? 'שגיאה בעדכון הנושא' : 'שגיאה ביצירת הנושא');
    }
  };

  // Delete handler
  const handleDelete = async (topic) => {
    const usage = topicUsageMap.get(topic.id);
    let confirmMessage = `האם אתה בטוח שברצונך למחוק את הנושא "${topic.name}"?`;

    if (usage && (usage.products.total > 0 || usage.curriculumItems.total > 0)) {
      confirmMessage += `\n\nנושא זה משמש כרגע ב-${usage.products.total} מוצרים ו-${usage.curriculumItems.total} פריטי תוכנית לימודים.`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      await ContentTopic.delete(topic.id);
      showMessage('success', 'נושא התוכן נמחק בהצלחה');

      // Remove from usage map
      setTopicUsageMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(topic.id);
        return newMap;
      });

      loadTopics(); // Refresh the list
    } catch (error) {
      luderror.validation('Error deleting topic:', error);
      showMessage('error', 'שגיאה במחיקת הנושא');
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get usage display
  const getUsageDisplay = (topic) => {
    const usage = topicUsageMap.get(topic.id);
    if (!usage) {
      return (
        <button
          onClick={() => loadTopicUsage(topic.id)}
          className="text-xs text-gray-500 hover:text-blue-600"
        >
          <Eye className="w-3 h-3 inline mr-1" />
          צפה בשימוש
        </button>
      );
    }

    return (
      <div className="flex gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {usage.products.total} מוצרים
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          {usage.curriculumItems.total} פריטים
        </span>
      </div>
    );
  };

  // Statistics summary
  const getStatistics = () => {
    const total = topics.length;
    const active = topics.filter(t => t.is_active).length;
    const inactive = total - active;

    return { total, active, inactive };
  };

  const stats = getStatistics();

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נושאי תוכן...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ניהול נושאי תוכן</h1>
              <p className="text-gray-600">נהל נושאי תוכן למוצרים ולתכניות לימודים</p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-sm text-gray-600">סה״כ נושאים</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  <p className="text-sm text-gray-600">פעילים</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                  <p className="text-sm text-gray-600">לא פעילים</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <Button
                    onClick={loadAllUsageStats}
                    disabled={loadingUsage}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {loadingUsage ? 'טוען...' : 'טען סטטיסטיקות'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Actions and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>רשימת נושאי התוכן</CardTitle>
              <Button onClick={handleOpenCreateForm} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                יצירת נושא חדש
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="חיפוש לפי שם או תיאור..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="סינון לפי סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="active">פעילים בלבד</SelectItem>
                  <SelectItem value="inactive">לא פעילים בלבד</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="מיין לפי" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">שם</SelectItem>
                  <SelectItem value="created">תאריך יצירה</SelectItem>
                  <SelectItem value="updated">תאריך עדכון</SelectItem>
                  <SelectItem value="status">סטטוס</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => handleSort(sortBy)}
                className="flex items-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'asc' ? 'עולה' : 'יורד'}
              </Button>
            </div>

            {/* Topics List */}
            {filteredTopics.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'לא נמצאו תוצאות' : 'אין נושאי תוכן עדיין'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'נסה לשנות את הפילטרים שלך'
                    : 'צור נושא תוכן ראשון כדי להתחיל'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={handleOpenCreateForm} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    יצירת נושא ראשון
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {topic.name}
                          </h3>
                          <Badge
                            variant={topic.is_active ? "default" : "secondary"}
                            className={topic.is_active ? "bg-green-100 text-green-800" : ""}
                          >
                            {topic.is_active ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </div>

                        {topic.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {topic.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex gap-4">
                            <span>נוצר: {formatDate(topic.created_at)}</span>
                            {topic.updated_at !== topic.created_at && (
                              <span>עודכן: {formatDate(topic.updated_at)}</span>
                            )}
                          </div>

                          {getUsageDisplay(topic)}
                        </div>
                      </div>

                      <div className="flex gap-2 mr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditForm(topic)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(topic)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? 'עריכת נושא תוכן' : 'יצירת נושא תוכן חדש'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">שם הנושא *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="הקלד שם לנושא התוכן"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="תיאור מפורט של הנושא (אופציונלי)"
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="text-sm">
                נושא פעיל
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                ביטול
              </Button>
              <Button type="submit">
                {editingTopic ? 'עדכון' : 'יצירה'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}