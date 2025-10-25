
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { School, User } from "@/services/apiClient";
import { UploadFile, ExtractDataFromUploadedFile } from "@/services/integrations";
import { getCachedIsraeliCities } from "@/services/publicApis";
import {
  School as SchoolIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Building,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import SchoolModal from "../components/schools/SchoolModal";

export default function SchoolManagement() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 8000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      // Check if user is admin
      const user = await User.me();
      if (user.role !== 'admin') {
        navigate('/');
        return;
      }
      setCurrentUser(user);

      // Load schools and cities in parallel
      const [schoolsData] = await Promise.all([
        School.list("name"),
        getCachedIsraeliCities() // Pre-load cities for better UX
      ]);

      setSchools(schoolsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, [showMessage]);

  const filterSchools = useCallback(() => {
    let filtered = schools;
    
    if (searchTerm) {
      filtered = filtered.filter(school =>
        school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.institution_symbol?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSchools(filtered);
  }, [schools, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    filterSchools();
  }, [schools, searchTerm, filterSchools]);

  const handleSaveSchool = async (schoolData) => {
    try {
      if (editingSchool) {
        await School.update(editingSchool.id, schoolData);
        showMessage('success', 'מוסד החינוך עודכן בהצלחה');
      } else {
        await School.create(schoolData);
        showMessage('success', 'מוסד החינוך נוסף בהצלחה');
      }
      
      setShowAddForm(false);
      setEditingSchool(null);
      loadData();
    } catch (error) {
      console.error('Error saving school:', error);
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        if (error.message?.includes('institution_symbol')) {
          showMessage('error', 'סמל המוסד כבר קיים במערכת');
        } else {
          showMessage('error', 'מוסד חינוך עם אותו שם, עיר וכתובת כבר קיים במערכת');
        }
      } else {
        showMessage('error', 'שגיאה בשמירת מוסד החינוך');
      }
    }
  };

  const handleEdit = (school) => {
    setEditingSchool(school);
    setShowAddForm(true);
  };

  const handleDelete = async (school) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את מוסד החינוך "${school.name}"?`)) {
      return;
    }

    try {
      await School.delete(school.id);
      showMessage('success', 'מוסד החינוך נמחק בהצלחה');
      loadData();
    } catch (error) {
      console.error('Error deleting school:', error);
      showMessage('error', 'שגיאה במחיקת מוסד החינוך');
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingSchool(null);
  };

  const getEducationLevelText = (level) => {
    const levelMap = {
      'elementary': 'יסודי',
      'middle_school': 'חטיבה',
      'high_school': 'על יסודי', 
      'academic': 'אקדמאי'
    };
    return levelMap[level] || level;
  };

  // Export schools to Excel (CSV format) - works even with empty database
  const handleExportSchools = () => {
    const csvHeaders = [
      'שם מוסד החינוך',
      'עיר', 
      'כתובת',
      'סמל מוסד',
      'אימייל',
      'טלפון',
      'שלבי חינוך',
      'מחוז'
    ];

    let csvData = [];
    let filename = '';

    if (schools.length === 0) {
      // Create empty template for empty database
      csvData = []; // Empty data, only headers will be included
      filename = `תבנית_מוסדות_חינוך_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Export existing schools data
      csvData = schools.map(school => [
        school.name || '',
        school.city || '',
        school.address || '',
        school.institution_symbol || '',
        school.email || '',
        school.phone || '',
        school.education_levels ? school.education_levels.map(getEducationLevelText).join(', ') : '',
        school.district || ''
      ]);
      filename = `מוסדות_חינוך_${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the URL object

    if (schools.length === 0) {
      showMessage('success', 'תבנית קובץ ריק הורדה בהצלחה - ניתן למלא אותה ולייבא חזרה למערכת');
    } else {
      showMessage('success', `${schools.length} מוסדות חינוך יוצאו בהצלחה`);
    }
  };

  // Import schools from Excel/CSV file
  const handleImportSchools = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input
    event.target.value = '';

    if (!file.name.toLowerCase().match(/\.(csv|xlsx|xls)$/)) {
      showMessage('error', 'יש להעלות קובץ CSV או Excel בלבד');
      return;
    }

    setIsImporting(true);
    try {
      // Upload file first
      const { file_url } = await UploadFile({ file });
      
      // Define expected schema for extraction
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            "שם מוסד החינוך": { type: "string", fieldName: "name" },
            "עיר": { type: "string", fieldName: "city" },
            "כתובת": { type: "string", fieldName: "address" },
            "סמל מוסד": { type: "string", fieldName: "institution_symbol" },
            "אימייל": { type: "string", fieldName: "email" },
            "טלפון": { type: "string", fieldName: "phone" },
            "שלבי חינוך": { type: "string", fieldName: "education_levels" },
            "מחוז": { type: "string", fieldName: "district" }
          },
          required: ["שם מוסד החינוך", "עיר", "כתובת", "סמל מוסד"]
        }
      };

      // Extract data from file
      const extractResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      if (extractResult.status !== 'success') {
        showMessage('error', `שגיאה בעיבוד הקובץ: ${extractResult.details || 'פורמט לא תקין'}`);
        return;
      }

      const importData = extractResult.output;
      if (!Array.isArray(importData) || importData.length === 0) {
        showMessage('error', 'הקובץ ריק או לא מכיל נתונים תקינים');
        return;
      }

      // Process and validate each row
      let addedCount = 0;
      let skippedCount = 0;
      const skippedRows = [];
      const errors = [];

      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        const rowNumber = i + 2; // +2 because row 1 is headers and array is 0-indexed

        // Skip empty rows (where all essential fields are empty)
        if (!row.name?.trim() && !row.city?.trim() && !row.address?.trim() && !row.institution_symbol?.trim()) {
          continue;
        }

        // Validate required fields
        if (!row.name?.trim() || !row.city?.trim() || !row.address?.trim() || !row.institution_symbol?.trim()) {
          errors.push(`שורה ${rowNumber}: חסרים שדות חובה (שם, עיר, כתובת, סמל מוסד)`);
          continue;
        }

        // Parse education levels
        let educationLevels = [];
        if (row.education_levels) {
          const levelMapping = {
            'יסודי': 'elementary',
            'חטיבה': 'middle_school', 
            'חטיבת ביניים': 'middle_school',
            'על יסודי': 'high_school',
            'תיכון': 'high_school',
            'אקדמאי': 'academic'
          };

          const levels = String(row.education_levels).split(',').map(l => l.trim());
          educationLevels = levels.map(level => levelMapping[level] || null).filter(Boolean);
        }

        try {
          // Check if school already exists by institution_symbol
          const existingBySymbol = await School.filter({
            institution_symbol: row.institution_symbol.trim()
          });

          if (existingBySymbol.length > 0) {
            skippedCount++;
            skippedRows.push(`שורה ${rowNumber}: ${row.name} (סמל מוסד ${row.institution_symbol} כבר קיים)`);
            continue;
          }

          // Check for duplicate by name+city+address
          const existingByNameAddress = await School.filter({
            name: row.name.trim(),
            city: row.city.trim(), 
            address: row.address.trim()
          });

          if (existingByNameAddress.length > 0) {
            skippedCount++;
            skippedRows.push(`שורה ${rowNumber}: ${row.name} (מוסד עם אותו שם, עיר וכתובת כבר קיים)`);
            continue;
          }

          // Create new school
          const newSchoolData = {
            name: row.name.trim(),
            city: row.city.trim(),
            address: row.address.trim(),
            institution_symbol: row.institution_symbol.trim(),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            education_levels: educationLevels,
            district: row.district?.trim() || null
          };

          await School.create(newSchoolData);
          addedCount++;

        } catch (error) {
          errors.push(`שורה ${rowNumber}: שגיאה ביצירת ${row.name} - ${error.message}`);
        }
      }

      // Show results
      if (errors.length > 0) {
        showMessage('error', `שגיאות בעיבוד הקובץ: ${errors.join(', ')}`);
      } else if (addedCount === 0 && skippedCount > 0) {
        showMessage('error', `כל ${skippedCount} הרשומות שנקלטו בקובץ כבר קיימות במערכת.`);
      } else {
        let message = `הייבוא הושלם בהצלחה! נוספו ${addedCount} מוסדות חינוך`;
        if (skippedCount > 0) {
          message += `, דולגו ${skippedCount} רשומות קיימות`;
        }
        showMessage('success', message);
      }

      if (skippedRows.length > 0 && skippedRows.length <= 10) {
        setTimeout(() => {
          showMessage('info', `רשומות שדולגו: ${skippedRows.join(', ')}`);
        }, 2000);
      } else if (skippedRows.length > 10) {
        setTimeout(() => {
          showMessage('info', `דולגו ${skippedRows.length} רשומות קיימות. (דוגמה: ${skippedRows[0]}, ${skippedRows[1]}...)`);
        }, 2000);
      }

      // Reload data to show new schools
      if (addedCount > 0) {
        loadData();
      }

    } catch (error) {
      console.error('Error importing schools:', error);
      showMessage('error', `שגיאה בייבוא הקובץ: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען מוסדות חינוך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : message.type === 'info' ? 'default' : 'default'} className="mb-6">
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <SchoolIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ניהול מוסדות חינוך</h1>
                <p className="text-gray-600">נהל את רשימת מוסדות החינוך במערכת</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Export Button */}
              <Button 
                onClick={handleExportSchools}
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Download className="w-4 h-4 ml-2" />
                {schools.length === 0 ? 'הורד תבנית ריקה' : 'ייצא לאקסל'}
              </Button>

              {/* Import Button */}
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleImportSchools}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isImporting}
                  id="import-schools-file-input"
                />
                <Button 
                  asChild /* Render as a child of a slot */
                  variant="outline"
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  disabled={isImporting}
                >
                  <label htmlFor="import-schools-file-input" className="cursor-pointer flex items-center h-full px-4 py-2">
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        מייבא...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 ml-2" />
                        ייבא מאקסל
                      </>
                    )}
                  </label>
                </Button>
              </div>

              {/* Add Button */}
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף מוסד חינוך
              </Button>
            </div>
          </div>
          
          {/* Import/Export Instructions */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">הוראות ייבוא וייצוא:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>ייצוא:</strong> הורד את כל מוסדות החינוך בקובץ CSV.</li>
                  <li>• <strong>ייבוא:</strong> העלה קובץ CSV או Excel עם הכותרות הבאות (ניתן גם בעברית או באנגלית): "שם מוסד החינוך" / "name", "עיר" / "city", "כתובת" / "address", "סמל מוסד" / "institution_symbol" (חובה), "אימייל" / "email", "טלפון" / "phone", "שלבי חינוך" / "education_levels", "מחוז" / "district".</li>
                  <li>• שדות חובה: שם מוסד החינוך, עיר, כתובת, סמל מוסד.</li>
                  <li>• שלבי חינוך: יש להזין כטקסט מופרד בפסיקים. ערכים אפשריים: "יסודי", "חטיבה", "על יסודי", "אקדמאי".</li>
                  <li>• רשומות עם סמל מוסד קיים או שילוב שם+עיר+כתובת קיים יידלגו.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        <SchoolModal
          key={editingSchool?.id || 'new'}
          isOpen={showAddForm}
          onClose={handleCloseForm}
          school={editingSchool}
          onSave={handleSaveSchool}
          currentUser={currentUser}
        />

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="חפש מוסדות חינוך..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Schools List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>רשימת מוסדות חינוך ({filteredSchools.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSchools.length > 0 ? (
              <div className="space-y-4">
                {filteredSchools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Logo */}
                      <div className="flex-shrink-0">
                        {school.logo_url ? (
                          <img
                            src={school.logo_url}
                            alt={school.name}
                            className="w-12 h-12 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <SchoolIcon className="w-6 h-6 text-blue-600" />
                          </div>
                        )}
                      </div>

                      {/* School Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg">{school.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{school.city}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            <span>{school.address}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            סמל: {school.institution_symbol}
                          </Badge>
                          {school.district && (
                            <Badge variant="secondary" className="text-xs">
                              {school.district}
                            </Badge>
                          )}
                          {school.education_levels && school.education_levels.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {school.education_levels.map(level => (
                                <Badge key={level} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {getEducationLevelText(level)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {(school.email || school.phone) && (
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            {school.email && <span>📧 {school.email}</span>}
                            {school.phone && <span>📞 {school.phone}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(school)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(school)}
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
                <SchoolIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'לא נמצאו מוסדות חינוך' : 'אין מוסדות חינוך במערכת'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'נסה לחפש עם מילות מפתח אחרות' : 'התחל ביצירת מוסד החינוך הראשון'}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף מוסד חינוך ראשון
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
