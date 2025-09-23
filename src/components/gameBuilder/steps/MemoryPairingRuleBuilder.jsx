import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, ArrowUp, ArrowDown, Settings, AlertCircle } from 'lucide-react';

/**
 * Memory Pairing Rule Builder Component
 *
 * Allows users to create complex pairing rules for memory games.
 * Supports both manual pairs and automatic rule-based pairing.
 * Integrates with the hybrid database storage pattern.
 */
export default function MemoryPairingRuleBuilder({
  data,
  onDataChange,
  validationErrors = {}
}) {
  const [pairingRules, setPairingRules] = useState(data.memory_pairing_rules || []);
  const [isExpanded, setIsExpanded] = useState(false);

  // Available content from the content stages
  const availableContent = useMemo(() => {
    const content = [];
    (data.content_stages || []).forEach(stage => {
      (stage.contentConnection?.content || []).forEach(contentItem => {
        if (contentItem.items) {
          contentItem.items.forEach(item => {
            content.push({
              id: item.id,
              type: contentItem.type,
              title: item.title || item.text || item.name,
              sourceTitle: contentItem.title
            });
          });
        }
      });
    });
    return content;
  }, [data.content_stages]);

  // Available content types
  const contentTypes = useMemo(() => {
    const types = new Set();
    availableContent.forEach(item => types.add(item.type));
    return Array.from(types);
  }, [availableContent]);

  // Update parent component when rules change
  useEffect(() => {
    onDataChange({
      memory_pairing_rules: pairingRules
    });
  }, [pairingRules, onDataChange]);

  const addRule = () => {
    const newRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rule_type: 'manual_pairs',
      content_type_a: '',
      content_type_b: '',
      attribute_name: '',
      pair_config: {},
      priority: pairingRules.length,
      is_active: true,
      manual_pairs: []
    };

    setPairingRules([...pairingRules, newRule]);
  };

  const updateRule = (ruleId, updates) => {
    setPairingRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    );
  };

  const deleteRule = (ruleId) => {
    setPairingRules(rules => rules.filter(rule => rule.id !== ruleId));
  };

  const moveRule = (ruleId, direction) => {
    const ruleIndex = pairingRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return;

    const newIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;
    if (newIndex < 0 || newIndex >= pairingRules.length) return;

    const newRules = [...pairingRules];
    [newRules[ruleIndex], newRules[newIndex]] = [newRules[newIndex], newRules[ruleIndex]];

    // Update priorities
    newRules.forEach((rule, index) => {
      rule.priority = newRules.length - index - 1;
    });

    setPairingRules(newRules);
  };

  const addManualPair = (ruleId) => {
    updateRule(ruleId, {
      manual_pairs: [
        ...(pairingRules.find(r => r.id === ruleId)?.manual_pairs || []),
        {
          id: `pair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content_a_id: '',
          content_a_type: '',
          content_b_id: '',
          content_b_type: '',
          pair_metadata: {}
        }
      ]
    });
  };

  const updateManualPair = (ruleId, pairId, updates) => {
    const rule = pairingRules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedPairs = rule.manual_pairs.map(pair =>
      pair.id === pairId ? { ...pair, ...updates } : pair
    );

    updateRule(ruleId, { manual_pairs: updatedPairs });
  };

  const deleteManualPair = (ruleId, pairId) => {
    const rule = pairingRules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedPairs = rule.manual_pairs.filter(pair => pair.id !== pairId);
    updateRule(ruleId, { manual_pairs: updatedPairs });
  };

  const getContentItemsByType = (type) => {
    return availableContent.filter(item => item.type === type);
  };

  const validateRules = () => {
    const errors = [];

    if (pairingRules.length === 0) {
      errors.push('יש להוסיף לפחות חוק זיווג אחד');
    }

    pairingRules.forEach((rule, index) => {
      if (!rule.rule_type) {
        errors.push(`חוק ${index + 1}: יש לבחור סוג חוק`);
      }

      if (rule.rule_type === 'manual_pairs' && (!rule.manual_pairs || rule.manual_pairs.length === 0)) {
        errors.push(`חוק ${index + 1}: חוק זיווג ידני דורש לפחות זוג אחד`);
      }

      if (rule.rule_type === 'content_type_match' && (!rule.content_type_a || !rule.content_type_b)) {
        errors.push(`חוק ${index + 1}: יש לבחור שני סוגי תוכן להתאמה`);
      }
    });

    return errors;
  };

  const validationIssues = validateRules();

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">חוקי זיווג</h3>
          <p className="text-sm text-gray-600">
            הגדר כיצד הכרטיסים יזווגו במשחק הזיכרון
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {isExpanded ? 'הסתר פרטים' : 'הראה פרטים'}
          </Button>
          <Button onClick={addRule} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            הוסף חוק
          </Button>
        </div>
      </div>

      {validationIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="mb-2 font-medium">בעיות בהגדרת החוקים:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationIssues.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Rules Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>סיכום חוקי הזיווג ({pairingRules.length})</span>
            <div className="flex gap-2">
              {pairingRules.map((rule, index) => (
                <Badge
                  key={rule.id}
                  variant={rule.is_active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {index + 1}
                </Badge>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">סה"כ תוכן זמין:</span>
              <span className="mr-2">{availableContent.length} פריטים</span>
            </div>
            <div>
              <span className="font-medium">סוגי תוכן:</span>
              <span className="mr-2">{contentTypes.join(', ')}</span>
            </div>
            <div>
              <span className="font-medium">זוגות מוגדרים:</span>
              <span className="mr-2">
                {pairingRules.reduce((sum, rule) => sum + (rule.manual_pairs?.length || 0), 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Rules */}
      <div className="space-y-4">
        {pairingRules.map((rule, index) => (
          <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  חוק זיווג {index + 1}
                  {!rule.is_active && <Badge variant="secondary" className="mr-2">לא פעיל</Badge>}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveRule(rule.id, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveRule(rule.id, 'down')}
                    disabled={index === pairingRules.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rule Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>סוג חוק</Label>
                  <Select
                    value={rule.rule_type}
                    onValueChange={(value) => updateRule(rule.id, { rule_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג חוק" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_pairs">זוגות ידניים</SelectItem>
                      <SelectItem value="content_type_match">התאמת סוגי תוכן</SelectItem>
                      <SelectItem value="attribute_match">התאמת מאפיינים</SelectItem>
                      <SelectItem value="semantic_match">התאמה סמנטית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`active-${rule.id}`}
                      checked={rule.is_active}
                      onChange={(e) => updateRule(rule.id, { is_active: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`active-${rule.id}`}>פעיל</Label>
                  </div>
                </div>
              </div>

              {/* Rule-specific configuration */}
              {rule.rule_type === 'content_type_match' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>סוג תוכן A</Label>
                    <Select
                      value={rule.content_type_a}
                      onValueChange={(value) => updateRule(rule.id, { content_type_a: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר סוג תוכן" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>סוג תוכן B</Label>
                    <Select
                      value={rule.content_type_b}
                      onValueChange={(value) => updateRule(rule.id, { content_type_b: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר סוג תוכן" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {rule.rule_type === 'attribute_match' && (
                <div>
                  <Label>שם מאפיין</Label>
                  <Input
                    value={rule.attribute_name || ''}
                    onChange={(e) => updateRule(rule.id, { attribute_name: e.target.value })}
                    placeholder="לדוגמה: difficulty, category, theme"
                  />
                </div>
              )}

              {/* Manual Pairs */}
              {rule.rule_type === 'manual_pairs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>זוגות ידניים ({rule.manual_pairs?.length || 0})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addManualPair(rule.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      הוסף זוג
                    </Button>
                  </div>

                  {rule.manual_pairs?.map((pair) => (
                    <div key={pair.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border rounded-lg">
                      <div>
                        <Label className="text-xs">תוכן A</Label>
                        <Select
                          value={pair.content_a_id}
                          onValueChange={(value) => {
                            const item = availableContent.find(c => c.id === value);
                            updateManualPair(rule.id, pair.id, {
                              content_a_id: value,
                              content_a_type: item?.type || ''
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר תוכן" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableContent.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.title} ({item.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-center">
                        <Badge variant="outline">↔</Badge>
                      </div>

                      <div>
                        <Label className="text-xs">תוכן B</Label>
                        <Select
                          value={pair.content_b_id}
                          onValueChange={(value) => {
                            const item = availableContent.find(c => c.id === value);
                            updateManualPair(rule.id, pair.id, {
                              content_b_id: value,
                              content_b_type: item?.type || ''
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר תוכן" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableContent.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.title} ({item.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteManualPair(rule.id, pair.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pairingRules.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4">לא הוגדרו חוקי זיווג</p>
            <Button onClick={addRule}>
              <Plus className="w-4 h-4 mr-2" />
              הוסף חוק ראשון
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}