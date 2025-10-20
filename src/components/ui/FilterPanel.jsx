import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, X, ChevronDown, RotateCcw } from "lucide-react";

/**
 * FilterPanel - A reusable filtering component for any entity type
 * Supports multiple filter types: text, select, checkbox, date range
 *
 * @param {Object} props
 * @param {Array} props.filters - Filter configuration array
 * @param {Object} props.values - Current filter values
 * @param {Function} props.onChange - Callback when filters change
 * @param {Function} props.onReset - Callback to reset filters
 * @param {boolean} props.collapsible - Make the panel collapsible
 * @param {boolean} props.defaultOpen - Default open state for collapsible
 * @param {string} props.title - Panel title
 * @param {string} props.className - Additional CSS classes
 */
export default function FilterPanel({
  filters = [],
  values = {},
  onChange,
  onReset,
  collapsible = false,
  defaultOpen = true,
  title = "סינון",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [localValues, setLocalValues] = useState(values);

  const handleFilterChange = (filterKey, value) => {
    const newValues = { ...localValues, [filterKey]: value };
    setLocalValues(newValues);
    onChange?.(newValues);
  };

  const handleReset = () => {
    const resetValues = {};
    filters.forEach(filter => {
      if (filter.type === 'checkbox') {
        resetValues[filter.key] = [];
      } else {
        resetValues[filter.key] = '';
      }
    });
    setLocalValues(resetValues);
    onReset?.(resetValues);
  };

  const getActiveFilterCount = () => {
    return Object.entries(localValues).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value && value !== '';
    }).length;
  };

  const renderFilter = (filter) => {
    const value = localValues[filter.key] || (filter.type === 'checkbox' ? [] : '');

    switch (filter.type) {
      case 'text':
        return (
          <div key={filter.key} className="space-y-2">
            <Label htmlFor={filter.key}>{filter.label}</Label>
            <Input
              id={filter.key}
              placeholder={filter.placeholder}
              value={value}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div key={filter.key} className="space-y-2">
            <Label htmlFor={filter.key}>{filter.label}</Label>
            <Select
              value={value}
              onValueChange={(newValue) => handleFilterChange(filter.key, newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder={filter.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiselect':
        return (
          <div key={filter.key} className="space-y-2">
            <Label>{filter.label}</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filter.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${filter.key}-${option.value}`}
                    checked={value.includes(option.value)}
                    onCheckedChange={(checked) => {
                      let newValue;
                      if (checked) {
                        newValue = [...value, option.value];
                      } else {
                        newValue = value.filter(v => v !== option.value);
                      }
                      handleFilterChange(filter.key, newValue);
                    }}
                  />
                  <Label
                    htmlFor={`${filter.key}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {value.map(v => {
                  const option = filter.options.find(opt => opt.value === v);
                  return (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {option?.label || v}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => {
                          const newValue = value.filter(val => val !== v);
                          handleFilterChange(filter.key, newValue);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={filter.key} className="space-y-2">
            <Label>{filter.label}</Label>
            <div className="space-y-2">
              {filter.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${filter.key}-${option.value}`}
                    checked={value.includes(option.value)}
                    onCheckedChange={(checked) => {
                      let newValue;
                      if (checked) {
                        newValue = [...value, option.value];
                      } else {
                        newValue = value.filter(v => v !== option.value);
                      }
                      handleFilterChange(filter.key, newValue);
                    }}
                  />
                  <Label
                    htmlFor={`${filter.key}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'range':
        return (
          <div key={filter.key} className="space-y-2">
            <Label>{filter.label}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder={filter.minPlaceholder || "מינימום"}
                  value={value.min || ''}
                  onChange={(e) => handleFilterChange(filter.key, { ...value, min: e.target.value })}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder={filter.maxPlaceholder || "מקסימום"}
                  value={value.max || ''}
                  onChange={(e) => handleFilterChange(filter.key, { ...value, max: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 'date':
        return (
          <div key={filter.key} className="space-y-2">
            <Label htmlFor={filter.key}>{filter.label}</Label>
            <Input
              id={filter.key}
              type="date"
              value={value}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            />
          </div>
        );

      case 'daterange':
        return (
          <div key={filter.key} className="space-y-2">
            <Label>{filter.label}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="date"
                  placeholder="מתאריך"
                  value={value.from || ''}
                  onChange={(e) => handleFilterChange(filter.key, { ...value, from: e.target.value })}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="עד תאריך"
                  value={value.to || ''}
                  onChange={(e) => handleFilterChange(filter.key, { ...value, to: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const activeFilterCount = getActiveFilterCount();

  const content = (
    <div className="space-y-4">
      {filters.map(renderFilter)}

      {activeFilterCount > 0 && (
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            נקה סינון ({activeFilterCount})
          </Button>
        </div>
      )}
    </div>
  );

  if (collapsible) {
    return (
      <Card className={className}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  {title}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {content}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          {title}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}