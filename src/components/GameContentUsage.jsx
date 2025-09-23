import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, Edit, Trash2, Copy, Play, CheckCircle, AlertTriangle,
  Layers, Settings, Eye, Download, Upload, Zap
} from 'lucide-react';
import {
  getGameContentUsage,
  getContentUsage,
  createContentUsage,
  updateContentUsage,
  deleteContentUsage,
  copyTemplateToUsage,
  resolveContentForUsage,
  getContentTemplates,
  getTemplatesForGameType,
  getContentTypes,
  getContentTypeInfo,
  formatRuleConfigDisplay
} from '@/services/gameContentManagement';

export default function GameContentUsage({ gameId, gameType, onUsageSelect }) {
  const [usages, setUsages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingUsage, setEditingUsage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content_types: [],
    template_id: null
  });
  const [formErrors, setFormErrors] = useState({});

  // Template selection
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Content resolution
  const [resolvedContent, setResolvedContent] = useState(null);
  const [showResolvedContent, setShowResolvedContent] = useState(false);

  const contentTypes = getContentTypes();
  const contentTypeInfo = getContentTypeInfo();

  useEffect(() => {
    if (gameId) {
      loadUsages();
      loadTemplates();
    }
  }, [gameId]);

  const loadUsages = async () => {
    setIsLoading(true);
    try {
      const response = await getGameContentUsage(gameId);
      setUsages(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load content usage: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await getTemplatesForGameType(gameType, true);
      setAvailableTemplates(response.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (formData.content_types.length === 0) errors.content_types = 'At least one content type is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      if (editingUsage) {
        await updateContentUsage(gameId, editingUsage.id, formData);
        setSuccess('Content usage updated successfully');
      } else {
        await createContentUsage(gameId, formData);
        setSuccess('Content usage created successfully');
      }
      await loadUsages();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyFromTemplate = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      await copyTemplateToUsage(gameId, {
        template_id: selectedTemplate.id,
        name: formData.name || selectedTemplate.name,
        description: formData.description || selectedTemplate.description
      });
      setSuccess('Template copied successfully');
      await loadUsages();
      setShowTemplateModal(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (usage) => {
    setEditingUsage(usage);
    setFormData({
      name: usage.name,
      description: usage.description || '',
      content_types: usage.content_types || [],
      template_id: usage.template_id
    });
    setShowForm(true);
  };

  const handleDelete = async (usageId) => {
    if (!confirm('Are you sure you want to delete this content usage?')) return;

    setIsLoading(true);
    try {
      await deleteContentUsage(gameId, usageId);
      setSuccess('Content usage deleted successfully');
      await loadUsages();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveContent = async (usage) => {
    setIsLoading(true);
    try {
      const response = await resolveContentForUsage(gameId, usage.id);
      setResolvedContent({
        usage: usage,
        content: response.data
      });
      setShowResolvedContent(true);
    } catch (err) {
      setError('Failed to resolve content: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content_types: [],
      template_id: null
    });
    setEditingUsage(null);
    setShowForm(false);
    setFormErrors({});
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Game Content Usage</h2>
          <p className="text-muted-foreground">
            Manage how this game uses content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
            <Copy className="w-4 h-4 mr-2" />
            From Template
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Usage
          </Button>
        </div>
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

      {/* Usages List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">Loading content usage...</div>
        ) : usages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No content usage configured</p>
            <div className="mt-4 space-x-2">
              <Button onClick={() => setShowTemplateModal(true)}>
                Copy from Template
              </Button>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Create Custom
              </Button>
            </div>
          </div>
        ) : (
          usages.map(usage => (
            <Card key={usage.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onUsageSelect && onUsageSelect(usage)}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{usage.name}</h3>
                      {usage.template_id && (
                        <Badge variant="secondary">
                          <Layers className="w-3 h-3 mr-1" />
                          From Template
                        </Badge>
                      )}
                    </div>

                    {usage.description && (
                      <p className="text-muted-foreground mb-3">{usage.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {usage.content_types?.map(type => (
                        <Badge key={type} variant="outline">
                          {contentTypeInfo[type]?.label || type}
                        </Badge>
                      ))}
                    </div>

                    {usage.rules && usage.rules.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Rules ({usage.rules.length}):</p>
                        {usage.rules.slice(0, 2).map((rule, index) => (
                          <div key={index} className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            <span className="font-medium">{rule.rule_type}:</span>{' '}
                            {formatRuleConfigDisplay(rule.rule_type, rule.rule_config)}
                          </div>
                        ))}
                        {usage.rules.length > 2 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {usage.rules.length - 2} more rules
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolveContent(usage)}
                    >
                      <Zap className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(usage)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(usage.id)}
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

      {/* Usage Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingUsage ? 'Edit Content Usage' : 'Create New Content Usage'}
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (editingUsage ? 'Update' : 'Create')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Copy from Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {availableTemplates.map(template => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                          <div className="flex gap-1 mt-2">
                            {template.content_types?.slice(0, 3).map(type => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {contentTypeInfo[type]?.label || type}
                              </Badge>
                            ))}
                            {template.content_types?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.content_types.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        {template.is_global && (
                          <Badge variant="secondary">Global</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTemplate && (
                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Usage Name</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={selectedTemplate.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description (optional)</Label>
                    <Textarea
                      id="template-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={selectedTemplate.description}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setSelectedTemplate(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyFromTemplate}
                  disabled={!selectedTemplate || isLoading}
                >
                  {isLoading ? 'Copying...' : 'Copy Template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Resolved Content Modal */}
      {showResolvedContent && resolvedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Resolved Content - {resolvedContent.usage.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{resolvedContent.content.metadata.total_items}</p>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{resolvedContent.content.metadata.rules_applied}</p>
                    <p className="text-sm text-muted-foreground">Rules Applied</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{resolvedContent.content.metadata.content_types.length}</p>
                    <p className="text-sm text-muted-foreground">Content Types</p>
                  </div>
                </div>

                {Object.entries(resolvedContent.content.content).map(([contentType, items]) => (
                  items.length > 0 && (
                    <div key={contentType}>
                      <h3 className="font-medium mb-3">
                        {contentTypeInfo[contentType]?.label || contentType} ({items.length} items)
                      </h3>
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {items.slice(0, 10).map((item, index) => (
                          <div key={index} className="bg-muted p-3 rounded text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div><strong>ID:</strong> {item.id}</div>
                              <div><strong>Type:</strong> {item.content_type}</div>
                              {item.word && <div><strong>Word:</strong> {item.word}</div>}
                              {item.translation && <div><strong>Translation:</strong> {item.translation}</div>}
                              {item.question && <div><strong>Question:</strong> {item.question}</div>}
                              {item.answer && <div><strong>Answer:</strong> {item.answer}</div>}
                              {item.image_url && <div><strong>Image:</strong> {item.image_url}</div>}
                              {item.name && <div><strong>Name:</strong> {item.name}</div>}
                            </div>
                          </div>
                        ))}
                        {items.length > 10 && (
                          <p className="text-center text-muted-foreground">
                            ... and {items.length - 10} more items
                          </p>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowResolvedContent(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}