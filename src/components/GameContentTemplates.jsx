import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, Edit, Trash2, Search, Settings, Play, CheckCircle,
  AlertTriangle, Globe, Gamepad2, Layers, Filter, Eye
} from 'lucide-react';
import {
  getContentTemplates,
  getContentTemplate,
  createContentTemplate,
  updateContentTemplate,
  deleteContentTemplate,
  previewRuleContent,
  getContentTypes,
  getRuleTypes,
  getContentTypeInfo,
  validateRuleConfig,
  formatRuleConfigDisplay
} from '@/services/gameContentManagement';

export default function GameContentTemplates() {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    game_type: '',
    content_types: [],
    is_global: false,
    rules: []
  });
  const [formErrors, setFormErrors] = useState({});

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState('all');
  const [globalFilter, setGlobalFilter] = useState('all');

  // Rule management
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleData, setRuleData] = useState({
    rule_type: '',
    rule_config: {},
    priority: 0
  });

  // Preview states
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const gameTypes = [
    'match_words', 'memory_game', 'word_builder', 'quiz_game',
    'vocabulary_trainer', 'spelling_game', 'reading_comprehension'
  ];

  const contentTypes = getContentTypes();
  const ruleTypes = getRuleTypes();
  const contentTypeInfo = getContentTypeInfo();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, gameTypeFilter, globalFilter]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await getContentTemplates({ include_rules: 'true' });
      setTemplates(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load templates: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (gameTypeFilter !== 'all') {
      filtered = filtered.filter(template => template.game_type === gameTypeFilter);
    }

    if (globalFilter !== 'all') {
      filtered = filtered.filter(template => template.is_global === (globalFilter === 'global'));
    }

    setFilteredTemplates(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validate form
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.game_type) errors.game_type = 'Game type is required';
    if (formData.content_types.length === 0) errors.content_types = 'At least one content type is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      if (editingTemplate) {
        await updateContentTemplate(editingTemplate.id, formData);
        setSuccess('Template updated successfully');
      } else {
        await createContentTemplate(formData);
        setSuccess('Template created successfully');
      }
      await loadTemplates();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      game_type: template.game_type,
      content_types: template.content_types || [],
      is_global: template.is_global || false,
      rules: template.rules || []
    });
    setShowForm(true);
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setIsLoading(true);
    try {
      await deleteContentTemplate(templateId);
      setSuccess('Template deleted successfully');
      await loadTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      game_type: '',
      content_types: [],
      is_global: false,
      rules: []
    });
    setEditingTemplate(null);
    setShowForm(false);
    setFormErrors({});
  };

  const handlePreview = async (template) => {
    if (!template.rules || template.rules.length === 0) {
      setError('Template has no rules to preview');
      return;
    }

    setIsLoading(true);
    try {
      const rule = template.rules[0]; // Preview first rule
      const response = await previewRuleContent({
        rule_type: rule.rule_type,
        rule_config: rule.rule_config,
        content_types: template.content_types,
        limit: 5
      });
      setPreviewData(response.data);
      setShowPreview(true);
    } catch (err) {
      setError('Failed to preview content: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentTypeChange = (contentType, checked) => {
    setFormData(prev => ({
      ...prev,
      content_types: checked
        ? [...prev.content_types, contentType]
        : prev.content_types.filter(ct => ct !== contentType)
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Content Templates</h1>
          <p className="text-muted-foreground">
            Manage reusable content usage patterns for games
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Game Type</Label>
              <Select value={gameTypeFilter} onValueChange={setGameTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {gameTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={globalFilter} onValueChange={setGlobalFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="global">Global Only</SelectItem>
                  <SelectItem value="specific">Game-Specific Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setGameTypeFilter('all');
                setGlobalFilter('all');
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No templates found</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              Create your first template
            </Button>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <Card key={template.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      {template.is_global && (
                        <Badge variant="secondary">
                          <Globe className="w-3 h-3 mr-1" />
                          Global
                        </Badge>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-muted-foreground mb-3">{template.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">
                        <Gamepad2 className="w-3 h-3 mr-1" />
                        {template.game_type?.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {template.content_types?.map(type => (
                        <Badge key={type} variant="outline">
                          {contentTypeInfo[type]?.label || type}
                        </Badge>
                      ))}
                    </div>

                    {template.rules && template.rules.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Rules ({template.rules.length}):</p>
                        {template.rules.slice(0, 2).map((rule, index) => (
                          <div key={index} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            <span className="font-medium">{ruleTypes.find(rt => rt.value === rule.rule_type)?.label}:</span>{' '}
                            {formatRuleConfigDisplay(rule.rule_type, rule.rule_config)}
                          </div>
                        ))}
                        {template.rules.length > 2 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {template.rules.length - 2} more rules
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(template)}
                      disabled={!template.rules || template.rules.length === 0}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Template Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game_type">Game Type *</Label>
                  <Select
                    value={formData.game_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, game_type: value }))}
                  >
                    <SelectTrigger className={formErrors.game_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select game type" />
                    </SelectTrigger>
                    <SelectContent>
                      {gameTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.game_type && <p className="text-sm text-red-500">{formErrors.game_type}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Content Types *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {contentTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={formData.content_types.includes(type)}
                          onCheckedChange={(checked) => handleContentTypeChange(type, checked)}
                        />
                        <Label htmlFor={type} className="text-sm">
                          {contentTypeInfo[type]?.label || type}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formErrors.content_types && <p className="text-sm text-red-500">{formErrors.content_types}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_global"
                    checked={formData.is_global}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_global: checked }))}
                  />
                  <Label htmlFor="is_global">Global template (available for all game types)</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Content Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Rule Type:</p>
                    <p className="text-sm text-muted-foreground">
                      {ruleTypes.find(rt => rt.value === previewData.rule_type)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Items:</p>
                    <p className="text-sm text-muted-foreground">
                      {Object.values(previewData.metadata.total_by_type).reduce((sum, count) => sum + count, 0)}
                    </p>
                  </div>
                </div>

                {Object.entries(previewData.preview).map(([contentType, items]) => (
                  items.length > 0 && (
                    <div key={contentType}>
                      <h3 className="font-medium mb-2">
                        {contentTypeInfo[contentType]?.label || contentType} ({items.length} items)
                      </h3>
                      <div className="grid gap-2">
                        {items.slice(0, 5).map((item, index) => (
                          <div key={index} className="bg-muted p-3 rounded text-sm">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowPreview(false)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}