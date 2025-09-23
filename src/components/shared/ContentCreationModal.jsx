import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Languages, Book, ImageIcon, HelpCircle, PenTool, List } from 'lucide-react';
import ImageUploadModal from '@/components/modals/ImageUploadModal';
import { Word, WordEN, QA, Attribute, ContentList } from '@/services/entities';

const contentTypes = [
  { key: 'Word', label: 'מילה בעברית', icon: Languages, description: 'מילים מנוקדות וללא ניקוד בעברית' },
  { key: 'WordEN', label: 'מילה באנגלית', icon: Book, description: 'מילים באנגלית' },
  { key: 'Image', label: 'תמונה', icon: ImageIcon, description: 'תמונות, אימוג׳ים וקבצי מדיה' },
  { key: 'QA', label: 'שאלה ותשובה', icon: HelpCircle, description: 'שאלות ותשובות למשחקים' },
  { key: 'Attribute', label: 'תכונה', icon: PenTool, description: 'תכונות וערכים כמו מגדר, מספר, סוג פעולה' },
  { key: 'ContentList', label: 'רשימות תוכן', icon: List, description: 'רשימות וקבוצות של תכנים' }
];

function EntityForm({ entityType, onSave, onCancel, showMessage, errors, setErrors, currentUser }) {
  const [formData, setFormData] = useState(() => {
    switch (entityType) {
      case 'Word':
        return {
          vocalized: '',
          word: '',
          root: '',
          context: '',
          difficulty: 0
        };
      case 'WordEN':
        return {
          word: '',
          difficulty: 0
        };
      case 'QA':
        return {
          question: '',
          answer: '',
          difficulty: 0
        };
      case 'Attribute':
        return {
          type: '',
          value: ''
        };
      case 'ContentList':
        return {
          name: '',
          description: ''
        };
      default:
        return {};
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving entity:', error);
      showMessage('error', 'שגיאה בשמירת הנתונים');
      throw error;
    }
  };

  const renderFields = () => {
    const currentData = formData;

    switch (entityType) {
      case 'Word':
        return (
          <>
            <div>
              <Label htmlFor="vocalized">מילה מנוקדת *</Label>
              <Input
                id="vocalized"
                value={currentData.vocalized}
                onChange={(e) => setFormData({...currentData, vocalized: e.target.value})}
                required
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="word">מילה ללא ניקוד *</Label>
              <Input
                id="word"
                value={currentData.word}
                onChange={(e) => setFormData({...currentData, word: e.target.value})}
                required
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="root">שורש</Label>
              <Input
                id="root"
                value={currentData.root}
                onChange={(e) => setFormData({...currentData, root: e.target.value})}
                placeholder="ד.ג.מ"
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="context">הקשר *</Label>
              <Input
                id="context"
                value={currentData.context}
                onChange={(e) => setFormData({...currentData, context: e.target.value})}
                placeholder="המילה הזו היא דוגמה טובה"
                required
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="difficulty">רמת קושי (0-10)</Label>
              <Input
                id="difficulty"
                type="number"
                min="0"
                max="10"
                value={currentData.difficulty}
                onChange={(e) => setFormData({...currentData, difficulty: parseInt(e.target.value) || 0})}
                className="text-right"
              />
            </div>
          </>
        );

      case 'WordEN':
        return (
          <>
            <div>
              <Label htmlFor="word">Word *</Label>
              <Input
                id="word"
                value={currentData.word}
                onChange={(e) => setFormData({...currentData, word: e.target.value})}
                required
                placeholder="example"
                className="text-left"
              />
            </div>
            <div>
              <Label htmlFor="difficulty">רמת קושי (0-10)</Label>
              <Input
                id="difficulty"
                type="number"
                min="0"
                max="10"
                value={currentData.difficulty}
                onChange={(e) => setFormData({...currentData, difficulty: parseInt(e.target.value) || 0})}
                className="text-right"
              />
            </div>
          </>
        );

      case 'QA':
        return (
          <>
            <div>
              <Label htmlFor="question">שאלה *</Label>
              <Textarea
                id="question"
                value={currentData.question}
                onChange={(e) => setFormData({...currentData, question: e.target.value})}
                required
                className="text-right min-h-[80px]"
                placeholder="מה השם של..."
              />
            </div>
            <div>
              <Label htmlFor="answer">תשובה *</Label>
              <Input
                id="answer"
                value={currentData.answer}
                onChange={(e) => setFormData({...currentData, answer: e.target.value})}
                required
                className="text-right"
                placeholder="התשובה הנכונה"
              />
            </div>
            <div>
              <Label htmlFor="difficulty">רמת קושי (0-10)</Label>
              <Input
                id="difficulty"
                type="number"
                min="0"
                max="10"
                value={currentData.difficulty}
                onChange={(e) => setFormData({...currentData, difficulty: parseInt(e.target.value) || 0})}
                className="text-right"
              />
            </div>
          </>
        );

      case 'Attribute':
        return (
          <>
            <div>
              <Label htmlFor="type">סוג תכונה *</Label>
              <Input
                id="type"
                value={currentData.type}
                onChange={(e) => setFormData({...currentData, type: e.target.value})}
                required
                className="text-right"
                placeholder="מגדר, זמן, מספר..."
              />
            </div>
            <div>
              <Label htmlFor="value">ערך התכונה *</Label>
              <Input
                id="value"
                value={currentData.value}
                onChange={(e) => setFormData({...currentData, value: e.target.value})}
                required
                className="text-right"
                placeholder="זכר, נקבה, עבר, הווה..."
              />
            </div>
          </>
        );

      case 'ContentList':
        return (
          <>
            <div>
              <Label htmlFor="name">שם הרשימה *</Label>
              <Input
                id="name"
                value={currentData.name}
                onChange={(e) => setFormData({...currentData, name: e.target.value})}
                required
                className="text-right"
                placeholder="שם הרשימה"
              />
            </div>
            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={currentData.description}
                onChange={(e) => setFormData({...currentData, description: e.target.value})}
                className="text-right min-h-[80px]"
                placeholder="תיאור הרשימה"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {renderFields()}

      {errors && errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          {errors.map((error, index) => (
            <p key={index} className="text-red-600 text-sm">{error}</p>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
          שמור
        </Button>
      </div>
    </form>
  );
}

export default function ContentCreationModal({
  isOpen,
  onClose,
  onContentCreated,
  showMessage,
  currentUser
}) {
  const [step, setStep] = useState('type-selection'); // 'type-selection' or 'form'
  const [selectedType, setSelectedType] = useState(null);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleContentTypeSelect = (entityType) => {
    setSelectedType(entityType);
    setErrors([]);

    if (entityType === 'Image') {
      setShowImageUploadModal(true);
    } else {
      setStep('form');
    }
  };

  const handleSave = async (formData) => {
    try {
      let savedEntity;

      switch (selectedType) {
        case 'Word':
          savedEntity = await Word.create({
            ...formData,
            created_by: currentUser?.id
          });
          break;
        case 'WordEN':
          savedEntity = await WordEN.create({
            ...formData,
            created_by: currentUser?.id
          });
          break;
        case 'QA':
          savedEntity = await QA.create({
            ...formData,
            created_by: currentUser?.id
          });
          break;
        case 'Attribute':
          savedEntity = await Attribute.create({
            ...formData,
            created_by: currentUser?.id
          });
          break;
        case 'ContentList':
          savedEntity = await ContentList.create({
            ...formData,
            created_by: currentUser?.id
          });
          break;
        default:
          throw new Error('Unknown entity type');
      }

      showMessage('success', 'התוכן נוצר בהצלחה');

      // Call the callback with the created content
      if (onContentCreated) {
        onContentCreated(savedEntity, selectedType);
      }

      handleClose();
    } catch (error) {
      console.error('Error creating content:', error);
      setErrors([error.message || 'שגיאה ביצירת התוכן']);
      throw error;
    }
  };

  const handleClose = () => {
    setStep('type-selection');
    setSelectedType(null);
    setErrors([]);
    onClose();
  };

  const handleImageSaved = (imageEntity) => {
    showMessage('success', 'התמונה נשמרה בהצלחה');

    if (onContentCreated) {
      onContentCreated(imageEntity, 'Image');
    }

    setShowImageUploadModal(false);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
          {step === 'type-selection' ? (
            <>
              <div className="p-4 md:p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-base md:text-lg font-semibold">
                    בחר סוג תוכן להוספה
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-white hover:bg-white/20 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {contentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.key}
                        onClick={() => handleContentTypeSelect(type.key)}
                        className="p-3 md:p-4 border border-purple-100 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 cursor-pointer transition-all duration-200 hover:border-purple-300 hover:shadow-lg transform hover:scale-105"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">
                              {type.label}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-500 line-clamp-2">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 md:p-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-base md:text-lg font-semibold">
                    יצירת {
                      selectedType === 'Word' ? 'מילה בעברית' :
                      selectedType === 'WordEN' ? 'מילה באנגלית' :
                      selectedType === 'QA' ? 'שאלה ותשובה' :
                      selectedType === 'Attribute' ? 'תכונה' :
                      selectedType === 'ContentList' ? 'רשימת תוכן' : selectedType
                    }
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStep('type-selection')}
                      className="text-white hover:bg-white/20 flex-shrink-0"
                    >
                      ←
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="text-white hover:bg-white/20 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto flex-1">
                <EntityForm
                  entityType={selectedType}
                  onSave={handleSave}
                  onCancel={handleClose}
                  showMessage={showMessage}
                  errors={errors}
                  setErrors={setErrors}
                  currentUser={currentUser}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ImageUploadModal
        isOpen={showImageUploadModal}
        onClose={() => {
          setShowImageUploadModal(false);
          handleClose();
        }}
        onSave={handleImageSaved}
      />
    </>
  );
}