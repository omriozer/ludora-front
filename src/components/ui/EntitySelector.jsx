import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, X, Plus } from "lucide-react";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";

/**
 * EntitySelector - A reusable entity selection component
 * Can be used for selecting products, curricula, users, or any other entity type
 *
 * @param {Object} props
 * @param {string|Array} props.value - Selected entity ID(s)
 * @param {Function} props.onValueChange - Callback when selection changes
 * @param {Object} props.entityService - Service object with list() method
 * @param {Function} props.renderEntity - Function to render entity in list
 * @param {Function} props.renderSelected - Function to render selected entity
 * @param {Function} props.filterEntities - Function to filter entities based on search
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.title - Modal title
 * @param {string} props.searchPlaceholder - Search placeholder
 * @param {boolean} props.multiple - Allow multiple selection
 * @param {boolean} props.disabled - Disable the component
 * @param {string} props.emptyMessage - Message when no entities found
 * @param {Object} props.icon - Icon component to display
 */
export default function EntitySelector({
  value,
  onValueChange,
  entityService,
  renderEntity,
  renderSelected,
  filterEntities,
  placeholder = "בחר פריט",
  title = "בחר פריט",
  searchPlaceholder = "חפש...",
  multiple = false,
  disabled = false,
  emptyMessage = "לא נמצאו פריטים",
  icon: IconComponent = Plus,
  className = ""
}) {
  const [entities, setEntities] = useState([]);
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState(multiple ? [] : null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filterEntitiesCallback = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredEntities(entities);
      return;
    }

    const filtered = filterEntities ?
      filterEntities(entities, searchTerm) :
      entities.filter(entity =>
        entity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    setFilteredEntities(filtered);
  }, [entities, searchTerm, filterEntities]);

  const loadEntities = async () => {
    setIsLoading(true);
    try {
      const entitiesData = await entityService.list();
      setEntities(entitiesData);
    } catch (error) {
      console.error('Error loading entities:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (value && entities.length > 0) {
      if (multiple) {
        const selected = entities.filter(e => value.includes(e.id));
        setSelectedEntities(selected);
      } else {
        const entity = entities.find(e => e.id === value);
        setSelectedEntities(entity);
      }
    } else {
      setSelectedEntities(multiple ? [] : null);
    }
  }, [value, entities, multiple]);

  useEffect(() => {
    if (isOpen && entities.length === 0) {
      loadEntities();
    }
  }, [isOpen, entities.length]);

  useEffect(() => {
    filterEntitiesCallback();
  }, [filterEntitiesCallback]);

  const handleSelectEntity = (entity) => {
    if (multiple) {
      const newSelected = [...selectedEntities];
      const existingIndex = newSelected.findIndex(e => e.id === entity.id);

      if (existingIndex >= 0) {
        newSelected.splice(existingIndex, 1);
      } else {
        newSelected.push(entity);
      }

      setSelectedEntities(newSelected);
      onValueChange(newSelected.map(e => e.id));
    } else {
      setSelectedEntities(entity);
      onValueChange(entity.id);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const handleClearSelection = () => {
    setSelectedEntities(multiple ? [] : null);
    onValueChange(multiple ? [] : "");
  };

  const handleOpenModal = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const defaultRenderEntity = (entity, isSelected) => (
    <div
      key={entity.id}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
        isSelected
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
          : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
      }`}
      onClick={() => handleSelectEntity(entity)}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {entity.title || entity.name || entity.id}
        </div>
        {entity.description && (
          <div className="text-sm text-gray-500 truncate">{entity.description}</div>
        )}
      </div>
      {isSelected && multiple && (
        <Badge className="bg-blue-100 text-blue-800">נבחר</Badge>
      )}
    </div>
  );

  const defaultRenderSelected = (entities) => {
    if (multiple) {
      return (
        <div className="space-y-2">
          {entities.map(entity => (
            <div key={entity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
              <span className="font-medium">{entity.title || entity.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectEntity(entity)}
                title="הסר מהרשימה"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {entities.title || entities.name}
              </div>
              {entities.description && (
                <div className="text-sm text-gray-500">{entities.description}</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenModal}
                disabled={disabled}
                title="החלף בחירה"
              >
                <IconComponent className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={disabled}
                title="בטל בחירה"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }
  };

  const hasSelection = multiple ? selectedEntities.length > 0 : selectedEntities;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Selected Entity Display */}
      {hasSelection ? (
        renderSelected ? renderSelected(selectedEntities) : defaultRenderSelected(selectedEntities)
      ) : (
        <Button
          variant="outline"
          onClick={handleOpenModal}
          disabled={disabled}
          className="w-full justify-start text-gray-500 hover:text-gray-700"
        >
          <IconComponent className="w-4 h-4 ml-2" />
          {placeholder}
        </Button>
      )}

      {/* Entity Selection Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Entities List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LudoraLoadingSpinner size="sm" />
                  <span className="mr-2 text-gray-500">טוען...</span>
                </div>
              ) : filteredEntities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'לא נמצאו פריטים התואמים לחיפוש' : emptyMessage}
                </div>
              ) : (
                filteredEntities.map(entity => {
                  const isSelected = multiple
                    ? selectedEntities.some(e => e.id === entity.id)
                    : selectedEntities?.id === entity.id;

                  return renderEntity ?
                    renderEntity(entity, isSelected, handleSelectEntity) :
                    defaultRenderEntity(entity, isSelected);
                })
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              {multiple && (
                <Button variant="outline" onClick={handleClearSelection} disabled={!hasSelection}>
                  נקה הכל
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                {multiple ? 'סיום' : 'ביטול'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}