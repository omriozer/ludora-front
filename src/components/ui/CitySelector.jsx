import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MapPin, X } from "lucide-react";
import { getCachedIsraeliCities } from "@/services/publicApis";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";

export default function CitySelector({
  value,
  onValueChange,
  placeholder = "בחר עיר",
  disabled = false,
  cities = null // Optional: pre-loaded cities list
}) {
  const [citiesList, setCitiesList] = useState(cities || []);
  const [filteredCities, setFilteredCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filterCities = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredCities(citiesList);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = citiesList.filter(city =>
      city.toLowerCase().includes(searchLower)
    );

    setFilteredCities(filtered);
  }, [citiesList, searchTerm]);

  const loadCities = async () => {
    if (cities && cities.length > 0) {
      // Use provided cities list
      setCitiesList(cities);
      return;
    }

    setIsLoading(true);
    try {
      const loadedCities = await getCachedIsraeliCities();
      setCitiesList(loadedCities);
    } catch (error) {
      console.error('CitySelector: Error loading cities:', error);
      setCitiesList([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (value && citiesList.length > 0) {
      const city = citiesList.find(c => c === value);
      setSelectedCity(city || value);
    } else {
      setSelectedCity(value || "");
    }
  }, [value, citiesList]);

  useEffect(() => {
    if (isOpen && citiesList.length === 0) {
      loadCities();
    }
  }, [isOpen, citiesList.length]);

  useEffect(() => {
    filterCities();
  }, [filterCities]);

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    onValueChange(city);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    setSelectedCity("");
    onValueChange("");
  };

  const handleOpenModal = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected City Display */}
      {selectedCity ? (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{selectedCity}</div>
                <div className="text-sm text-gray-500">עיר נבחרת</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenModal}
                disabled={disabled}
                title="החלף עיר"
              >
                <Search className="w-4 h-4" />
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
      ) : (
        <Button
          variant="outline"
          onClick={handleOpenModal}
          disabled={disabled}
          className="w-full justify-start text-gray-500 hover:text-gray-700"
        >
          <MapPin className="w-4 h-4 ml-2" />
          {placeholder}
        </Button>
      )}

      {/* City Selection Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>בחר עיר</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חפש עיר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Cities List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LudoraLoadingSpinner />
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'לא נמצאו עיירות התואמות לחיפוש' : 'לא נמצאו עיירות'}
                </div>
              ) : (
                filteredCities.map(city => (
                  <div
                    key={city}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                    onClick={() => handleSelectCity(city)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {city}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}