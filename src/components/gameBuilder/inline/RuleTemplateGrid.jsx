import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Clock, Target } from 'lucide-react';

export default function RuleTemplateGrid({ templates, onSelectTemplate, onPreviewTemplate }) {
  const getDifficultyColor = (levels) => {
    if (!levels) return 'gray';
    const difficultyCount = Object.keys(levels).length;
    if (difficultyCount === 1) return 'green';
    if (difficultyCount === 2) return 'yellow';
    return 'red';
  };

  const getCompatibilityBadge = (gameTypes) => {
    if (gameTypes.length === 1) {
      return { text: 'מיוחד', color: 'blue' };
    } else if (gameTypes.length <= 3) {
      return { text: 'מוגבל', color: 'yellow' };
    } else {
      return { text: 'אוניברסלי', color: 'green' };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => {
        const difficultyColor = getDifficultyColor(template.config?.difficulty_settings);
        const compatibility = getCompatibilityBadge(template.compatible_game_types);

        return (
          <Card key={template.id} className="relative group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{template.emoji}</div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Badge
                    variant="outline"
                    className={`text-${compatibility.color}-600 border-${compatibility.color}-200`}
                  >
                    {compatibility.text}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-${difficultyColor}-600 border-${difficultyColor}-200`}
                  >
                    {template.config?.difficulty_settings ?
                      `${Object.keys(template.config.difficulty_settings).length} רמות` :
                      'רמה אחת'
                    }
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {/* Preview Description */}
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {template.preview_description}
              </p>

              {/* Requirements */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Target className="w-3 h-3" />
                  <span>דרוש:</span>
                  <div className="flex gap-1">
                    {template.required_content_types.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {template.config?.difficulty_settings?.easy && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>זמן:</span>
                    <span>{template.config.difficulty_settings.easy.time_limit}s</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onSelectTemplate(template.id)}
                  className="flex-1 flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  הוסף
                </Button>

                <Button
                  variant="outline"
                  onClick={() => onPreviewTemplate(template)}
                  size="sm"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>

            {/* Hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>
        );
      })}
    </div>
  );
}