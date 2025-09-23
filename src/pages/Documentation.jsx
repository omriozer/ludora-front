import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function Documentation() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedContent, setSelectedContent] = useState('overview');

  const documentationStructure = {
    'overview': {
      title: 'סקירה כללית'
    },
    'getting-started': {
      title: 'התחלה מהירה',
      subsections: {
        'setup': {
          title: 'הגדרת סביבת פיתוח'
        },
        'troubleshooting': {
          title: 'פתרון בעיות'
        }
      }
    },
    'architecture': {
      title: 'ארכיטקטורה',
      subsections: {
        'overview': {
          title: 'סקירת המערכת'
        },
        'database': {
          title: 'מסד נתונים'
        }
      }
    },
    'backend': {
      title: 'פיתוח Backend',
      subsections: {
        'api': {
          title: 'מדריך API'
        },
        'patterns': {
          title: 'דפוסי קוד'
        }
      }
    },
    'frontend': {
      title: 'פיתוח Frontend',
      subsections: {
        'components': {
          title: 'רכיבי UI'
        },
        'state': {
          title: 'ניהול מצב'
        }
      }
    },
    'ai-guides': {
      title: 'מדריכי AI',
      subsections: {
        'context': {
          title: 'הקשר הפרויקט'
        },
        'todos': {
          title: 'זרימת Todo'
        }
      }
    }
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderSidebar = () => {
    return (
      <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="חפש בתיעוד..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="p-4">
          <nav className="space-y-2">
            <div>
              <button
                onClick={() => setSelectedContent('overview')}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedContent === 'overview'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                סקירה כללית
              </button>
            </div>

            {Object.entries(documentationStructure).map(([key, section]) => {
              if (key === 'overview') return null;

              const isExpanded = expandedSections[key];
              const hasSubsections = section.subsections;

              return (
                <div key={key}>
                  <button
                    onClick={() => {
                      if (hasSubsections) {
                        toggleSection(key);
                      } else {
                        setSelectedContent(key);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedContent === key && !hasSubsections
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span>{section.title}</span>
                    {hasSubsections && (
                      <div className="mr-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </button>

                  {hasSubsections && isExpanded && (
                    <div className="mr-4 mt-1 space-y-1">
                      {Object.entries(section.subsections).map(([subKey, subsection]) => (
                        <button
                          key={subKey}
                          onClick={() => setSelectedContent(`${key}.${subKey}`)}
                          className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedContent === `${key}.${subKey}`
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          {subsection.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    );
  };

  const getCurrentContent = () => {
    if (selectedContent === 'overview') {
      return documentationStructure.overview;
    }

    const [section, subsection] = selectedContent.split('.');
    if (subsection) {
      return documentationStructure[section]?.subsections?.[subsection];
    }

    return documentationStructure[section];
  };

  const currentContent = getCurrentContent();

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            חזור
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">תיעוד טכני - פלטפורמת לודורא</h1>
            <p className="text-gray-600 text-sm">
              תיעוד מלא למפתחים ומנהלי מערכת
            </p>
          </div>
          <Button variant="outline" onClick={() => window.open('https://github.com', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            GitHub
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        {renderSidebar()}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl">
            {currentContent ? (
              <div className="prose prose-lg max-w-none">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                  <div className="markdown-content">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                        {currentContent.title}
                      </h1>
                      <p className="text-gray-600">תוכן זה בפיתוח...</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">בחר נושא מהרשימה</h3>
                <p className="text-gray-600">השתמש בתפריט הצד כדי לנווט בתיעוד</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}